"use client";

import { useEffect, useMemo, useState } from "react";
import { cacheRecord, queueAction, queuedCount, readCachedRecord, startOfflineSync } from "@/lib/offline-queue";

type Student = {
  id: string;
  admissionId: string;
  firstName: string;
  lastName: string;
  classId?: string | null;
};

type ClassTeacherAssignment = {
  id: string;
  class: {
    id: string;
    name: string;
    arm?: string | null;
    section: { name: string };
  };
};

type AttendanceSession = {
  id: string;
  status: "DRAFT" | "SUBMITTED";
  startedAt: string;
  deadlineAt: string;
  submittedAt?: string | null;
};

type Data = {
  teacher: { teacherCode: string };
  assignments: unknown[];
  classTeacherAssignments: ClassTeacherAssignment[];
};

type Mark = Record<string, boolean>;

function today() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const [data, setData] = useState<Data | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [marks, setMarks] = useState<Mark>({});
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState("Loading...");
  const [schoolId, setSchoolId] = useState("");
  const [role, setRole] = useState<"TEACHER" | "STUDENT" | "PARENT" | "ADMIN" | "CASHIER" | "">("");
  const [parentHistory, setParentHistory] = useState<any[]>([]);
  const [studentHistory, setStudentHistory] = useState<any[]>([]);
  const [scopeKey, setScopeKey] = useState("");
  const [attendanceSession, setAttendanceSession] = useState<AttendanceSession | null>(null);
  const [now, setNow] = useState(Date.now());
  const date = useMemo(() => today(), []);

  const classTeacherAssignments = data?.classTeacherAssignments ?? [];
  const submitted = attendanceSession?.status === "SUBMITTED";
  const deadlineMs = attendanceSession ? new Date(attendanceSession.deadlineAt).getTime() : 0;
  const remainingMs = attendanceSession ? Math.max(0, deadlineMs - now) : 0;
  const expired = Boolean(attendanceSession && remainingMs <= 0 && !submitted);
  const locked = submitted || expired;
  const markedCount = students.filter(student => marks[student.id] !== undefined).length;
  const presentCount = students.filter(student => marks[student.id] === true).length;
  const absentCount = students.filter(student => marks[student.id] === false).length;

  const timeLeft = attendanceSession
    ? `${Math.floor(remainingMs / 60000).toString().padStart(2, "0")}:${Math.floor((remainingMs % 60000) / 1000).toString().padStart(2, "0")}`
    : "01:00:00";

  async function load() {
    const meKey = "skulgo-current-me";
    let me: { user?: { id?: string; membership?: { id?: string; schoolId?: string } | null } } | null = null;
    try {
      const meResponse = await fetch("/api/auth/me");
      const next = await meResponse.json().catch(() => ({}));
      if (meResponse.ok) { me = next; cacheRecord(meKey, next); }
    } catch { me = readCachedRecord<typeof me>(meKey); }
    if (!me) me = readCachedRecord<typeof me>(meKey);

    const currentScopeKey = me?.user?.id && me?.user?.membership?.id ? `${me.user.id}:${me.user.membership.id}` : "";
    setScopeKey(currentScopeKey);
    setRole((me?.user as any)?.membership?.role ?? "");
    if (currentScopeKey) startOfflineSync(currentScopeKey, result => setPending(result.remaining));
    if (!currentScopeKey) { setMessage("This school workspace is not available on this device yet."); return; }

    const membershipRole = (me?.user as any)?.membership?.role;
    const currentSchoolId = me?.user?.membership?.schoolId ?? "";

    if (membershipRole === "STUDENT" || membershipRole === "PARENT") {
      const historyKey = `skulgo:${currentScopeKey}:${membershipRole.toLowerCase()}-attendance-${currentSchoolId}`;
      try {
        const response = await fetch(`/api/schools/${currentSchoolId}/attendance`);
        const result = await response.json().catch(() => ({ records: [] }));
        if (response.ok) {
          const records = Array.isArray(result.records) ? result.records : [];
          if (membershipRole === "STUDENT") setStudentHistory(records);
          else setParentHistory(records);
          cacheRecord(historyKey, records);
        }
      } catch {
        const cached = readCachedRecord<any[]>(historyKey) ?? [];
        if (membershipRole === "STUDENT") setStudentHistory(cached);
        else setParentHistory(cached);
      }
      setMessage("");
      return;
    }

    const assignmentsKey = `skulgo:${currentScopeKey}:my-assignments`;

    let body: Data | null = null;
    try {
      const response = await fetch("/api/schools/current/my-assignments");
      const next = await response.json().catch(() => ({}));
      if (response.ok) {
        body = next;
        cacheRecord(assignmentsKey, next);
      }
    } catch {
      body = readCachedRecord<Data>(assignmentsKey);
    }

    if (!body) body = readCachedRecord<Data>(assignmentsKey);
    if (!body) {
      setMessage("Teacher assignments are not available on this device yet.");
      return;
    }

    setData(body);
    setSchoolId(me?.user?.membership?.schoolId ?? "");

    if ((me?.user as any)?.membership?.role === "PARENT") {
      const historyKey = "skulgo:" + currentScopeKey + ":parent-attendance-" + (me?.user?.membership?.schoolId ?? "");
      try {
        const response = await fetch("/api/schools/" + me?.user?.membership?.schoolId + "/attendance");
        const body = await response.json().catch(() => ({ records: [] }));
        if (response.ok) {
          setParentHistory(Array.isArray(body.records) ? body.records : []);
          cacheRecord(historyKey, Array.isArray(body.records) ? body.records : []);
        }
      } catch {
        setParentHistory(readCachedRecord<any[]>(historyKey) ?? []);
      }
      return;
    }

    if (!selectedClassId && body.classTeacherAssignments?.length) {
      setSelectedClassId(body.classTeacherAssignments[0].class.id);
    }
    setMessage("");
  }

  async function loadStudents(classId: string) {
    if (!classId || !schoolId) {
      setStudents([]);
      return;
    }

    const key = `skulgo:${scopeKey}:attendance-students-${schoolId}-${classId}`;
    try {
      const response = await fetch(`/api/schools/${schoolId}/students`);
      if (response.ok) {
        const body = await response.json();
        const filtered = body.filter((item: Student) => item.classId === classId);
        setStudents(filtered);
        cacheRecord(key, filtered);
        return;
      }
    } catch {
      // Use the last successful student snapshot below.
    }

    setStudents(readCachedRecord<Student[]>(key) ?? []);
  }

  async function loadAttendance(classId: string) {
    if (!classId || !schoolId) return;
    const key = `skulgo:${scopeKey}:attendance-${schoolId}-${classId}-${date}`;

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/attendance?classId=${classId}&date=${date}`
      );
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        const next: Mark = {};
        for (const item of body.records ?? []) next[item.studentId] = item.present;
        setMarks(next);
        setAttendanceSession(body.session ?? null);
        cacheRecord(key, { marks: next, session: body.session ?? null });
        return;
      }
    } catch {
      // Use the last successful attendance snapshot below.
    }

    const cached = readCachedRecord<{ marks: Mark; session: AttendanceSession | null }>(key);
    setMarks(cached?.marks ?? {});
    setAttendanceSession(cached?.session ?? null);
  }

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(queuedCount(scopeKey));
    void load();

    const onOnline = () => {
      setOnline(true);
      setPending(queuedCount(scopeKey));
      void load();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [scopeKey]);

  useEffect(() => {
    if (!data || !selectedClassId) return;
    void loadStudents(selectedClassId);
    void loadAttendance(selectedClassId);
  }, [data, selectedClassId, schoolId, date]);

  useEffect(() => {
    if (!attendanceSession || submitted) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [attendanceSession, submitted]);

  useEffect(() => {
    if (expired && attendanceSession?.status === "DRAFT" && navigator.onLine) {
      void submitAttendance(true);
    }
  }, [expired, attendanceSession, online]);

  async function save(student: Student, present: boolean) {
    if (!schoolId || !selectedClassId || locked) return;

    const nextMarks = { ...marks, [student.id]: present };
    setMarks(nextMarks);
    cacheRecord(`skulgo:${scopeKey}:attendance-${schoolId}-${selectedClassId}-${date}`, {
      marks: nextMarks,
      session: attendanceSession,
    });

    const body = {
      studentId: student.id,
      classId: selectedClassId,
      session: "morning",
      date,
      present,
      action: "save",
    };

    if (!navigator.onLine) {
      queueAction({
        scopeKey,
        url: `/api/schools/${schoolId}/attendance`,
        method: "POST",
        body,
      });
      setPending(queuedCount(scopeKey));
      setMessage("Saved on this device. It will sync automatically when internet returns.");
      return;
    }

    try {
      const response = await fetch(`/api/schools/${schoolId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        setAttendanceSession(result.session ?? attendanceSession);
        setMessage("Attendance draft saved.");
        return;
      }
      if (response.status === 409) {
        setAttendanceSession(result.session ?? attendanceSession);
        setMessage(result.error ?? "Attendance is locked.");
        return;
      }
    } catch {
      // Fall through to local queue when the connection drops during a write.
    }

    queueAction({
      scopeKey,
      url: `/api/schools/${schoolId}/attendance`,
      method: "POST",
      body,
    });
    setPending(queuedCount(scopeKey));
    setMessage("Connection dropped. Saved on this device and queued for sync.");
  }

  async function markAll(present: boolean) {
    for (const student of students) {
      await save(student, present);
    }
  }

  async function submitAttendance(auto = false) {
    if (!schoolId || !selectedClassId || !attendanceSession || submitted) return;

    const body = {
      classId: selectedClassId,
      session: "morning",
      date,
      action: "submit",
    };

    if (!navigator.onLine) {
      queueAction({
        scopeKey,
        url: `/api/schools/${schoolId}/attendance`,
        method: "POST",
        body,
      });
      setPending(queuedCount(scopeKey));
      setMessage(auto ? "Time ended offline. Submission is queued for sync." : "Submission saved offline and queued for sync.");
      return;
    }

    try {
      const response = await fetch(`/api/schools/${schoolId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        setAttendanceSession(result.session ?? { ...attendanceSession, status: "SUBMITTED", submittedAt: new Date().toISOString() });
        setMessage(auto ? "The 1-hour window ended. Attendance is now submitted and locked." : "Attendance submitted and locked.");
        return;
      }
      setAttendanceSession(result.session ?? attendanceSession);
      setMessage(result.error ?? "Attendance could not be submitted.");
    } catch {
      queueAction({
        scopeKey,
        url: `/api/schools/${schoolId}/attendance`,
        method: "POST",
        body,
      });
      setPending(queuedCount(scopeKey));
      setMessage(auto ? "Time ended. Submission is queued until internet returns." : "Connection dropped. Submission is queued for sync.");
    }
  }

  if (role === "PARENT" || role === "STUDENT") {
    const history = role === "PARENT" ? parentHistory : studentHistory;
    return (
      <main className="workspace-main">
        <div className="workspace-header">
          <p className="muted">{role === "PARENT" ? "Parent" : "Student"} workspace · {online ? "Online" : "Offline"}</p>
          <h1>Attendance History</h1>
          <p className="muted">
            {role === "PARENT"
              ? "Attendance history for your approved child connection(s)."
              : "Your attendance history."}
          </p>
        </div>
        {!history.length ? (
          <div className="card">
            <strong>No attendance records yet.</strong>
            <p className="muted">Records will appear here after the school records them.</p>
          </div>
        ) : (
          <div className="grid">
            {history.map((item, index) => (
              <div className="card" key={item.id ?? (item.studentId + "-" + item.date + "-" + index)}>
                {role === "PARENT" && (
                  <>
                    <strong>{item.student?.firstName} {item.student?.lastName}</strong>
                    <p className="muted">{item.student?.admissionId}</p>
                  </>
                )}
                <p>{new Date(item.date).toLocaleDateString()} · {item.present ? "Present" : "Absent"}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    );
  }

  if (!data) {
    return <main className="workspace-main"><p className="muted">{message}</p></main>;
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">Teacher workspace · {online ? "Online" : "Offline"}</p>
        <h1>Attendance</h1>
        <p className="muted">
          {pending ? `${pending} item(s) waiting to sync` : "Drafts save automatically."}
        </p>
      </div>

      {!classTeacherAssignments.length ? (
        <div className="card">
          <strong>You are not assigned as class teacher.</strong>
          <p className="muted">Attendance is available only for your class-master class.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 18 }}>
            <label className="grid">
              <span>My class</span>
              <select
                value={selectedClassId}
                onChange={event => setSelectedClassId(event.target.value)}
              >
                {classTeacherAssignments.map(item => (
                  <option key={item.id} value={item.class.id}>
                    {item.class.section.name} · {item.class.name}{item.class.arm ? ` · ${item.class.arm}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-3" style={{ marginBottom: 18 }}>
            <div className="card"><p className="muted">Students</p><div className="stat">{students.length}</div></div>
            <div className="card"><p className="muted">Marked</p><div className="stat">{markedCount}</div></div>
            <div className="card"><p className="muted">Present / Absent</p><div className="stat">{presentCount} / {absentCount}</div></div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <div className="grid grid-2">
              <div>
                <p className="muted">Attendance window</p>
                <strong>{submitted ? "Submitted · Locked" : attendanceSession ? `${timeLeft} remaining` : "Starts when you save the first mark · 01:00:00"}</strong>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
                <button className="button" disabled={locked || !students.length} onClick={() => void markAll(true)}>Mark all Present</button>
                <button className="button" disabled={locked || !students.length} onClick={() => void submitAttendance(false)}>Submit Attendance</button>
              </div>
            </div>
          </div>

          {!students.length ? (
            <div className="card">
              <strong>No students available.</strong>
              <p className="muted">All students enrolled in your class will appear here.</p>
            </div>
          ) : (
            <div className="grid">
              {students.map(student => {
                const present = marks[student.id];
                return (
                  <div className="card" key={student.id}>
                    <strong>{student.firstName} {student.lastName}</strong>
                    <p className="muted">{student.admissionId}</p>
                    <div className="grid grid-2">
                      <button className="button" aria-pressed={present === true} disabled={locked} onClick={() => void save(student, true)}>Present</button>
                      <button className="button" aria-pressed={present === false} disabled={locked} onClick={() => void save(student, false)}>Absent</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {message && <p>{message}</p>}
        </>
      )}
    </main>
  );
}
