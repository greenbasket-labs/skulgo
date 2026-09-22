"use client";

import { useState } from "react";

type School = { id: string; name: string; abbr: string; address: string };
type SchoolClass = { id: string; name: string; arm?: string | null; section?: { name: string } };

export default function Schools() {
  const [q, setQ] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Record<string, SchoolClass[]>>({});
  const [selectedClass, setSelectedClass] = useState<Record<string, string>>({});
  const [m, setM] = useState("");
  const [busy, setBusy] = useState("");

  async function search(v: string) {
    setQ(v);
    if (v.length < 2) { setSchools([]); return; }
    const r = await fetch("/api/schools/search?q=" + encodeURIComponent(v));
    setSchools(await r.json());
  }

  async function loadClasses(schoolId: string) {
    if (classes[schoolId]) return;
    const r = await fetch("/api/schools/" + schoolId + "/classes");
    const data = await r.json();
    if (r.ok) setClasses(prev => ({ ...prev, [schoolId]: data }));
  }

  async function request(s: School, type: "JOB" | "ADMISSION") {
    setM("");
    if (type === "ADMISSION" && !selectedClass[s.id]) {
      setM("Please choose the class you are applying for.");
      return;
    }
    setBusy(s.id + type);
    const role = type === "JOB" ? "TEACHER" : "STUDENT";
    const classId = type === "ADMISSION" ? selectedClass[s.id] : null;
    const r = await fetch("/api/school-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId: s.id, type, requestedRole: role, classId }),
    });
    const j = await r.json().catch(() => ({}));
    setM(r.ok ? "Request sent to " + s.name : (j.error || "Request failed"));
    setBusy("");
  }

  return (
    <main className="shell">
      <div className="card">
        <p className="muted">Personal SkulGo account</p>
        <h1>Find your school</h1>
        <input value={q} onChange={e => search(e.target.value)} placeholder="Search school name or abbreviation" />
        {schools.map(s => (
          <div className="card" key={s.id} style={{ marginTop: 12 }}>
            <strong>{s.name}</strong>
            <p className="muted">{s.abbr} · {s.address}</p>
            <div className="grid">
              <button className="button" disabled={!!busy} onClick={() => request(s, "JOB")}>Send job request</button>
              <div>
                <p><strong>Admission</strong></p>
                <select
                  value={selectedClass[s.id] || ""}
                  onFocus={() => loadClasses(s.id)}
                  onChange={e => setSelectedClass(prev => ({ ...prev, [s.id]: e.target.value }))}
                >
                  <option value="">Choose class</option>
                  {(classes[s.id] || []).map(c => (
                    <option key={c.id} value={c.id}>
                      {c.section?.name ? c.section.name + " · " : ""}{c.name}{c.arm ? " · " + c.arm : ""}
                    </option>
                  ))}
                </select>
                <button className="button" style={{ marginTop: 8 }} disabled={!!busy} onClick={() => request(s, "ADMISSION")}>Send admission request</button>
              </div>
            </div>
          </div>
        ))}
        {m && <p>{m}</p>}
      </div>
    </main>
  );
}
