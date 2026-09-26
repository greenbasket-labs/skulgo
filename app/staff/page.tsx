"use client";

import { useEffect, useState } from "react";

type Teacher = {
  id: string;
  membershipId: string | null;
  teacherCode: string;
  approved: boolean;
  user: { id: string; name: string; email: string };
};

type Cashier = {
  id: string;
  membershipId: string;
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
  const [schoolId, setSchoolId] = useState("");
  const [endReasons, setEndReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");

  async function load() {
    try {
      const me = await fetch("/api/auth/me");
      const data = await me.json().catch(() => ({}));
      if (!me.ok || data?.user?.membership?.role !== "ADMIN") {
        setMessage("Admin access required.");
        return;
      }

      const currentSchoolId = data.user.membership.schoolId;
      setSchoolId(currentSchoolId);
      const [teacherResponse, cashierResponse] = await Promise.all([
        fetch(`/api/schools/${currentSchoolId}/teachers`),
        fetch(`/api/schools/${currentSchoolId}/cashiers`),
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

  async function endSchoolAccess(membershipId: string, personId: string) {
    const endReason = endReasons[personId] || "";
    if (!endReason) {
      setMessage("Choose a leaving reason first.");
      return;
    }
    if (!window.confirm("End this person's access to the school? Their school history will remain on their Personal Profile.")) {
      return;
    }

    setBusy(personId);
    setMessage("");
    try {
      const response = await fetch("/api/schools/" + schoolId + "/memberships/" + membershipId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endReason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Could not end school access.");
      setMessage("School access ended. The person's history remains in their Personal Profile.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not end school access.");
    } finally {
      setBusy("");
    }
  }

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
              {teacher.membershipId && (
                <div style={{ marginTop: 12 }}>
                  <select value={endReasons[teacher.id] || ""} onChange={event => setEndReasons(current => ({ ...current, [teacher.id]: event.target.value }))} disabled={busy === teacher.id}>
                    <option value="">Leaving reason</option>
                    <option value="Resigned">Resigned</option>
                    <option value="Contract ended">Contract ended</option>
                    <option value="Terminated">Terminated</option>
                    <option value="Dismissed">Dismissed</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Other">Other</option>
                  </select>
                  <button type="button" disabled={busy === teacher.id} onClick={() => void endSchoolAccess(teacher.membershipId!, teacher.id)} style={{ marginTop: 8 }}>
                    {busy === teacher.id ? "Ending..." : "End school access"}
                  </button>
                </div>
              )}
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
              <div style={{ marginTop: 12 }}>
                <select value={endReasons[cashier.id] || ""} onChange={event => setEndReasons(current => ({ ...current, [cashier.id]: event.target.value }))} disabled={busy === cashier.id}>
                  <option value="">Leaving reason</option>
                  <option value="Resigned">Resigned</option>
                  <option value="Contract ended">Contract ended</option>
                  <option value="Terminated">Terminated</option>
                  <option value="Dismissed">Dismissed</option>
                  <option value="Transferred">Transferred</option>
                  <option value="Other">Other</option>
                </select>
                <button type="button" disabled={busy === cashier.id} onClick={() => void endSchoolAccess(cashier.membershipId, cashier.id)} style={{ marginTop: 8 }}>
                  {busy === cashier.id ? "Ending..." : "End school access"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
