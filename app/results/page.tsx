"use client";

import { useEffect, useMemo, useState } from "react";
import { cacheRecord, readCachedRecord } from "@/lib/offline-queue";

type Role = "ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "CASHIER";

type User = {
  id: string;
  name: string;
  membership: {
    schoolId: string;
    role: Role;
    school: { name: string; abbr: string };
  } | null;
  student?: { id: string };
};

type Student = {
  id: string;
  admissionId: string;
  firstName: string;
  lastName: string;
};

type Assessment = {
  id: string;
  studentId: string;
  term: string;
  ca1: number | null;
  ca2: number | null;
  ca3: number | null;
  ca4: number | null;
  ca: number | null;
  exam: number | null;
  subject: { name: string };
};

type Result = {
  id: string;
  studentId: string;
  term: string;
  total: number;
  percentage: number;
  grade: string;
  position: number;
  published: boolean;
  student: Student;
  subject: { name: string };
};

export default function ResultsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [term, setTerm] = useState("First Term");
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("Loading...");

  const role = user?.membership?.role;
  const schoolId = user?.membership?.schoolId;

  async function loadMe() {
    const meKey = "skulgo-current-me";
    try {
      const response = await fetch("/api/auth/me");
      const data = await response.json().catch(() => ({ user: null }));
      if (response.ok && data.user?.membership) {
        cacheRecord(meKey, data);
        setUser(data.user);
        return data.user as User;
      }
    } catch {
      // Use the last known workspace identity below.
    }

    const cached = readCachedRecord<{ user?: User }>(meKey);
    if (!cached?.user?.membership) {
      setMessage("Open a school workspace first.");
      return null;
    }

    setUser(cached.user);
    return cached.user;
  }

  async function loadResults(currentUser: User | null = user) {
    if (!currentUser?.membership) return;

    const params = new URLSearchParams({ term });
    if (role === "STUDENT") params.set("published", "true");
    if (role === "PARENT") params.set("published", "true");
    if (role === "STUDENT" && currentUser.student?.id) {
      params.set("studentId", currentUser.student.id);
    }

    const schoolId = currentUser.membership.schoolId;
    const userScope = `${currentUser.id}:${schoolId}`;
    const cacheKey = `skulgo:results:${userScope}:${term}:${role === "STUDENT" ? currentUser.student?.id ?? "self" : role ?? "workspace"}`;

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/results?${params.toString()}`
      );
      const data = await response.json().catch(() => []);
      if (response.ok) {
        setResults(Array.isArray(data) ? data : []);
        cacheRecord(cacheKey, Array.isArray(data) ? data : []);
        if (role === "PARENT" || role === "STUDENT") {
          const assessmentResponse = await fetch(`/api/schools/${schoolId}/assessments?${params.toString()}`);
          const assessmentData = await assessmentResponse.json().catch(() => []);
          setAssessments(assessmentResponse.ok && Array.isArray(assessmentData) ? assessmentData : []);
        }
        return;
      }
    } catch {
      // Fall through to the last successful result snapshot.
    }

    setResults(readCachedRecord<Result[]>(cacheKey) ?? []);
    if (role === "PARENT" || role === "STUDENT") setAssessments([]);
  }

  async function loadStudents(currentUser: User | null) {
    if (!currentUser?.membership || currentUser.membership.role !== "ADMIN") return;

    const response = await fetch(
      `/api/schools/${currentUser.membership.schoolId}/students`
    );
    const data = await response.json().catch(() => []);
    setStudents(response.ok ? data : []);
  }

  useEffect(() => {
    if (!navigator.onLine) {
      const cached = readCachedRecord<{ user?: User }>("skulgo-current-me");
      if (cached?.user?.membership) {
        setUser(cached.user);
        void loadResults(cached.user);
      } else {
        setMessage("Open a school workspace first.");
      }
      return;
    }

    void (async () => {
      const current = await loadMe();
      if (!current) return;
      await loadResults(current);
      await loadStudents(current);
    })();
  }, []);

  useEffect(() => {
    if (user) void loadResults(user);
  }, [term]);

  const grouped = useMemo(() => {
    return results.reduce<Record<string, Result[]>>((acc, item) => {
      (acc[item.studentId] ??= []).push(item);
      return acc;
    }, {});
  }, [results]);

  async function generate() {
    if (!schoolId || role !== "TEACHER" || !studentId) {
      setMessage("Choose a student.");
      return;
    }

    const response = await fetch(`/api/schools/${schoolId}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId, term }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error || "Result could not be generated.");
      return;
    }

    setMessage("Result generated.");
    await loadResults(user);
  }

  async function publish() {
    if (!schoolId || role !== "ADMIN") return;

    const response = await fetch(`/api/schools/${schoolId}/results/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        term,
        ...(studentId ? { studentId } : {}),
      }),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(data.error || "Result could not be published.");
      return;
    }

    setMessage(`${data.published} result(s) published.`);
    await loadResults(user);
  }

  if (!user?.membership) {
    return (
      <main className="workspace-main">
        <p className="muted">{message}</p>
      </main>
    );
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">{role?.toLowerCase()} workspace</p>
        <h1>Results</h1>
        <p className="muted">{user.membership.school.name}</p>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="grid grid-2">
          <label className="grid">
            <span>Term</span>
            <select value={term} onChange={event => setTerm(event.target.value)}>
              <option>First Term</option>
              <option>Second Term</option>
              <option>Third Term</option>
            </select>
          </label>

          {(role === "TEACHER" || role === "ADMIN") && (
            <label className="grid">
              <span>Student</span>
              {role === "ADMIN" && students.length ? (
                <select value={studentId} onChange={event => setStudentId(event.target.value)}>
                  <option value="">All students</option>
                  {students.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.firstName} {student.lastName} · {student.admissionId}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={studentId}
                  onChange={event => setStudentId(event.target.value)}
                  placeholder="Student ID"
                />
              )}
            </label>
          )}
        </div>

        {role === "TEACHER" && (
          <button className="button" onClick={() => void generate()} style={{ marginTop: 12 }}>
            Generate result
          </button>
        )}

        {role === "ADMIN" && (
          <button className="button" onClick={() => void publish()} style={{ marginTop: 12 }}>
            Publish result
          </button>
        )}
      </div>

      {(role === "STUDENT" || role === "PARENT") && (
        <p className="muted">Only published results are shown.</p>
      )}

      {(role === "PARENT" || role === "STUDENT") ? (
        <div className="grid">
          {assessments.map(item => {
            const published = results.find(result => result.studentId === item.studentId && result.subject.name === item.subject.name);
            return (
              <div className="card" key={item.id}>
                <strong>{item.subject.name}</strong>
                <p className="muted">{term}</p>
                <div className="grid grid-2">
                  <span>CA1 · {item.ca1 ?? "—"}/10</span>
                  <span>CA2 · {item.ca2 ?? "—"}/10</span>
                  <span>CA3 · {item.ca3 ?? "—"}/10</span>
                  <span>CA4 · {item.ca4 ?? "—"}/10</span>
                </div>
                <p className="muted">CA total: {item.ca === null ? "—" : item.ca + "/40"}</p>
                {published ? (
                  <div>
                    <strong>Published result</strong>
                    <p>{published.total}/100 · Grade {published.grade} · Position {published.position}</p>
                  </div>
                ) : (
                  <p className="muted">Final grade and position will appear after Admin publishes the result.</p>
                )}
              </div>
            );
          })}
          {!assessments.length && (
            <div className="card">
              <strong>No assessment records yet.</strong>
              <p className="muted">Saved CA records will appear here when your teacher records them.</p>
            </div>
          )}
        </div>
      ) : !results.length ? (
        <div className="card">
          <strong>No result available.</strong>
          <p className="muted">
            {role === "TEACHER"
              ? "Generate a result from saved assessments."
              : "Publish generated results when the school is ready."}
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([key, items]) => (
          <div className="card" key={key} style={{ marginBottom: 14 }}>
            <strong>{items[0].student.firstName} {items[0].student.lastName}</strong>
            <p className="muted">{items[0].student.admissionId} · {term}</p>
            <div className="grid">
              {items.map(item => (
                <div key={item.id}>
                  <strong>{item.subject.name}</strong>
                  <p className="muted">
                    {item.total}/100 · Grade {item.grade} · Position {item.position}
                    {!item.published && " · Draft"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {message && <p>{message}</p>}
    </main>
  );
}
