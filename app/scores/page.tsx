"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  cacheRecord,
  queueAction,
  queuedCount,
  readCachedRecord,
  startOfflineSync,
} from "@/lib/offline-queue";

type Student = {
  id: string;
  admissionId: string;
  firstName: string;
  lastName: string;
  classId?: string | null;
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

type Score = {
  ca: string;
  exam: string;
  caSavedAt?: string | null;
  examSavedAt?: string | null;
  submitted?: boolean;
};

type ScoreMap = Record<string, Score>;

type RecordItem = {
  studentId: string;
  ca: number | null;
  caMax: number;
  exam: number | null;
  examMax: number;
  ca1SavedAt?: string | null;
  examSavedAt?: string | null;
  submitted?: boolean;
};

const WINDOW = 24 * 60 * 60 * 1000;
const CA_OPTIONS = [40, 30, 20, 10];

function remaining(savedAt?: string | null) {
  return savedAt
    ? Math.max(0, new Date(savedAt).getTime() + WINDOW - Date.now())
    : null;
}

export default function ScoresPage() {
  const [data, setData] = useState<Data | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState("");
  const [term, setTerm] = useState("First Term");
  const [scores, setScores] = useState<ScoreMap>({});
  const [caMax, setCaMax] = useState(40);
  const [schoolId, setSchoolId] = useState("");
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState("Loading...");
  const [scope, setScope] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const saveTimers = useRef<Record<string, number>>({});
  const dirtyFields = useRef<Set<string>>(new Set());
  const examMax = 100 - caMax;
  const hasScores = Object.values(scores).some(
    (score) => score.ca.trim() !== "" || score.exam.trim() !== "",
  );

  const assignment = useMemo(
    () =>
      data?.assignments.find((item) => item.id === selected) ??
      data?.assignments[0] ??
      null,
    [data, selected],
  );

  async function load() {
    let me: any = null;

    try {
      const response = await fetch("/api/auth/me");
      const json = await response.json().catch(() => ({}));
      if (response.ok) {
        me = json;
        cacheRecord("skulgo-current-me", json);
      }
    } catch {
      me = readCachedRecord<any>("skulgo-current-me");
    }

    if (!me) me = readCachedRecord<any>("skulgo-current-me");

    const key =
      me?.user?.id && me?.user?.membership?.id
        ? me.user.id + ":" + me.user.membership.id
        : "";

    setScope(key);

    if (!key) {
      setMessage("This school workspace is not available on this device yet.");
      return;
    }

    let assignments: Data | null = null;

    try {
      const response = await fetch("/api/schools/current/my-assignments");
      const json = await response.json().catch(() => ({}));
      if (response.ok) {
        assignments = json;
        cacheRecord("skulgo:" + key + ":my-assignments", json);
      }
    } catch {
      assignments = readCachedRecord<Data>("skulgo:" + key + ":my-assignments");
    }

    if (!assignments) {
      assignments = readCachedRecord<Data>("skulgo:" + key + ":my-assignments");
    }

    if (!assignments) {
      setMessage("Teacher assignments are not available on this device yet.");
      return;
    }

    setData(assignments);
    setSchoolId(me?.user?.membership?.schoolId ?? "");

    if (!selected && assignments.assignments?.length) {
      setSelected(assignments.assignments[0].id);
    }

    setMessage("");
  }

  async function loadStudents() {
    if (!schoolId || !assignment) return;

    const key =
      "skulgo-scores-students-" + schoolId + "-" + assignment.class.id;

    try {
      const response = await fetch("/api/schools/" + schoolId + "/students");
      if (response.ok) {
        const json = await response.json();
        const filtered = json.filter(
          (student: Student) =>
            !student.classId || student.classId === assignment.class.id,
        );
        setStudents(filtered);
        cacheRecord(key, filtered);
        return;
      }
    } catch {
      // Use the local copy below.
    }

    setStudents(readCachedRecord<Student[]>(key) ?? []);
  }

  async function loadScores() {
    if (!schoolId || !assignment) return;

    const key =
      "skulgo:" +
      scope +
      ":assessments-" +
      assignment.id +
      "-" +
      term;

    try {
      const response = await fetch(
        "/api/schools/" +
          schoolId +
          "/assessments?classId=" +
          encodeURIComponent(assignment.class.id) +
          "&subjectId=" +
          encodeURIComponent(assignment.subject.id) +
          "&term=" +
          encodeURIComponent(term),
      );

      if (response.ok) {
        const records = (await response.json()) as RecordItem[];
        const next: ScoreMap = {};

        for (const record of records) {
          const current = scores[record.studentId];
          next[record.studentId] = {
            ca: dirtyFields.current.has(record.studentId + ":ca")
              ? current?.ca ?? ""
              : record.ca == null ? "" : String(record.ca),
            exam: dirtyFields.current.has(record.studentId + ":exam")
              ? current?.exam ?? ""
              : record.exam == null ? "" : String(record.exam),
            caSavedAt: record.ca1SavedAt ?? null,
            examSavedAt: record.examSavedAt ?? null,
            submitted: Boolean(record.submitted),
          };

          setCaMax(record.caMax ?? 40);
          if (record.submitted) setSubmitted(true);
        }

        setScores(next);
        cacheRecord(key, next);
        return;
      }
    } catch {
      // Use the local copy below.
    }

    setScores(readCachedRecord<ScoreMap>(key) ?? {});
  }

  function setScore(studentId: string, field: "ca" | "exam", value: string) {
    dirtyFields.current.add(studentId + ":" + field);
    const current =
      scores[studentId] ?? {
        ca: "",
        exam: "",
        caSavedAt: null,
        examSavedAt: null,
      };

    setScores({
      ...scores,
      [studentId]: { ...current, [field]: value },
    });
  }

  function scheduleSave(student: Student, field: "ca" | "exam") {
    const key =
      student.id + ":" + assignment?.id + ":" + term + ":" + field;

    if (saveTimers.current[key]) {
      window.clearTimeout(saveTimers.current[key]);
    }

    saveTimers.current[key] = window.setTimeout(() => {
      delete saveTimers.current[key];
      void saveField(student, field);
    }, 1000);
  }

  async function saveField(student: Student, field: "ca" | "exam") {
    if (!schoolId || !assignment || submitted) return;

    const score =
      scores[student.id] ?? {
        ca: "",
        exam: "",
        caSavedAt: null,
        examSavedAt: null,
      };

    const value = score[field].trim();
    if (!value) return;

    const savedAt =
      field === "ca" ? score.caSavedAt : score.examSavedAt;

    if (savedAt && remaining(savedAt) === 0) {
      setMessage(
        field.toUpperCase() + " correction window expired.",
      );
      return;
    }

    const number = Number(value);
    const maximum = field === "ca" ? caMax : examMax;

    if (
      !Number.isFinite(number) ||
      number < 0 ||
      number > maximum
    ) {
      setMessage(
        field.toUpperCase() + " must be between 0 and " + maximum + ".",
      );
      return;
    }

    const body = {
      studentId: student.id,
      classId: assignment.class.id,
      subjectId: assignment.subject.id,
      term,
      caMax,
      examMax,
      [field]: number,
    };

    if (!navigator.onLine) {
      queueAction({
        scopeKey: scope,
        url: "/api/schools/" + schoolId + "/assessments",
        method: "POST",
        body,
      });
      setPending(queuedCount(scope));
      setMessage("Saved as draft on this device.");
      return;
    }

    try {
      const response = await fetch(
        "/api/schools/" + schoolId + "/assessments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(json.error || "Score could not be saved.");
        return;
      }

      dirtyFields.current.delete(student.id + ":" + field);
      setScores((current) => ({
        ...current,
        [student.id]: {
          ...current[student.id],
          [field]: String(number),
          [field === "ca" ? "caSavedAt" : "examSavedAt"]:
            json[field === "ca" ? "ca1SavedAt" : "examSavedAt"] ??
            current[student.id]?.[field === "ca" ? "caSavedAt" : "examSavedAt"] ??
            new Date().toISOString(),
        },
      }));

      setMessage("Saved.");
    } catch {
      queueAction({
        scopeKey: scope,
        url: "/api/schools/" + schoolId + "/assessments",
        method: "POST",
        body,
      });
      setPending(queuedCount(scope));
      setMessage("Connection dropped. Draft queued for sync.");
    }
  }

  async function submitScores() {
    if (!schoolId || !assignment || submitted || submitting) return;

    const confirmed = window.confirm(
      "Submit these scores now? After submission, the scores will be locked for editing.",
    );

    if (!confirmed) return;

    setSubmitting(true);
    setMessage("Submitting scores...");

    const body = {
      action: "submit",
      studentId: "class",
      classId: assignment.class.id,
      subjectId: assignment.subject.id,
      term,
      caMax,
      examMax,
    };

    if (!navigator.onLine) {
      queueAction({
        scopeKey: scope,
        url: "/api/schools/" + schoolId + "/assessments",
        method: "POST",
        body,
      });
      setPending(queuedCount(scope));
      setMessage("Submission queued. It will lock when connection returns.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        "/api/schools/" + schoolId + "/assessments",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(json.error || "Scores could not be submitted.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setScores((current) => {
        const next = { ...current };
        for (const id of Object.keys(next)) {
          next[id] = { ...next[id], submitted: true };
        }
        return next;
      });
      setMessage("Scores submitted and locked.");
    } catch {
      setMessage("Connection lost. Submission was not completed.");
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(queuedCount(scope));
    void load();

    const onOnline = () => {
      setOnline(true);
      startOfflineSync(scope, (result) => setPending(result.remaining));
    };

    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [scope]);

  useEffect(() => {
    setSubmitted(false);
    void loadStudents();
    void loadScores();
  }, [schoolId, assignment?.id, term, scope]);

  if (!data) {
    return (
      <main className="workspace-main">
        <p className="muted">{message}</p>
      </main>
    );
  }

  if (!assignment) {
    return (
      <main className="workspace-main">
        <div className="card">
          <strong>No teaching assignment yet.</strong>
          <p className="muted">
            Scores will appear here after Admin assigns a class and subject.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">
          Teacher workspace · {online ? "Online" : "Offline"}
        </p>
        <h1>Scores</h1>
        <p className="muted">
          {assignment.subject.name} · {assignment.class.section.name} ·{" "}
          {assignment.class.name}
          {assignment.class.arm ? " · " + assignment.class.arm : ""}
        </p>
        <p className="muted">
          {pending
            ? pending + " item(s) waiting to sync"
            : "Saved records sync automatically."}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="grid grid-2">
          <label className="grid">
            <span>Teaching assignment</span>
            <select
              value={selected}
              disabled={submitted}
              onChange={(event) => setSelected(event.target.value)}
            >
              {data.assignments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.subject.name} · {item.class.section.name} ·{" "}
                  {item.class.name}
                  {item.class.arm ? " · " + item.class.arm : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="grid">
            <span>Term</span>
            <select
              value={term}
              disabled={submitted}
              onChange={(event) => setTerm(event.target.value)}
            >
              <option>First Term</option>
              <option>Second Term</option>
              <option>Third Term</option>
            </select>
          </label>
        </div>

        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <label className="grid">
            <span>CA maximum</span>
            <select
              value={caMax}
              disabled={submitted || hasScores}
              onChange={(event) => setCaMax(Number(event.target.value))}
            >
              {CA_OPTIONS.map((maximum) => (
                <option key={maximum} value={maximum}>
                  CA / {maximum}
                </option>
              ))}
            </select>
          </label>

          <div className="grid">
            <span>Exam maximum</span>
            <div
              className="card"
              style={{ padding: "10px 12px", minHeight: 44 }}
            >
              Exam / {examMax}
            </div>
          </div>
        </div>

        <p className="muted" style={{ marginBottom: 0 }}>
          CA + Exam = 100. Scores save automatically. You can correct them
          for 24 hours, or submit now to lock them.
          {hasScores && !submitted ? " The grading structure is now fixed for this draft." : ""}
        </p>
      </div>

      {students.length === 0 ? (
        <div className="card">
          <strong>No students available.</strong>
        </div>
      ) : (
        <div className="grid">
          {students.map((student) => {
            const score =
              scores[student.id] ?? {
                ca: "",
                exam: "",
                caSavedAt: null,
                examSavedAt: null,
              };

            const caExpired =
              Boolean(score.caSavedAt) && remaining(score.caSavedAt) === 0;
            const examExpired =
              Boolean(score.examSavedAt) &&
              remaining(score.examSavedAt) === 0;

            return (
              <div className="card" key={student.id}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <strong>
                      {student.firstName} {student.lastName}
                    </strong>
                    <p className="muted" style={{ margin: "4px 0 0" }}>
                      {student.admissionId}
                    </p>
                  </div>
                  <span className="muted">
                    {submitted ? "Submitted · Locked" : "Draft"}
                  </span>
                </div>

                <div className="grid grid-2">
                  <label className="grid">
                    <span>CA / {caMax}</span>
                    <input
                      inputMode="decimal"
                      value={score.ca}
                      disabled={submitted || caExpired}
                      placeholder="Enter CA score"
                      onChange={(event) => {
                        const value = event.target.value;
                        setScore(student.id, "ca", value);

                        if (
                          value !== "" &&
                          Number.isFinite(Number(value)) &&
                          Number(value) >= 0 &&
                          Number(value) <= caMax
                        ) {
                          scheduleSave(student, "ca");
                        }
                      }}
                    />
                  </label>

                  <label className="grid">
                    <span>Exam / {examMax}</span>
                    <input
                      inputMode="decimal"
                      value={score.exam}
                      disabled={submitted || examExpired}
                      placeholder="Enter exam score"
                      onChange={(event) => {
                        const value = event.target.value;
                        setScore(student.id, "exam", value);

                        if (
                          value !== "" &&
                          Number.isFinite(Number(value)) &&
                          Number(value) >= 0 &&
                          Number(value) <= examMax
                        ) {
                          scheduleSave(student, "exam");
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!submitted && (
        <div
          className="card"
          style={{
            marginTop: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong>Ready to finish?</strong>
            <p className="muted" style={{ margin: "4px 0 0" }}>
              Submit when you are sure. Submission locks the scores.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void submitScores()}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Scores"}
          </button>
        </div>
      )}

      {message && <p>{message}</p>}
    </main>
  );
}
