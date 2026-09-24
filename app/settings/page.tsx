"use client";

import { useEffect, useState } from "react";

type Band = { min: number; grade: string };

type Settings = {
  resultHeading: string;
  firstTermLabel: string;
  secondTermLabel: string;
  thirdTermLabel: string;
  resultUnlockPrice: number;
  digitalResultEnabled: boolean;
  showPosition: boolean;
  showAttendance: boolean;
  showTeacherRemark: boolean;
  showPrincipalRemark: boolean;
  showSubjectBreakdown: boolean;
  showTotal: boolean;
  showGrade: boolean;
  showPercentage: boolean;
  showStudentName: boolean;
  showAdmissionId: boolean;
  showClass: boolean;
  attendanceSessions: "MORNING" | "MORNING_AFTERNOON";
};

const DEFAULT_SETTINGS: Settings = {
  resultHeading: "Student Report Card",
  firstTermLabel: "First Term",
  secondTermLabel: "Second Term",
  thirdTermLabel: "Third Term",
  resultUnlockPrice: 200,
  digitalResultEnabled: true,
  showPosition: true,
  showAttendance: true,
  showTeacherRemark: true,
  showPrincipalRemark: true,
  showSubjectBreakdown: true,
  showTotal: true,
  showGrade: true,
  showPercentage: true,
  showStudentName: true,
  showAdmissionId: true,
  showClass: true,
  attendanceSessions: "MORNING",
};

const DEFAULT_BANDS: Band[] = [
  { min: 70, grade: "A" },
  { min: 60, grade: "B" },
  { min: 50, grade: "C" },
  { min: 45, grade: "D" },
  { min: 40, grade: "E" },
  { min: 0, grade: "F" },
];

const fields: [keyof Settings, string][] = [
  ["showStudentName", "Student name"],
  ["showAdmissionId", "Admission ID"],
  ["showClass", "Class"],
  ["showSubjectBreakdown", "Subject breakdown"],
  ["showTotal", "Total"],
  ["showPercentage", "Percentage"],
  ["showGrade", "Grade"],
  ["showPosition", "Position"],
  ["showAttendance", "Attendance"],
  ["showTeacherRemark", "Teacher remark"],
  ["showPrincipalRemark", "Principal remark"],
];

export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [bands, setBands] = useState(DEFAULT_BANDS);
  const [schoolId, setSchoolId] = useState("");
  const [message, setMessage] = useState("Loading...");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    try {
      const me = await fetch("/api/auth/me");
      const meData = await me.json();
      const id = meData?.user?.membership?.schoolId;
      if (!id) throw new Error("Open a school workspace first.");
      if (meData?.user?.membership?.role !== "ADMIN") throw new Error("Admin access required.");
      setSchoolId(id);

      const response = await fetch(`/api/schools/${id}/settings`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Unable to load settings.");
      setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      setBands(Array.isArray(data.gradingBands) ? data.gradingBands : DEFAULT_BANDS);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load settings.");
    }
  }

  function updateBand(index: number, field: keyof Band, value: string) {
    setBands(current => current.map((band, i) =>
      i === index
        ? { ...band, [field]: field === "min" ? Number(value) : value.toUpperCase() }
        : band
    ));
  }

  async function save() {
    if (!schoolId) return;
    setSaving(true);
    setMessage("");

    const response = await fetch(`/api/schools/${schoolId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings, gradingBands: bands }),
    });
    const data = await response.json().catch(() => ({}));

    setSaving(false);
    if (!response.ok) {
      setMessage(data?.error || "Unable to save settings.");
      return;
    }

    setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    setBands(data.gradingBands);
    setMessage("School result settings saved.");
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <div>
          <p className="muted">Admin</p>
          <h1>Result Settings</h1>
          <p>School-owned defaults for report cards and grading.</p>
        </div>
      </div>

      {message && <p className="muted" role="status">{message}</p>}

      <section className="card">
        <h2>Attendance settings</h2>
        <p className="muted">Choose whether the school records attendance once in the morning or twice each day.</p>
        <label className="grid">
          <span>Attendance sessions</span>
          <select value={settings.attendanceSessions} onChange={e => setSettings(s => ({ ...s, attendanceSessions: e.target.value as Settings["attendanceSessions"] }))}>
            <option value="MORNING">Morning only</option>
            <option value="MORNING_AFTERNOON">Morning + Afternoon</option>
          </select>
        </label>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Report-card settings</h2>
        <div className="grid">
          <input value={settings.resultHeading} onChange={e => setSettings(s => ({ ...s, resultHeading: e.target.value }))} placeholder="Report-card heading" />
          <div className="grid grid-2">
            <input value={settings.firstTermLabel} onChange={e => setSettings(s => ({ ...s, firstTermLabel: e.target.value }))} placeholder="First term label" />
            <input value={settings.secondTermLabel} onChange={e => setSettings(s => ({ ...s, secondTermLabel: e.target.value }))} placeholder="Second term label" />
          </div>
          <input value={settings.thirdTermLabel} onChange={e => setSettings(s => ({ ...s, thirdTermLabel: e.target.value }))} placeholder="Third term label" />
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Result unlock</h2>
        <p className="muted">SkulGo controls the unlock feature. The school only sets the amount charged to view its published result.</p>
        <input
          inputMode="decimal"
          value={settings.resultUnlockPrice}
          onChange={e => setSettings(s => ({ ...s, resultUnlockPrice: Number(e.target.value) }))}
          placeholder="Unlock price"
        />
        <p className="muted">Current price: ₦{settings.resultUnlockPrice.toLocaleString("en-NG")}</p>
        <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={settings.digitalResultEnabled}
            onChange={e => setSettings(s => ({ ...s, digitalResultEnabled: e.target.checked }))}
          />
          Digital result available after unlock
        </label>
        <p className="muted">Feature owner: SkulGo</p>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Report-card fields</h2>
        <div className="grid">
          {fields.map(([field, label]) => (
            <label key={String(field)} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={Boolean(settings[field])}
                onChange={e => setSettings(s => ({ ...s, [field]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Grading bands</h2>
        <p className="muted">Default bands are ready. A school can adjust the minimum score and grade label.</p>
        <div className="grid">
          {bands.map((band, index) => (
            <div className="grid grid-2" key={index}>
              <input
                type="number"
                min="0"
                max="100"
                value={band.min}
                onChange={e => updateBand(index, "min", e.target.value)}
                placeholder="Minimum score"
              />
              <input
                value={band.grade}
                onChange={e => updateBand(index, "grade", e.target.value)}
                placeholder="Grade"
              />
            </div>
          ))}
        </div>
      </section>

      <button className="button" style={{ marginTop: 18 }} onClick={() => void save()} disabled={saving}>
        {saving ? "Saving..." : "Save Result Settings"}
      </button>
    </main>
  );
}
