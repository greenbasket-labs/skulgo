"use client";

import { useEffect, useMemo, useState } from "react";
import { cacheRecord, queueAction, queuedCount, readCachedRecord } from "@/lib/offline-queue";

type Student = {
  id: string;
  admissionId: string;
  firstName: string;
  lastName: string;
  classId?: string | null;
};

type Assignment = {
  id: string;
  class: { id: string; name: string; arm?: string | null; section: { name: string } };
  subject: { id: string; name: string };
};

type Data = {
  teacher: { teacherCode: string };
  assignments: Assignment[];
};

type Score = { ca: string; exam: string };
type ScoreMap = Record<string, Score>;

export default function ScoresPage() {
  const [data, setData] = useState<Data | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [term, setTerm] = useState("First Term");
  const [scores, setScores] = useState<ScoreMap>({});
  const [schoolId, setSchoolId] = useState("");
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState("Loading...");
  const [scopeKey, setScopeKey] = useState("");

  const assignment = useMemo(
    () => data?.assignments.find(item => item.id === selectedAssignmentId) ?? data?.assignments[0] ?? null,
    [data, selectedAssignmentId]
  );

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
      const assignmentResponse = await fetch("/api/schools/current/my-assignments");
      const next = await assignmentResponse.json().catch(() => ({}));
      if (assignmentResponse.ok) {
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

    const currentSchoolId = me?.user?.membership?.schoolId ?? "";
    setSchoolId(currentSchoolId);

    if (!selectedAssignmentId && body.assignments?.length) {
      setSelectedAssignmentId(body.assignments[0].id);
    }

    setMessage("");

    if (currentSchoolId && body.assignments?.length) {
      await loadStudents(currentSchoolId, body.assignments[0].class.id);
    }
  }

  async function loadStudents(currentSchoolId = schoolId, classId = assignment?.class.id ?? "") {
    if (!currentSchoolId || !classId) return;

    const key = `skulgo-scores-students-${currentSchoolId}-${classId}`;
    try {
      const response = await fetch(`/api/schools/${currentSchoolId}/students`);
      if (response.ok) {
        const body = await response.json();
        const filtered = body.filter((item: Student) => !item.classId || item.classId === classId);
        setStudents(filtered);
        cacheRecord(key, filtered);
        return;
      }
    } catch {
      // Fall through to local cache.
    }

    setStudents(readCachedRecord<Student[]>(key) ?? []);
  }

  function setScore(studentId: string, field: keyof Score, value: string) {
    const next = {
      ...scores,
      [studentId]: {
        ca: scores[studentId]?.ca ?? "",
        exam: scores[studentId]?.exam ?? "",
        [field]: value,
      },
    };
    setScores(next);
    if (schoolId && assignment) {
      cacheRecord(`skulgo:${scopeKey}:scores-${schoolId}-${assignment.id}-${term}`, next);
    }
  }

  async function save(student: Student) {
    if (!schoolId || !assignment) return;

    const score = scores[student.id] ?? { ca: "", exam: "" };
    const ca = Number(score.ca);
    const exam = Number(score.exam);

    if (!Number.isFinite(ca) || !Number.isFinite(exam) || ca < 0 || ca > 30 || exam < 0 || exam > 70) {
      setMessage("Enter CA 0-30 and exam 0-70.");
      return;
    }

    const body = {
      studentId: student.id,
      classId: assignment.class.id,
      subjectId: assignment.subject.id,
      term,
      ca,
      exam,
    };

    if (!navigator.onLine) {
      queueAction({
        scopeKey,
        url: `/api/schools/${schoolId}/assessments`,
        method: "POST",
        body,
      });
      setPending(queuedCount(scopeKey));
      setMessage("Saved on this device. It will sync automatically when internet returns.");
      return;
    }

    try {
      const response = await fetch(`/api/schools/${schoolId}/assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setMessage("Score saved.");
        return;
      }

      const result = await response.json().catch(() => ({}));
      setMessage(result.error || "Score could not be saved.");
      return;
    } catch {
      queueAction({
        scopeKey,
        url: `/api/schools/${schoolId}/assessments`,
        method: "POST",
        body,
      });
      setPending(queuedCount(scopeKey));
      setMessage("Connection dropped. Saved on this device and queued for sync.");
    }
  }

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(queuedCount(scopeKey));
    void load();

    const onOnline = () => {
      setOnline(true);
      setPending(queuedCount(scopeKey));
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
    if (!schoolId || !assignment) return;
    void loadStudents(schoolId, assignment.class.id);

    const key = `skulgo:${scopeKey}:scores-${schoolId}-${assignment.id}-${term}`;
    setScores(readCachedRecord<ScoreMap>(key) ?? {});
  }, [schoolId, assignment?.id, term]);

  if (!data) {
    return <main className="workspace-main"><p className="muted">{message}</p></main>;
  }

  if (!assignment) {
    return (
      <main className="workspace-main">
        <div className="card">
          <strong>No teaching assignment yet.</strong>
          <p className="muted">Scores will appear here after Admin assigns a class and subject.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">Teacher workspace · {online ? "Online" : "Offline"}</p>
        <h1>Scores</h1>
        <p className="muted">{assignment.subject.name} · {assignment.class.section.name} · {assignment.class.name}{assignment.class.arm ? ` · ${assignment.class.arm}` : ""}</p>
        <p className="muted">{pending ? `${pending} item(s) waiting to sync` : "Saved records sync automatically."}</p>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="grid grid-2">
          <label className="grid">
            <span>Teaching assignment</span>
            <select value={selectedAssignmentId} onChange={event => setSelectedAssignmentId(event.target.value)}>
              {data.assignments.map(item => (
                <option key={item.id} value={item.id}>
                  {item.subject.name} · {item.class.section.name} · {item.class.name}{item.class.arm ? ` · ${item.class.arm}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="grid">
            <span>Term</span>
            <select value={term} onChange={event => setTerm(event.target.value)}>
              <option>First Term</option>
              <option>Second Term</option>
              <option>Third Term</option>
            </select>
          </label>
        </div>
      </div>

      {!students.length ? (
        <div className="card">
          <strong>No students available.</strong>
          <p className="muted">Students in your assigned class will appear here.</p>
        </div>
      ) : (
        <div className="grid">
          {students.map(student => {
            const score = scores[student.id] ?? { ca: "", exam: "" };
            return (
              <div className="card" key={student.id}>
                <strong>{student.firstName} {student.lastName}</strong>
                <p className="muted">{student.admissionId}</p>
                <div className="grid grid-2">
                  <label className="grid">
                    <span>CA / 30</span>
                    <input inputMode="decimal" value={score.ca} onChange={event => setScore(student.id, "ca", event.target.value)} />
                  </label>
                  <label className="grid">
                    <span>Exam / 70</span>
                    <input inputMode="decimal" value={score.exam} onChange={event => setScore(student.id, "exam", event.target.value)} />
                  </label>
                </div>
                <button className="button" onClick={() => void save(student)}>Save score</button>
              </div>
            );
          })}
        </div>
      )}

      {message && <p>{message}</p>}
    </main>
  );
}
