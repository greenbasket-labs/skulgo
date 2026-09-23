"use client";

import { useEffect, useState } from "react";

type SchoolClass = {
  id: string;
  name: string;
  arm: string | null;
  section: { name: string };
};

type ClassSubject = {
  id: string;
  subject: { id: string; name: string };
};

export default function SubjectsPage() {
  const [schoolId, setSchoolId] = useState("");
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [subjects, setSubjects] = useState<ClassSubject[]>([]);
  const [newSubject, setNewSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadClasses(id: string) {
    const response = await fetch(`/api/schools/${id}/classes`);
    const data = await response.json().catch(() => []);
    if (!response.ok) throw new Error(data?.error || "Unable to load classes.");
    setClasses(data);
    if (!selectedClassId && data.length) setSelectedClassId(data[0].id);
  }

  async function loadSubjects(id = selectedClassId) {
    if (!id || !schoolId) return;
    const response = await fetch(
      `/api/schools/${schoolId}/class-subjects?classId=${id}`
    );
    const data = await response.json().catch(() => []);
    if (!response.ok) throw new Error(data?.error || "Unable to load subjects.");
    setSubjects(data);
  }

  async function load() {
    setLoading(true);
    try {
      const me = await fetch("/api/auth/me");
      const data = await me.json();
      const id = data?.user?.membership?.schoolId;
      if (!id) throw new Error("No active school membership found.");
      setSchoolId(id);
      await loadClasses(id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load subjects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selectedClassId && schoolId) void loadSubjects(selectedClassId);
  }, [selectedClassId, schoolId]);

  async function saveStarterSubjects() {
    if (!selectedClassId || !schoolId) return;
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/schools/${schoolId}/class-subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClassId, seed: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Unable to save starter subjects.");
      setSubjects(data);
      setMessage("Starter subjects saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save subjects.");
    } finally {
      setSaving(false);
    }
  }

  async function addSubject() {
    const name = newSubject.trim();
    if (!name || !selectedClassId || !schoolId) return;
    setSaving(true);
    setMessage("");

    try {
      const subjectResponse = await fetch(`/api/schools/${schoolId}/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const subject = await subjectResponse.json().catch(() => ({}));

      let subjectId = subject?.id;
      if (!subjectId && subjectResponse.status === 409) {
        const listResponse = await fetch(`/api/schools/${schoolId}/subjects`);
        const list = await listResponse.json().catch(() => []);
        subjectId = list.find((item: { name: string }) => item.name === name)?.id;
      }

      if (!subjectId) throw new Error(subject?.error || "Unable to create subject.");

      const linkResponse = await fetch(`/api/schools/${schoolId}/class-subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: selectedClassId, subjectId }),
      });
      const link = await linkResponse.json().catch(() => ({}));

      if (!linkResponse.ok && linkResponse.status !== 409) {
        throw new Error(link?.error || "Unable to connect subject to class.");
      }

      setNewSubject("");
      setMessage("Subject saved.");
      await loadSubjects();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save subject.");
    } finally {
      setSaving(false);
    }
  }

  const selectedClass = classes.find(item => item.id === selectedClassId);

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">Admin</p>
        <h1>Subjects</h1>
        <p>Subjects belong to the school's classes and can be edited later.</p>
      </div>

      {message && <p role="status" className="muted">{message}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : !classes.length ? (
        <div className="card">
          <strong>No classes yet.</strong>
          <p className="muted">Create the school sections and classes first.</p>
        </div>
      ) : (
        <>
          <section className="card" style={{ marginBottom: 18 }}>
            <label className="grid">
              <span>Class</span>
              <select value={selectedClassId} onChange={event => setSelectedClassId(event.target.value)}>
                {classes.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.section.name} · {item.name}{item.arm ? ` · ${item.arm}` : ""}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="card" style={{ marginBottom: 18 }}>
            <h2>{selectedClass?.name} subjects</h2>
            <p className="muted">Starter subjects can be saved, then adjusted by Admin.</p>
            <button className="button" onClick={() => void saveStarterSubjects()} disabled={saving}>
              {saving ? "Saving..." : "Save Starter Subjects"}
            </button>
          </section>

          <section className="card">
            <h2>Saved subjects</h2>
            {!subjects.length ? (
              <p className="muted">No subjects connected to this class yet.</p>
            ) : (
              <div className="grid">
                {subjects.map(item => <div key={item.id}><strong>{item.subject.name}</strong></div>)}
              </div>
            )}

            <div style={{ marginTop: 18 }}>
              <input
                value={newSubject}
                onChange={event => setNewSubject(event.target.value)}
                placeholder="Add subject"
              />
              <button
                className="button"
                type="button"
                onClick={() => void addSubject()}
                disabled={!newSubject.trim() || saving}
                style={{ marginTop: 8 }}
              >
                Add Subject
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
