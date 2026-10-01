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

type ScoreField = "ca1" | "ca2" | "ca3" | "ca4" | "exam";

type AssessmentComponent = {
  key: ScoreField;
  name: string;
  maxScore: number;
  enabled: boolean;
  type: "CA" | "EXAM";
  sortOrder: number;
};

type Score = Record<ScoreField, string> & {
  savedAt: Partial<Record<ScoreField, string | null>>;
  submitted?: boolean;
};

type ScoreMap = Record<string, Score>;

type RecordItem = {
  studentId: string;
  ca: number | null;
  ca1: number | null;
  ca2: number | null;
  ca3: number | null;
  ca4: number | null;
  exam: number | null;
  submitted?: boolean;
  ca1SavedAt?: string | null;
  ca2SavedAt?: string | null;
  ca3SavedAt?: string | null;
  ca4SavedAt?: string | null;
  examSavedAt?: string | null;
};

type SetupResponse = {
  assessments: RecordItem[];
  assessmentSetup: { components: AssessmentComponent[] };
};

const WINDOW = 24 * 60 * 60 * 1000;

function remaining(savedAt?: string | null) {
  return savedAt
    ? Math.max(0, new Date(savedAt).getTime() + WINDOW - Date.now())
    : null;
}

const emptyScore = (): Score => ({
  ca1: "",
  ca2: "",
  ca3: "",
  ca4: "",
  exam: "",
  savedAt: {
    ca1: null,
    ca2: null,
    ca3: null,
    ca4: null,
    exam: null,
  },
});

function savedAtFor(record: RecordItem, field: ScoreField) {
  return field === "ca1"
    ? record.ca1SavedAt
    : field === "ca2"
      ? record.ca2SavedAt
      : field === "ca3"
        ? record.ca3SavedAt
        : field === "ca4"
          ? record.ca4SavedAt
          : record.examSavedAt;
}

function valueFor(record: RecordItem, field: ScoreField, singleCa: boolean) {
  if (field === "ca1" && singleCa && record.ca1 == null && record.ca != null) return String(record.ca);
  const value = record[field];
  return value == null ? "" : String(value);
}

export default function ScoresPage() {
  const [data, setData] = useState<Data | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState("");
  const [term, setTerm] = useState("First Term");
  const [scores, setScores] = useState<ScoreMap>({});
  const [components, setComponents] = useState<AssessmentComponent[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState("Loading...");
  const [scope, setScope] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const saveTimers = useRef<Record<string, number>>({});
  const dirtyFields = useRef<Set<string>>(new Set());

  const assignment = useMemo(
    () =>
      data?.assignments.find((item) => item.id === selected) ??
      data?.assignments[0] ??
      null,
    [data, selected],
  );

  const hasScores = Object.values(scores).some((score) =>
    components.some((component) => score[component.key].trim() !== ""),
  );

  const enabledComponents = components
    .filter((component) => component.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

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

    if (me?.user?.membership?.role !== "TEACHER") {
      setMessage("Teacher access required.");
      return;
    }

    const response = await fetch("/api/teachers/me/assignments");
    if (!response.ok) {
      setMessage("Teaching assignments are not available on this device yet.");
      return;
    }

    const assignments = await response.json();
    setData(assignments);
    setSchoolId(me?.user?.membership?.schoolId ?? "");

    if (!selected && assignments.assignments?.length) {
      setSelected(assignments.assignments[0].id);
    }

    setMessage("");
  }

  async function loadStudents() {
    if (!schoolId || !assignment) return;

    const key = "skulgo-scores-students-" + schoolId + "-" + assignment.class.id;

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
      // Use local copy below.
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
          encodeURIComponent(term) +
          "&setup=true",
      );

      if (response.ok) {
        const json = (await response.json()) as SetupResponse;
        const nextComponents = Array.isArray(json.assessmentSetup?.components)
          ? json.assessmentSetup.components
          : [];
        setComponents(nextComponents);

        const records = Array.isArray(json.assessments)
          ? json.assessments
          : [];
        const singleCa =
          nextComponents.filter((item) => item.type === "CA" && item.enabled)
            .length === 1 &&
          nextComponents.some(
            (item) => item.key === "ca1" && item.enabled,
          );

        const next: ScoreMap = {};
        for (const record of records) {
          const current = scores[record.studentId];
          const item = emptyScore();

          for (const field of ["ca1", "ca2", "ca3", "ca4", "exam"] as ScoreField[]) {
            item[field] = dirtyFields.current.has(record.studentId + ":" + field)
              ? current?.[field] ?? ""
              : valueFor(record, field, singleCa);
            item.savedAt[field] = savedAtFor(record, field) ?? null;
          }

          item.submitted = Boolean(record.submitted);
          next[record.studentId] = item;

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

  function setScore(studentId: string, field: ScoreField, value: string) {
    dirtyFields.current.add(studentId + ":" + field);

    setScores((currentScores) => {
      const current = currentScores[studentId] ?? emptyScore();
      return {
        ...currentScores,
        [studentId]: { ...current, [field]: value },
      };
    });
  }

  function scheduleSave(student: Student, field: ScoreField) {
    const key = student.id + ":" + assignment?.id + ":" + term + ":" + field;

    if (saveTimers.current[key]) {
      window.clearTimeout(saveTimers.current[key]);
    }

    saveTimers.current[key] = window.setTimeout(() => {
      delete saveTimers.current[key];
      void saveField(student, field);
    }, 1000);
  }

  async function saveField(student: Student, field: ScoreField) {
    if (!schoolId || !assignment || submitted) return;

    const score = scores[student.id] ?? emptyScore();
    const value = score[field].trim();
    if (!value) return;

    const component = components.find(
      (item) => item.key === field && item.enabled,
    );
    if (!component) return;

    const savedAt = score.savedAt[field];
    if (savedAt && remaining(savedAt) === 0) {
      setMessage(component.name + " correction window expired.");
      return;
    }

    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > component.maxScore) {
      setMessage(
        component.name +
          " must be between 0 and " +
          component.maxScore +
          ".",
      );
      return;
    }

    const body = {
      studentId: student.id,
      classId: assignment.class.id,
      subjectId: assignment.subject.id,
      term,
      [field]: number,
      clientMutationAt: Date.now(),
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
          ...(current[student.id] ?? emptyScore()),
          [field]: String(number),
          savedAt: {
            ...(current[student.id]?.savedAt ?? {}),
            [field]:
              savedAtFor(json as RecordItem, field) ??
              current[student.id]?.savedAt[field] ??
              new Date().toISOString(),
          },
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
      classId: assignment.class.id,
      subjectId: assignment.subject.id,
      term,
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

    if (scope) {
      startOfflineSync(scope, (result) => setPending(result.remaining));
    }

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
    setComponents([]);
    setScores({});
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

        <div style={{ marginTop: 16 }}>
          <strong>Assessment structure</strong>
          <div className="grid grid-2" style={{ marginTop: 10 }}>
            {enabledComponents.map((component) => (
              <div className="card" key={component.key} style={{ padding: "10px 12px" }}>
                {component.name} /{component.maxScore}
              </div>
            ))}
          </div>
        </div>

        <p className="muted" style={{ marginBottom: 0, marginTop: 12 }}>
          Admin sets these boxes for the school. Scores save automatically. Each entered score can be corrected for 24 hours, then submission locks the records.
        </p>
      </div>

      {!enabledComponents.length ? (
        <div className="card">
          <strong>Assessment setup is not available.</strong>
          <p className="muted">Ask the school Admin to configure the score boxes.</p>
        </div>
      ) : students.length === 0 ? (
        <div className="card">
          <strong>No students available.</strong>
        </div>
      ) : (
        <div className="grid">
          {students.map((student) => {
            const score = scores[student.id] ?? emptyScore();

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
                  {enabledComponents.map((component) => {
                    const field = component.key;
                    const savedAt = score.savedAt[field];
                    const expired = Boolean(savedAt) && remaining(savedAt) === 0;

                    return (
                      <label className="grid" key={field}>
                        <span>
                          {component.name} /{component.maxScore}
                        </span>
                        <input
                          inputMode="decimal"
                          value={score[field]}
                          disabled={submitted || expired}
                          placeholder="Enter score"
                          onChange={(event) => {
                            const value = event.target.value;
                            setScore(student.id, field, value);

                            if (
                              value !== "" &&
                              Number.isFinite(Number(value)) &&
                              Number(value) >= 0 &&
                              Number(value) <= component.maxScore
                            ) {
                              scheduleSave(student, field);
                            }
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!submitted && enabledComponents.length > 0 && (
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
