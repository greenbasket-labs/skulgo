"use client";

import { useEffect, useState } from "react";

type SchoolClass = {
  id: string;
  name: string;
  arm: string | null;
};

type Section = {
  id: string;
  name: string;
  classes: SchoolClass[];
};

const STARTER_CLASSES: Record<string, string[]> = {
  Nursery: ["Nursery 1", "Nursery 2", "Nursery 3"],
  Primary: ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"],
  "Junior Secondary": ["JSS 1", "JSS 2", "JSS 3"],
  "Senior Secondary": ["SS 1", "SS 2", "SS 3"],
};

export default function ClassesPage() {
  const [schoolId, setSchoolId] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");

    try {
      const me = await fetch("/api/auth/me");
      const meData = await me.json();
      if (!me.ok) throw new Error("Unable to load your account.");

      const id = meData?.user?.membership?.schoolId;
      if (!id) throw new Error("No active school membership found.");

      setSchoolId(id);

      const response = await fetch(`/api/schools/${id}/sections`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Unable to load sections.");

      const loaded = Array.isArray(data) ? data : data?.sections ?? [];
      setSections(loaded);

      if (!selectedId && loaded.length) {
        setSelectedId(loaded[0].id);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selected = sections.find(section => section.id === selectedId);
  const starterNames = selected ? STARTER_CLASSES[selected.name] ?? [] : [];

  async function saveStarterClasses() {
    if (!schoolId || !selected || starterNames.length === 0) return;

    setSaving(true);
    setMessage("");

    try {
      const results = await Promise.all(
        starterNames.map(name =>
          fetch(`/api/schools/${schoolId}/classes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sectionId: selected.id,
              name,
            }),
          })
        )
      );

      const failed = results.filter(response => !response.ok && response.status !== 409);
      if (failed.length) throw new Error("Unable to save the starter classes.");

      setMessage(`${selected.name} classes saved.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save classes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <div>
          <p className="muted">Admin</p>
          <h1>Classes</h1>
          <p>Choose a saved section and manage its classes.</p>
        </div>
      </div>

      {message && (
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: "#f3f4f6",
          }}
        >
          {message}
        </div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : sections.length === 0 ? (
        <section className="workspace-card">
          <h2>No sections yet</h2>
          <p>Add a section first, then return here to configure its classes.</p>
        </section>
      ) : (
        <>
          <section className="workspace-card">
            <div className="workspace-card-header">
              <div>
                <h2>Sections</h2>
                <p>Classes belong to a saved section.</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {sections.map(section => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setSelectedId(section.id)}
                  aria-pressed={selectedId === section.id}
                >
                  {section.name}
                </button>
              ))}
            </div>
          </section>

          {selected && (
            <section className="workspace-card" style={{ marginTop: 20 }}>
              <div className="workspace-card-header">
                <div>
                  <h2>{selected.name}</h2>
                  <p>Only classes are managed here.</p>
                </div>
              </div>

              {selected.classes.length === 0 ? (
                <p>No classes yet.</p>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {selected.classes.map(schoolClass => (
                    <div
                      key={schoolClass.id}
                      style={{
                        padding: 12,
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                      }}
                    >
                      <strong>{schoolClass.name}</strong>
                      {schoolClass.arm ? <span> — Arm {schoolClass.arm}</span> : null}
                    </div>
                  ))}
                </div>
              )}

              {starterNames.length > 0 && (
                <button
                  type="button"
                  onClick={saveStarterClasses}
                  disabled={saving}
                  style={{ marginTop: 16 }}
                >
                  {saving ? "Saving..." : "Save Starter Classes"}
                </button>
              )}

              {starterNames.length === 0 && (
                <p style={{ marginTop: 16 }}>
                  This section has no automatic starter list. Add its classes manually.
                </p>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
