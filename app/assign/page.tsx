"use client";

import { useEffect, useState } from "react";

type Teacher = { id: string; teacherCode: string; user: { name: string; email: string } };
type SchoolClass = { id: string; name: string; arm: string | null; section: { name: string } };
type Subject = { id: string; name: string };
type Assignment = {
  id: string;
  teacher: { user: { name: string; email: string }; teacherCode: string };
  class: { name: string; arm: string | null; section: { name: string } };
  subject: { name: string };
};
type ClassTeacher = {
  id: string;
  teacher: { user: { name: string }; teacherCode: string };
  class: { name: string; arm: string | null; section: { name: string } };
};

export default function AssignPage() {
  const [schoolId, setSchoolId] = useState("");
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classTeachers, setClassTeachers] = useState<ClassTeacher[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [masterTeacherId, setMasterTeacherId] = useState("");
  const [masterClassId, setMasterClassId] = useState("");
  const [message, setMessage] = useState("Loading...");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const me = await fetch("/api/auth/me");
      const meData = await me.json().catch(() => ({}));
      const id = meData?.user?.membership?.schoolId;

      if (!me.ok || !id || meData?.user?.membership?.role !== "ADMIN") {
        setMessage("Admin access required.");
        return;
      }

      setSchoolId(id);

      const [teachersR, classesR, assignmentsR, classTeachersR] = await Promise.all([
        fetch(`/api/schools/${id}/teachers`),
        fetch(`/api/schools/${id}/classes`),
        fetch(`/api/schools/${id}/assignments`),
        fetch(`/api/schools/${id}/class-teachers`),
      ]);

      const [teachersD, classesD, assignmentsD, classTeachersD] = await Promise.all([
        teachersR.json().catch(() => []),
        classesR.json().catch(() => []),
        assignmentsR.json().catch(() => []),
        classTeachersR.json().catch(() => []),
      ]);

      if (!teachersR.ok) throw new Error(teachersD?.error || "Unable to load teachers.");
      if (!classesR.ok) throw new Error(classesD?.error || "Unable to load classes.");
      if (!assignmentsR.ok) throw new Error(assignmentsD?.error || "Unable to load assignments.");
      if (!classTeachersR.ok) throw new Error(classTeachersD?.error || "Unable to load class teachers.");

      setTeachers(Array.isArray(teachersD) ? teachersD : []);
      setClasses(Array.isArray(classesD) ? classesD : []);
      setAssignments(Array.isArray(assignmentsD) ? assignmentsD : []);
      setClassTeachers(Array.isArray(classTeachersD) ? classTeachersD : []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load assignments.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function loadSubjects(targetClassId: string) {
    if (!schoolId || !targetClassId) {
      setSubjects([]);
      return;
    }

    const response = await fetch(
      `/api/schools/${schoolId}/class-subjects?classId=${targetClassId}`
    );
    const data = await response.json().catch(() => []);
    setSubjects(response.ok && Array.isArray(data) ? data.map((item: { subject: Subject }) => item.subject) : []);
  }

  useEffect(() => {
    void loadSubjects(classId);
  }, [classId, schoolId]);

  async function createAssignment() {
    if (!teacherId || !classId || !subjectId) {
      setMessage("Choose teacher, class and subject.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/schools/${schoolId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, classId, subjectId }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data?.error || "Assignment could not be saved.");

      setTeacherId("");
      setSubjectId("");
      setMessage("Teacher assignment saved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Assignment could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function setClassTeacher() {
    if (!masterTeacherId || !masterClassId) {
      setMessage("Choose a teacher and class for class-master responsibility.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(`/api/schools/${schoolId}/class-teachers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId: masterTeacherId, classId: masterClassId }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data?.error || "Class-master assignment failed.");

      setMessage("Class-master assignment saved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Class-master assignment failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">Admin</p>
        <h1>Assign</h1>
        <p>Connect approved teachers to the classes and subjects they handle.</p>
      </div>

      {message && <p role="status" className="muted">{message}</p>}

      <section className="card" style={{ marginBottom: 18 }}>
        <h2>Teacher → Class → Subject</h2>
        <div className="grid grid-2">
          <select value={teacherId} onChange={e => setTeacherId(e.target.value)}>
            <option value="">Choose teacher</option>
            {teachers.map(item => (
              <option key={item.id} value={item.id}>
                {item.user.name} · {item.teacherCode}
              </option>
            ))}
          </select>

          <select value={classId} onChange={e => { setClassId(e.target.value); setSubjectId(""); }}>
            <option value="">Choose class</option>
            {classes.map(item => (
              <option key={item.id} value={item.id}>
                {item.section.name} · {item.name}{item.arm ? ` · ${item.arm}` : ""}
              </option>
            ))}
          </select>

          <select value={subjectId} onChange={e => setSubjectId(e.target.value)}>
            <option value="">Choose subject</option>
            {subjects.map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </div>

        <button type="button" disabled={busy} onClick={() => void createAssignment()} style={{ marginTop: 12 }}>
          {busy ? "Saving..." : "Assign teacher"}
        </button>
      </section>

      <section className="card" style={{ marginBottom: 18 }}>
        <h2>Class master</h2>
        <div className="grid grid-2">
          <select value={masterTeacherId} onChange={e => setMasterTeacherId(e.target.value)}>
            <option value="">Choose teacher</option>
            {teachers.map(item => (
              <option key={item.id} value={item.id}>{item.user.name} · {item.teacherCode}</option>
            ))}
          </select>

          <select value={masterClassId} onChange={e => setMasterClassId(e.target.value)}>
            <option value="">Choose class</option>
            {classes.map(item => (
              <option key={item.id} value={item.id}>
                {item.section.name} · {item.name}{item.arm ? ` · ${item.arm}` : ""}
              </option>
            ))}
          </select>
        </div>

        <button type="button" disabled={busy} onClick={() => void setClassTeacher()} style={{ marginTop: 12 }}>
          Save class master
        </button>
      </section>

      <section className="card">
        <h2>Current assignments</h2>
        {!assignments.length ? (
          <p className="muted">No teacher assignments yet.</p>
        ) : (
          <div className="grid">
            {assignments.map(item => (
              <div key={item.id}>
                <strong>{item.teacher.user.name}</strong>
                <p className="muted">
                  {item.class.section.name} · {item.class.name}
                  {item.class.arm ? ` · ${item.class.arm}` : ""} · {item.subject.name}
                </p>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ marginTop: 18 }}>Current class masters</h2>
        {!classTeachers.length ? (
          <p className="muted">No class-master assignments yet.</p>
        ) : (
          <div className="grid">
            {classTeachers.map(item => (
              <div key={item.id}>
                <strong>{item.teacher.user.name}</strong>
                <p className="muted">
                  {item.class.section.name} · {item.class.name}
                  {item.class.arm ? ` · ${item.class.arm}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
