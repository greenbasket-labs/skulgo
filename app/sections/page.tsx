"use client";

import { FormEvent, useEffect, useState } from "react";

const SECTION_OPTIONS = [
  "Nursery",
  "Primary",
  "Junior Secondary",
  "Senior Secondary",
  "Custom",
];

type Section = {
  id: string;
  name: string;
};

export default function SectionsPage() {
  const [schoolId, setSchoolId] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [name, setName] = useState("");
  const [customName, setCustomName] = useState("");
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

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to load sections.");
      }

      setSections(Array.isArray(data) ? data : data?.sections ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function addSection(event: FormEvent) {
    event.preventDefault();

    const sectionName = (name === "Custom" ? customName : name).trim();
    if (!schoolId || !sectionName) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/schools/${schoolId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: sectionName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Unable to create section.");
      }

      setSections(current => [...current, data]);
      setName("");
      setCustomName("");
      setMessage(`${data.name} saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create section.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <div>
          <p className="muted">Admin</p>
          <h1>Sections</h1>
          <p>Create the sections that exist in this school.</p>
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

      <section className="workspace-card">
        <div className="workspace-card-header">
          <div>
            <h2>Add Section</h2>
            <p>Choose a section and save it.</p>
          </div>
        </div>

        <form onSubmit={addSection}>
          <label htmlFor="sectionName">Section</label>

          <select
            id="sectionName"
            value={name}
            onChange={event => setName(event.target.value)}
          >
            <option value="">Choose section</option>
            {SECTION_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          {name === "Custom" && (
            <input
              value={customName}
              onChange={event => setCustomName(event.target.value)}
              placeholder="Custom section name"
              style={{ marginTop: 8 }}
            />
          )}

          <button
            type="submit"
            disabled={!name || (name === "Custom" && !customName.trim()) || saving}
            style={{ marginTop: 12 }}
          >
            {saving ? "Saving..." : "Save Section"}
          </button>
        </form>
      </section>

      <section className="workspace-card" style={{ marginTop: 20 }}>
        <div className="workspace-card-header">
          <div>
            <h2>Saved Sections</h2>
            <p>Only sections are shown here.</p>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : sections.length === 0 ? (
          <p>No sections yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {sections.map(section => (
              <div
                key={section.id}
                style={{
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                }}
              >
                <strong>{section.name}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
