"use client";

import { useEffect, useState } from "react";
import { starterClassNames } from "@/lib/class-catalog";

type SchoolClass = { id: string; name: string; arm: string | null };
type Section = { id: string; name: string; classes: SchoolClass[] };

const standardArms = [
  { value: "A", label: "Arm A" },
  { value: "B", label: "Arm B" },
  { value: "C", label: "Arm C" },
];

export default function ClassesPage() {
  const [schoolId, setSchoolId] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [customName, setCustomName] = useState("");
  const [customArm, setCustomArm] = useState("");
  const [armChoice, setArmChoice] = useState("");

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
      if (!selectedId && loaded.length) setSelectedId(loaded[0].id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const selected = sections.find(section => section.id === selectedId);
  const starterNames = selected ? starterClassNames(selected.name) : [];

  async function saveClass(name: string, arm: string) {
    if (!schoolId || !selected || !name.trim() || !arm.trim()) return;
    setSaving(`${name}-${arm}`);
    setMessage("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: selected.id, name: name.trim(), arm: arm.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Unable to save class arm.");

      setSections(current => current.map(section =>
        section.id === selected.id ? { ...section, classes: [...section.classes, data] } : section
      ));
      setMessage(`${name.trim()} — ${arm.trim()} saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save class arm.");
    } finally {
      setSaving("");
    }
  }

  async function removeClass(schoolClass: SchoolClass) {
    if (!schoolId) return;
    setMessage("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/classes/${schoolClass.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Unable to remove class arm.");

      setSections(current => current.map(section =>
        section.id === selectedId
          ? { ...section, classes: section.classes.filter(item => item.id !== schoolClass.id) }
          : section
      ));
      setMessage(`${schoolClass.name} ${schoolClass.arm ? `— ${schoolClass.arm}` : ""} removed.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove class arm.");
    }
  }

  async function saveCustomClass() {
    const arm = armChoice === "CUSTOM" ? customArm.trim() : armChoice;
    if (!customName.trim() || !arm) {
      setMessage("Enter a class name and choose or enter an arm.");
      return;
    }

    await saveClass(customName, arm);
    setCustomName("");
    setCustomArm("");
    setArmChoice("");
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <div>
          <p className="muted">Admin</p>
          <h1>Classes</h1>
          <p>Each arm is an independent class record.</p>
        </div>
      </div>

      {message && (
        <div role="status" style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: "#f3f4f6" }}>
          {message}
        </div>
      )}

      {loading ? <p>Loading...</p> : sections.length === 0 ? (
        <section className="workspace-card">
          <h2>No sections yet</h2>
          <p>Add a section first, then return here to configure its classes.</p>
        </section>
      ) : (
        <>
          <section className="workspace-card">
            <div className="workspace-card-header">
              <div><h2>Sections</h2><p>Classes belong to a saved section.</p></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {sections.map(section => (
                <button key={section.id} type="button" onClick={() => setSelectedId(section.id)} aria-pressed={selectedId === section.id}>
                  {section.name}
                </button>
              ))}
            </div>
          </section>

          {selected && (
            <section className="workspace-card" style={{ marginTop: 20 }}>
              <div className="workspace-card-header">
                <div><h2>{selected.name}</h2><p>Each arm can have its own class master, teachers, students, attendance and scores.</p></div>
              </div>

              {selected.classes.length === 0 ? <p>No class arms saved yet.</p> : (
                <div style={{ display: "grid", gap: 10 }}>
                  {selected.classes.map(schoolClass => (
                    <div key={schoolClass.id} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <strong>{schoolClass.name}{schoolClass.arm ? ` — ${schoolClass.arm}` : ""}</strong>
                      <button type="button" onClick={() => void removeClass(schoolClass)}>Remove</button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <input value={customName} onChange={event => setCustomName(event.target.value)} placeholder="Class name" aria-label="Class name" />
                <select value={armChoice} onChange={event => setArmChoice(event.target.value)} aria-label="Class arm">
                  <option value="">Choose arm</option>
                  {standardArms.map(arm => <option key={arm.value} value={arm.value}>{arm.label}</option>)}
                  <option value="CUSTOM">Custom arm...</option>
                </select>
                {armChoice === "CUSTOM" && (
                  <input
                    value={customArm}
                    onChange={event => setCustomArm(event.target.value)}
                    placeholder="e.g. Gold, Blue, Science"
                    aria-label="Custom arm name"
                  />
                )}
                <button type="button" onClick={() => void saveCustomClass()} disabled={!!saving}>Save Arm</button>
              </div>

              {starterNames.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p className="muted">Quick save for this section:</p>
                  <div style={{ display: "grid", gap: 8 }}>
                    {starterNames.map(name => (
                      <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <strong>{name}</strong>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {standardArms.map(arm => (
                            <button key={arm.value} type="button" disabled={!!saving} onClick={() => void saveClass(name, arm.value)}>
                              {saving === `${name}-${arm.value}` ? "Saving..." : `Save ${arm.label}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
