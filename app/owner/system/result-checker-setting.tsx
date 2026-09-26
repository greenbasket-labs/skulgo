"use client";

import { useEffect, useState } from "react";

type Settings = {
  resultCheckerEnabled: boolean;
  resultUnlockFee: number;
};

export default function ResultCheckerSetting() {
  const [enabled, setEnabled] = useState(false);
  const [fee, setFee] = useState(200);
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/owner/platform-settings");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || "Could not load settings.");
        return;
      }
      setEnabled(data.resultCheckerEnabled === "true");
      setFee(Number(data.resultUnlockFee ?? 200));
      setMessage("");
    })();
  }, []);

  async function save() {
    setMessage("Saving...");
    const current = await fetch("/api/owner/platform-settings");
    const existing = await current.json().catch(() => ({}));
    const response = await fetch("/api/owner/platform-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        basicEnabled: existing.basicEnabled === "true",
        basicPrice: Number(existing.basicPrice ?? 5000),
        starterEnabled: existing.starterEnabled === "true",
        starterPrice: Number(existing.starterPrice ?? 10000),
        proEnabled: existing.proEnabled === "true",
        proPrice: Number(existing.proPrice ?? 20000),
        premiumEnabled: existing.premiumEnabled === "true",
        premiumPrice: Number(existing.premiumPrice ?? 28000),
        trialEnabled: existing.trialEnabled === "true",
        trialDays: Number(existing.trialDays ?? 14),
        resultUnlockEnabled: existing.resultUnlockEnabled !== "false",
        resultUnlockFee: fee,
        resultCheckerEnabled: enabled,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Saved." : data.error || "Could not save settings.");
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <h2>Result Checker</h2>
      <p className="muted">Keep the public checker hidden until you are ready to enable it.</p>
      <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
        <input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />
        <span>Enable Result Checker</span>
      </label>
      <label className="grid" style={{ marginTop: 12, maxWidth: 260 }}>
        <span>Result access fee</span>
        <input type="number" min="0" step="1" value={fee} onChange={event => setFee(Number(event.target.value))} />
      </label>
      <button className="button" type="button" onClick={() => void save()} style={{ marginTop: 12 }}>
        Save
      </button>
      {message && <p className="muted">{message}</p>}
    </div>
  );
}
