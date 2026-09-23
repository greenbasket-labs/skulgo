"use client";

import { useState } from "react";

type School = { id: string; name: string; abbr: string; address: string };
type SchoolClass = { id: string; name: string; section?: { name: string } };
type ApplyType = "STUDENT" | "TEACHER" | "CASHIER" | "PARENT";

type FormData = Record<string, string>;

const emptyForms = (): Record<ApplyType, FormData> => ({
  STUDENT: {},
  TEACHER: {},
  CASHIER: {},
  PARENT: {},
});

export default function Schools() {
  const [q, setQ] = useState("");
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<Record<string, SchoolClass[]>>({});
  const [openSchool, setOpenSchool] = useState("");
  const [applyType, setApplyType] = useState<Record<string, ApplyType | "">>({});
  const [selectedClass, setSelectedClass] = useState<Record<string, string>>({});
  const [forms, setForms] = useState<Record<string, Record<ApplyType, FormData>>>({});
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
    const response = await fetch("/api/schools/" + schoolId + "/admission-classes");
    const data = await response.json().catch(() => []);
    if (response.ok) setClasses(current => ({ ...current, [schoolId]: data }));
  }

  function chooseType(schoolId: string, type: ApplyType) {
    setApplyType(current => ({ ...current, [schoolId]: type }));
    if (type === "STUDENT") loadClasses(schoolId);
    setMessage("");
  }

  function updateField(schoolId: string, type: ApplyType, field: string, value: string) {
    setForms(current => ({
      ...current,
      [schoolId]: {
        ...(current[schoolId] || emptyForms()),
        [type]: {
          ...((current[schoolId] || emptyForms())[type]),
          [field]: value,
        },
      },
    }));
  }

  function fieldValue(schoolId: string, type: ApplyType, field: string) {
    return forms[schoolId]?.[type]?.[field] || "";
  }

  function input(schoolId: string, type: ApplyType, field: string, placeholder: string, required = true) {
    return (
      <input
        value={fieldValue(schoolId, type, field)}
        onChange={event => updateField(schoolId, type, field, event.target.value)}
        placeholder={placeholder}
        required={required}
      />
    );
  }

  async function submit(school: School) {
    const type = applyType[school.id];
    if (!type) {
      setMessage("Choose how you want to connect to the school.");
      return;
    }

    const form = forms[school.id]?.[type] || {};
    const classId = selectedClass[school.id] || null;

    if (type === "STUDENT" && !classId) {
      setMessage("Choose the class you are applying for.");
      return;
    }

    if (type === "PARENT" && !form.childAdmissionId) {
      setMessage("Enter your child's Admission ID.");
      return;
    }

    const requiredFields: Record<ApplyType, string[]> = {
      STUDENT: ["firstName", "lastName", "dateOfBirth", "gender", "guardianName", "guardianPhone"],
      TEACHER: ["phone", "qualification", "teachingSubjects", "yearsExperience"],
      CASHIER: ["phone", "qualification", "yearsExperience"],
      PARENT: ["relationship", "phone"],
    };

    if (requiredFields[type].some(field => !form[field])) {
      setMessage("Please complete the required application fields.");
      return;
    }

    setBusy(school.id);
    const response = await fetch("/api/school-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId: school.id,
        type: type === "TEACHER" || type === "CASHIER" ? "JOB" : "ADMISSION",
        requestedRole: type,
        classId: type === "STUDENT" ? classId : null,
        studentAdmissionId: type === "PARENT" ? form.childAdmissionId : null,
        applicationDetails: form,
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
        <p className="muted">Open the school, choose your connection, complete the application, then send it.</p>

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
                    <label>
                      <span className="muted">How do you want to connect?</span>
                      <select
                        value={selected}
                        onChange={event => chooseType(school.id, event.target.value as ApplyType)}
                      >
                        <option value="">Choose one</option>
                        <option value="STUDENT">Student</option>
                        <option value="TEACHER">Teacher</option>
                        <option value="CASHIER">Cashier</option>
                        <option value="PARENT">Parent</option>
                      </select>
                    </label>

                    {selected === "STUDENT" && (
                      <>
                        <h3>Student admission</h3>
                        {input(school.id, selected, "firstName", "First name")}
                        {input(school.id, selected, "middleName", "Middle name", false)}
                        {input(school.id, selected, "lastName", "Last name")}
                        {input(school.id, selected, "dateOfBirth", "Date of birth (DD/MM/YYYY)")}
                        <select
                          value={fieldValue(school.id, selected, "gender")}
                          onChange={event => updateField(school.id, selected, "gender", event.target.value)}
                        >
                          <option value="">Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                        <select
                          value={selectedClass[school.id] || ""}
                          onChange={event => setSelectedClass(current => ({ ...current, [school.id]: event.target.value }))}
                        >
                          <option value="">Choose class</option>
                          {(classes[school.id] || []).map(schoolClass => (
                            <option key={schoolClass.id} value={schoolClass.id}>
                              {schoolClass.section?.name ? schoolClass.section.name + " · " : ""}
                              {schoolClass.name}
                            </option>
                          ))}
                        </select>
                        {input(school.id, selected, "guardianName", "Parent / guardian full name")}
                        {input(school.id, selected, "guardianPhone", "Parent / guardian phone number")}
                        {input(school.id, selected, "previousSchool", "Previous school", false)}
                      </>
                    )}

                    {selected === "TEACHER" && (
                      <>
                        <h3>Teacher application</h3>
                        {input(school.id, selected, "phone", "Phone number")}
                        {input(school.id, selected, "qualification", "Highest qualification")}
                        {input(school.id, selected, "teachingQualification", "Teaching qualification / certificate", false)}
                        {input(school.id, selected, "teachingSubjects", "Subjects you can teach")}
                        {input(school.id, selected, "yearsExperience", "Years of teaching experience")}
                        {input(school.id, selected, "previousSchool", "Previous school / employer", false)}
                        {input(school.id, selected, "trcnStatus", "TRCN status / registration", false)}
                      </>
                    )}

                    {selected === "CASHIER" && (
                      <>
                        <h3>Cashier application</h3>
                        {input(school.id, selected, "phone", "Phone number")}
                        {input(school.id, selected, "qualification", "Highest qualification")}
                        {input(school.id, selected, "yearsExperience", "Years of cashier / accounts experience")}
                        {input(school.id, selected, "previousSchool", "Previous school / employer", false)}
                        {input(school.id, selected, "accountingExperience", "Accounting / bookkeeping experience", false)}
                      </>
                    )}

                    {selected === "PARENT" && (
                      <>
                        <h3>Parent connection</h3>
                        {input(school.id, selected, "childAdmissionId", "Child Admission ID")}
                        {input(school.id, selected, "relationship", "Relationship to child")}
                        {input(school.id, selected, "phone", "Phone number")}
                        {input(school.id, selected, "occupation", "Occupation", false)}
                      </>
                    )}

                    {selected && (
                      <button
                        className="button"
                        disabled={busy === school.id}
                        onClick={() => submit(school)}
                      >
                        {busy === school.id ? "Sending…" : "Send application"}
                      </button>
                    )}
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
