"use client";

import { useState } from "react";

type School = { id: string; name: string; abbr: string; address: string };
type SchoolClass = { id: string; name: string; arm?: string | null; section?: { name: string } };

type ApplyType = "STUDENT" | "TEACHER" | "CASHIER" | "STAFF" | "PARENT";

export default function Schools() {
  const [q, setQ] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Record<string, SchoolClass[]>>({});
  const [openSchool, setOpenSchool] = useState("");
  const [applyType, setApplyType] = useState<Record<string, ApplyType | "">>({});
  const [selectedClass, setSelectedClass] = useState<Record<string, string>>({});
  const [childAdmissionId, setChildAdmissionId] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  async function search(value: string) {
    setQ(value);
    setMessage("");
    if (value.length < 2) {
      setSchools([]);
      return;
    }

    const response = await fetch("/api/schools/search?q=" + encodeURIComponent(value));
    const data = await response.json().catch(() => []);
    setSchools(response.ok ? data : []);
  }

  async function loadClasses(schoolId: string) {
    if (classes[schoolId]) return;
    const response = await fetch("/api/schools/" + schoolId + "/classes");
    const data = await response.json().catch(() => []);
    if (response.ok) setClasses(current => ({ ...current, [schoolId]: data }));
  }

  function chooseType(schoolId: string, type: ApplyType) {
    setApplyType(current => ({ ...current, [schoolId]: type }));
    if (type === "STUDENT") loadClasses(schoolId);
    setMessage("");
  }

  async function submit(school: School) {
    const type = applyType[school.id];
    if (!type) {
      setMessage("Choose how you want to connect to the school.");
      return;
    }

    const classId = selectedClass[school.id] || null;
    const studentAdmissionId = type === "PARENT" ? (childAdmissionId[school.id] || "") : null;
    if (type === "STUDENT" && !classId) {
      setMessage("Choose the class you are applying for.");
      return;
    }

    if (type === "STAFF") {
      setMessage("Staff applications are the next application step.");
      return;
    }
    if (type === "PARENT" && !studentAdmissionId) {
      setMessage("Enter your child's Admission ID.");
      return;
    }

    setBusy(school.id);
    const response = await fetch("/api/school-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId: school.id,
        type: type === "TEACHER" || type === "CASHIER" ? "JOB" : "ADMISSION",
        requestedRole:
          type === "STUDENT" ? "STUDENT" :
          type === "PARENT" ? "PARENT" :
          type === "CASHIER" ? "CASHIER" : "TEACHER",
        classId: type === "STUDENT" ? classId : null,
        studentAdmissionId: type === "PARENT" ? studentAdmissionId : null,
      }),
    });

    const data = await response.json().catch(() => ({}));
    setBusy("");
    setMessage(response.ok ? "Application sent to " + school.name : (data.error || "Application failed"));
  }

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 800, margin: "0 auto" }}>
        <p className="muted">Personal SkulGo account</p>
        <h1>Find a school</h1>
        <p className="muted">Open the school, choose your connection, and apply.</p>

        <input
          value={q}
          onChange={event => search(event.target.value)}
          placeholder="Search school name or abbreviation"
        />

        <div className="grid" style={{ marginTop: 16 }}>
          {schools.map(school => {
            const selected = applyType[school.id] || "";

            return (
              <div className="card" key={school.id}>
                <strong>{school.name}</strong>
                <p className="muted">{school.abbr} · {school.address}</p>

                <button
                  className="button"
                  onClick={() => setOpenSchool(current => current === school.id ? "" : school.id)}
                >
                  {openSchool === school.id ? "Close" : "Apply"}
                </button>

                {openSchool === school.id && (
                  <div className="grid" style={{ marginTop: 14 }}>
                    <div className="grid grid-2">
                      {(["STUDENT", "TEACHER", "STAFF", "PARENT"] as ApplyType[]).map(type => (
                        <button
                          key={type}
                          className="button"
                          onClick={() => chooseType(school.id, type)}
                        >
                          {type === "STUDENT" && "Student"}
                          {type === "TEACHER" && "Teacher"}
                          {type === "STAFF" && "Staff"}
                          {type === "PARENT" && "Parent"}
                        </button>
                      ))}
                    </div>

                    {selected === "STUDENT" && (
                      <select
                        value={selectedClass[school.id] || ""}
                        onChange={event =>
                          setSelectedClass(current => ({ ...current, [school.id]: event.target.value }))
                        }
                      >
                        <option value="">Choose class</option>
                        {(classes[school.id] || []).map(schoolClass => (
                          <option key={schoolClass.id} value={schoolClass.id}>
                            {schoolClass.section?.name ? schoolClass.section.name + " · " : ""}
                            {schoolClass.name}
                            {schoolClass.arm ? " · " + schoolClass.arm : ""}
                          </option>
                        ))}
                      </select>
                    )}

                    {selected === "PARENT" && (
                      <input
                        value={childAdmissionId[school.id] || ""}
                        onChange={event =>
                          setChildAdmissionId(current => ({ ...current, [school.id]: event.target.value }))
                        }
                        placeholder="Child Admission ID"
                      />
                    )}

                    <button
                      className="button"
                      disabled={busy === school.id}
                      onClick={() => submit(school)}
                    >
                      {busy === school.id ? "Sending…" : "Send application"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {message && <p>{message}</p>}
      </div>
    </main>
  );
}
