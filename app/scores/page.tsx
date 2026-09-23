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

type Assignment = {
  id: string;
  class: { id: string; name: string; arm?: string | null; section: { name: string } };
  subject: { id: string; name: string };
};

type Data = {
  teacher: { teacherCode: string };
  assignments: Assignment[];
};

type Score = {
  ca: string;
  exam: string;
  caSavedAt?: string | null;
  examSavedAt?: string | null;
};

type ScoreMap = Record<string, Score>;

type AssessmentRecord = {
  studentId: string;
  ca: number | null;
  exam: number | null;
  caSavedAt?: string | null;
  examSavedAt?: string | null;
};

const WINDOW_MS = 24 * 60 * 60 * 1000;

function remaining(savedAt?: string | null) {
  if (!savedAt) return null;
  return Math.max(0, new Date(savedAt).getTime() + WINDOW_MS - Date.now());
}

function formatRemaining(ms: number | null) {
  if (ms === null) return "";
  if (ms <= 0) return "Correction window expired";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m remaining for correction`;
}

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
  const [now, setNow] = useState(Date.now());

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
    if (!currentScopeKey) {
      setMessage("This school workspace is not available on this device yet.");
      return;
    }

    const assignmentsKey = `skulgo:${currentScopeKey}:my-assignments`;
    let body: Data | null = null;
    try {
      const response = await fetch("/api/schools/current/my-assignments");
      const next = await response.json().catch(() => ({}));
      if (response.ok) { body = next; cacheRecord(assignmentsKey, next); }
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
    if (!selectedAssignmentId && body.assignments?.length) setSelectedAssignmentId(body.assignments[0].id);
    setMessage("");
    if (currentSchoolId && body.assignments?.length) await loadStudents(currentSchoolId, body.assignments[0].class.id);
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
    } catch {}
    setStudents(readCachedRecord<Student[]>(key) ?? []);
  }

  async function loadAssessments(currentSchoolId = schoolId, currentAssignment = assignment) {
    if (!currentSchoolId || !currentAssignment) return;
    const key = `skulgo:${scopeKey}:assessments-${currentAssignment.id}-${term}`;
    try {
      const response = await fetch(
        `/api/schools/${currentSchoolId}/assessments?classId=${encodeURIComponent(currentAssignment.class.id)}&subjectId=${encodeURIComponent(currentAssignment.subject.id)}&term=${encodeURIComponent(term)}`
      );
      if (response.ok) {
        const body = await response.json() as AssessmentRecord[];
        const next: ScoreMap = {};
        for (const item of body) {
          next[item.studentId] = {
            ca: item.ca === null ? "" : String(item.ca),
            exam: item.exam === null ? "" : String(item.exam),
            caSavedAt: item.caSavedAt ?? null,
            examSavedAt: item.examSavedAt ?? null,
          };
        }
        setScores(next);
        cacheRecord(key, next);
        return;
      }
    } catch {}
    setScores(readCachedRecord<ScoreMap>(key) ?? {});
  }

  function setScore(studentId: string, field: "ca" | "exam", value: string) {
    const current = scores[studentId] ?? { ca: "", exam: "" };
    setScores({
      ...scores,
      [studentId]: { ...current, [field]: value },
    });
  }

  async function save(student: Student) {
    if (!schoolId || !assignment) return;

    const score = scores[student.id] ?? { ca: "", exam: "" };
    const hasCa = score.ca.trim() !== "";
    const hasExam = score.exam.trim() !== "";

    if (!hasCa && !hasExam) {
      setMessage("Enter a CA or exam score before saving.");
      return;
    }

    const ca = hasCa ? Number(score.ca) : undefined;
    const exam = hasExam ? Number(score.exam) : undefined;

    if (hasCa && (!Number.isFinite(ca) || (ca as number) < 0 || (ca as number) > 30)) {
      setMessage("CA must be 0-30.");
      return;
    }
    if (hasExam && (!Number.isFinite(exam) || (exam as number) < 0 || (exam as number) > 70)) {
      setMessage("Exam must be 0-70.");
      return;
    }

    const body = {
      studentId: student.id,
      classId: assignment.class.id,
      subjectId: assignment.subject.id,
      term,
      ...(hasCa ? { ca } : {}),
      ...(hasExam ? { exam } : {}),
    };

    if (!navigator.onLine) {
      queueAction({ scopeKey, url: `/api/schools/${schoolId}/assessments`, method: "POST", body });
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
      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        setScores(prev => ({
          ...prev,
          [student.id]: {
            ...prev[student.id],
            ca: result.ca === null ? "" : String(result.ca ?? prev[student.id]?.ca ?? ""),
            exam: result.exam === null ? "" : String(result.exam ?? prev[student.id]?.exam ?? ""),
            caSavedAt: result.caSavedAt ?? prev[student.id]?.caSavedAt ?? null,
            examSavedAt: result.examSavedAt ?? prev[student.id]?.examSavedAt ?? null,
          },
        }));
        setMessage("Saved. Only the score(s) entered now have a 24-hour correction window.");
        return;
      }

      setMessage(result.error || "Score could not be saved.");
    } catch {
      queueAction({ scopeKey, url: `/api/schools/${schoolId}/assessments`, method: "POST", body });
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
      startOfflineSync(scopeKey, result => setPending(result.remaining));
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
    void loadAssessments(schoolId, assignment);
  }, [schoolId, assignment?.id, term, scopeKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  if (!data) return <main className="workspace-main"><p className="muted">{message}</p></main>;

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
            const caLeft = remaining(score.caSavedAt);
            const examLeft = remaining(score.examSavedAt);
            const caLocked = caLeft === 0 && Boolean(score.caSavedAt);
            const examLocked = examLeft === 0 && Boolean(score.examSavedAt);

            return (
              <div className="card" key={student.id}>
                <strong>{student.firstName} {student.lastName}</strong>
                <p className="muted">{student.admissionId}</p>

                <div className="grid grid-2">
                  <label className="grid">
                    <span>CA / 30</span>
                    <input
                      inputMode="decimal"
                      value={score.ca}
                      disabled={caLocked}
                      onChange={event => setScore(student.id, "ca", event.target.value)}
                    />
                    {score.caSavedAt && (
                      <small className="muted">
                        {caLocked ? "CA correction window expired." : formatRemaining(caLeft)}
                      </small>
                    )}
                  </label>

                  <label className="grid">
                    <span>Exam / 70</span>
                    <input
                      inputMode="decimal"
                      value={score.exam}
                      disabled={examLocked}
                      onChange={event => setScore(student.id, "exam", event.target.value)}
                    />
                    {score.examSavedAt && (
                      <small className="muted">
                        {examLocked ? "Exam correction window expired." : formatRemaining(examLeft)}
                      </small>
                    )}
                  </label>
                </div>

                <button className="button" onClick={() => void save(student)}>
                  Save entered score(s)
                </button>
              </div>
            );
          })}
        </div>
      )}

      {message && <p>{message}</p>}
    </main>
  );
}
