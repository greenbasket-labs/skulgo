"use client";

import { FormEvent, useEffect, useState } from "react";

type SchoolClass = {
  id: string;
  name: string;
  arm: string | null;
  section: { name: string };
};

export default function AdminAddPerson({ schoolId, classes }: { schoolId: string; classes: SchoolClass[] }) {
  const [role, setRole] = useState<"TEACHER" | "STUDENT" | "PARENT">("TEACHER");
  const [accountId, setAccountId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [classId, setClassId] = useState("");
  const [studentAdmissionId, setStudentAdmissionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setClassId("");
    setStudentAdmissionId("");
  }, [role]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/schools/${schoolId}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          accountId,
          name,
          email,
          classId,
          studentAdmissionId,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Could not add person.");

      setMessage(
        data?.message ||
          (data?.accountId ? `Person added. SkulGo Account ID: ${data.accountId}` : "Person added.")
      );
      setAccountId("");
      setName("");
      setEmail("");
      setClassId("");
      setStudentAdmissionId("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add person.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <p className="muted">Admin</p>
      <h2>Add person</h2>
      <p className="muted">
        Add a teacher, student or parent directly. If they already have a SkulGo Account ID, use it.
        Otherwise SkulGo creates their personal account and sends setup instructions.
      </p>

      <form onSubmit={submit} className="grid" style={{ marginTop: 14 }}>
        <label className="grid">
          <span>Role</span>
          <select value={role} onChange={event => setRole(event.target.value as typeof role)}>
            <option value="TEACHER">Teacher</option>
            <option value="STUDENT">Student</option>
            <option value="PARENT">Parent</option>
          </select>
        </label>

        <label className="grid">
          <span>SkulGo Account ID <span className="muted">(optional)</span></span>
          <input
            value={accountId}
            onChange={event => setAccountId(event.target.value.toUpperCase())}
            placeholder="Use existing Account ID"
          />
        </label>

        <div className="grid grid-2">
          <label className="grid">
            <span>Full name {accountId ? <span className="muted">(only for new account)</span> : ""}</span>
            <input value={name} onChange={event => setName(event.target.value)} placeholder="Full name" required={!accountId} />
          </label>

          <label className="grid">
            <span>Email {accountId ? <span className="muted">(only for new account)</span> : ""}</span>
            <input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="Email" required={!accountId} />
          </label>
        </div>

        {role === "STUDENT" && (
          <label className="grid">
            <span>Class</span>
            <select value={classId} onChange={event => setClassId(event.target.value)} required>
              <option value="">Choose class</option>
              {classes.map(item => (
                <option key={item.id} value={item.id}>
                  {item.section.name} · {item.name}{item.arm ? ` · ${item.arm}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}

        {role === "PARENT" && (
          <label className="grid">
            <span>Child Admission ID</span>
            <input
              value={studentAdmissionId}
              onChange={event => setStudentAdmissionId(event.target.value)}
              placeholder="Child Admission ID"
              required
            />
          </label>
        )}

        <button className="button" disabled={busy}>
          {busy ? "Adding…" : "Add person"}
        </button>
      </form>

      {message && <p role="status">{message}</p>}
    </section>
  );
}
