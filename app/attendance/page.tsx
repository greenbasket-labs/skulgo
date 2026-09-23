"use client";

import { useEffect, useMemo, useState } from "react";
import { cacheRecord, queueAction, queuedCount, readCachedRecord } from "@/lib/offline-queue";

type Student = {
  id: string;
  admissionId: string;
  firstName: string;
  lastName: string;
};

type Assignment = {
  id: string;
  class: {
    id: string;
    name: string;
    arm?: string | null;
    section: { name: string };
  };
  subject: { id: string; name: string };
};

type Data = {
  teacher: { teacherCode: string };
  assignments: Assignment[];
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
  const [scopeKey, setScopeKey] = useState("");
  const date = useMemo(() => today(), []);

  const assignments = data?.assignments ?? [];

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
    if (!currentScopeKey) { setMessage("This school workspace is not available on this device yet."); return; }
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

    if (!body) {
      body = readCachedRecord<Data>(assignmentsKey);
    }

    if (!body) {
      setMessage("Teacher assignments are not available on this device yet.");
      return;
    }

    setData(body);

    setSchoolId(me?.user?.membership?.schoolId ?? "");

    if (!selectedClassId && body.assignments?.length) {
      setSelectedClassId(body.assignments[0].class.id);
    }
    setMessage("");
  }

  async function loadStudents(classId: string) {
    if (!classId) {
      setStudents([]);
      return;
    }

    if (!schoolId) return;

    const key = `skulgo-attendance-students-${schoolId}-${classId}`;
    try {
      const response = await fetch(`/api/schools/${schoolId}/students`);

      if (response.ok) {
        const body = await response.json();
        const filtered = body.filter((item: Student & { classId?: string }) => !item.classId || item.classId === classId);
        setStudents(filtered);
        cacheRecord(key, filtered);
        return;
      }
    } catch {
      // Use the last successful student snapshot below.
    }

    setStudents(readCachedRecord<Student[]>(key) ?? []);
  }

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(queuedCount(scopeKey));
    void load();

    const onOnline = () => {
      setOnline(true);
      setPending(queuedCount(scopeKey));
      void loadStudents(selectedClassId);
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
    if (data && selectedClassId) void loadStudents(selectedClassId);
  }, [data, selectedClassId]);

  useEffect(() => {
    const loadToday = async () => {
      if (!data?.assignments.length || !selectedClassId) return;

      if (!schoolId) return;

      const key = `skulgo-attendance-${schoolId}-${selectedClassId}-${date}`;
      try {
        const response = await fetch(
          `/api/schools/${schoolId}/attendance?classId=${selectedClassId}&date=${date}`
        );
        if (response.ok) {
          const records = await response.json();
          const next: Mark = {};
          for (const item of records) next[item.studentId] = item.present;
          setMarks(next);
          cacheRecord(key, next);
          return;
        }
      } catch {
        // Use the last successful attendance snapshot below.
      }

      setMarks(readCachedRecord<Mark>(key) ?? {});
    };
    void loadToday();
  }, [data, selectedClassId, date]);

  async function save(student: Student, present: boolean) {
    if (!schoolId || !selectedClassId) return;

    const nextMarks = { ...marks, [student.id]: present };
    setMarks(nextMarks);
    cacheRecord(`skulgo-attendance-${schoolId}-${selectedClassId}-${date}`, nextMarks);

    const body = {
      studentId: student.id,
      classId: selectedClassId,
      session: "morning",
      date,
      present,
    };

    if (!navigator.onLine) {
      queueAction({
        scopeKey,
        url: `/api/schools/${schoolId}/attendance`,
        method: "POST",
        body,
      });
      setPending(queuedCount());
      setMessage("Saved on this device. It will sync automatically when internet returns.");
      return;
    }

    try {
      const response = await fetch(`/api/schools/${schoolId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setMessage("Attendance saved.");
        return;
      }
    } catch {
      // Fall through to local queue when the connection drops during a write.
    }

    queueAction({
      scopeKey: `${me?.user?.id ?? ""}:${me?.user?.membership?.id ?? ""}`,
      url: `/api/schools/${schoolId}/attendance`,
      method: "POST",
      body,
    });
    setPending(queuedCount());
    setMessage("Connection dropped. Saved on this device and queued for sync.");
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
          {pending ? `${pending} item(s) waiting to sync` : "Saved records sync automatically."}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <label className="grid">
          <span>Class</span>
          <select
            value={selectedClassId}
            onChange={event => setSelectedClassId(event.target.value)}
          >
            {assignments.map(item => (
              <option key={item.id} value={item.class.id}>
                {item.class.section.name} · {item.class.name}{item.class.arm ? ` · ${item.class.arm}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!students.length ? (
        <div className="card">
          <strong>No students available.</strong>
          <p className="muted">Students in your assigned class will appear here.</p>
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
                  <button
                    className="button"
                    aria-pressed={present === true}
                    onClick={() => void save(student, true)}
                  >
                    Present
                  </button>
                  <button
                    className="button"
                    aria-pressed={present === false}
                    onClick={() => void save(student, false)}
                  >
                    Absent
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {message && <p>{message}</p>}
    </main>
  );
}
