"use client";

import { useEffect, useState } from "react";

type Teacher = {
  id: string;
  teacherCode: string;
  approved: boolean;
  user: { id: string; name: string; email: string };
};

type Cashier = {
  id: string;
  cashierCode: string | null;
  approved: boolean;
  user?: { id: string; name: string; email: string };
  name?: string;
  email?: string;
};

export default function StaffPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
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
      const [teacherResponse, cashierResponse] = await Promise.all([
        fetch(`/api/schools/${schoolId}/teachers`),
        fetch(`/api/schools/${schoolId}/cashiers`),
      ]);
      const teacherResult = await teacherResponse.json().catch(() => []);
      const cashierResult = await cashierResponse.json().catch(() => []);

      if (!teacherResponse.ok) throw new Error(teacherResult?.error || "Unable to load teachers.");
      if (!cashierResponse.ok) throw new Error(cashierResult?.error || "Unable to load cashiers.");

      setTeachers(Array.isArray(teacherResult) ? teacherResult : []);
      setCashiers(Array.isArray(cashierResult) ? cashierResult : []);
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
        <p>Approved academic and non-academic staff connected to this school.</p>
      </div>

      {message && <p role="status" className="muted">{message}</p>}

      {!teachers.length && !cashiers.length && !message.includes("Loading") ? (
        <div className="card">
          <strong>No approved staff yet.</strong>
          <p className="muted">Approve staff applications to see them here.</p>
        </div>
      ) : (
        <div className="grid">
          {teachers.map(teacher => (
            <article className="card" key={`teacher-${teacher.id}`}>
              <strong>{teacher.user.name}</strong>
              <p className="muted">{teacher.user.email}</p>
              <p className="muted">
                Teacher ID: <strong>{teacher.teacherCode}</strong>
              </p>
              <p className="muted">
                Type: Academic staff
              </p>
              <p className="muted">
                Status: {teacher.approved ? "Approved" : "Pending"}
              </p>
            </article>
          ))}

          {cashiers.map(cashier => (
            <article className="card" key={`cashier-${cashier.id}`}>
              <strong>{cashier.user?.name ?? cashier.name}</strong>
              <p className="muted">{cashier.user?.email ?? cashier.email}</p>
              <p className="muted">
                Cashier ID: <strong>{cashier.cashierCode ?? "Not assigned"}</strong>
              </p>
              <p className="muted">
                Type: Non-academic staff
              </p>
              <p className="muted">
                Status: {cashier.approved ? "Approved" : "Pending"}
              </p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
