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
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [classId, setClassId] = useState("");
  const [studentAdmissionId, setStudentAdmissionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setClassId("");
    setStudentAdmissionId("");
    setPhone("");
    setGender("");
    setGuardianName("");
    setGuardianPhone("");
    setRelationship("");
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
          phone,
          gender,
          guardianName,
          guardianPhone,
          relationship,
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
      setPhone("");
      setGender("");
      setGuardianName("");
      setGuardianPhone("");
      setRelationship("");
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

        {(role === "TEACHER" || role === "PARENT") && (
          <label className="grid">
            <span>Phone number</span>
            <input value={phone} onChange={event => setPhone(event.target.value)} placeholder="Phone number" type="tel" />
          </label>
        )}

        {(role === "TEACHER" || role === "STUDENT") && (
          <label className="grid">
            <span>Gender</span>
            <select value={gender} onChange={event => setGender(event.target.value)}>
              <option value="">Choose gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </label>
        )}

        {role === "STUDENT" && (
          <div className="grid grid-2">
            <label className="grid">
              <span>Parent/Guardian name</span>
              <input value={guardianName} onChange={event => setGuardianName(event.target.value)} placeholder="Parent or guardian name" />
            </label>
            <label className="grid">
              <span>Parent/Guardian phone</span>
              <input value={guardianPhone} onChange={event => setGuardianPhone(event.target.value)} placeholder="Parent or guardian phone" type="tel" />
            </label>
          </div>
        )}

        {role === "PARENT" && (
          <label className="grid">
            <span>Relationship to child</span>
            <select value={relationship} onChange={event => setRelationship(event.target.value)}>
              <option value="">Choose relationship</option>
              <option value="Mother">Mother</option>
              <option value="Father">Father</option>
              <option value="Guardian">Guardian</option>
              <option value="Other">Other</option>
            </select>
          </label>
        )}

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
