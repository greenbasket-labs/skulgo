"use client";

import { useEffect, useState } from "react";

type Teacher = {
  id: string;
  teacherCode: string;
  approved: boolean;
  user: { id: string; name: string; email: string };
};

export default function StaffPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [message, setMessage] = useState("Loading...");

  async function load() {
    try {
      const me = await fetch("/api/auth/me");
      const data = await me.json().catch(() => ({}));
      if (!me.ok || data?.user?.membership?.role !== "ADMIN") {
        setMessage("Admin access required.");
        return;
      }

      const schoolId = data.user.membership.schoolId;
      const response = await fetch(`/api/schools/${schoolId}/teachers`);
      const result = await response.json().catch(() => []);

      if (!response.ok) throw new Error(result?.error || "Unable to load staff.");
      setTeachers(Array.isArray(result) ? result : []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load staff.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">Admin</p>
        <h1>Staff</h1>
        <p>Approved teaching staff connected to this school.</p>
      </div>

      {message && <p role="status" className="muted">{message}</p>}

      {!teachers.length && !message.includes("Loading") ? (
        <div className="card">
          <strong>No approved teachers yet.</strong>
          <p className="muted">Approve teacher applications to see staff here.</p>
        </div>
      ) : (
        <div className="grid">
          {teachers.map(teacher => (
            <article className="card" key={teacher.id}>
              <strong>{teacher.user.name}</strong>
              <p className="muted">{teacher.user.email}</p>
              <p className="muted">
                Teacher ID: <strong>{teacher.teacherCode}</strong>
              </p>
              <p className="muted">
                Status: {teacher.approved ? "Approved" : "Pending"}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
