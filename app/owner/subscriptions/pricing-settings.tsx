"use client";

import { useEffect, useState } from "react";

type Settings = {
  monthlyEnabled: boolean;
  monthlyPrice: number;
  termEnabled: boolean;
  termPrice: number;
  yearlyEnabled: boolean;
  yearlyPrice: number;
  trialEnabled: boolean;
  trialDays: number;
  resultUnlockEnabled: boolean;
  resultUnlockFee: number;
};

const initial: Settings = {
  monthlyEnabled: true,
  monthlyPrice: 0,
  termEnabled: true,
  termPrice: 0,
  yearlyEnabled: true,
  yearlyPrice: 0,
  trialEnabled: true,
  trialDays: 14,
  resultUnlockEnabled: true,
  resultUnlockFee: 200,
};

export default function PlatformPricingSettings() {
  const [settings, setSettings] = useState<Settings>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/owner/platform-settings")
      .then((response) => response.json())
      .then((data) => {
        setSettings({
          monthlyEnabled: data.monthlyEnabled === "true",
          monthlyPrice: Number(data.monthlyPrice),
          termEnabled: data.termEnabled === "true",
          termPrice: Number(data.termPrice),
          yearlyEnabled: data.yearlyEnabled === "true",
          yearlyPrice: Number(data.yearlyPrice),
          trialEnabled: data.trialEnabled === "true",
          trialDays: Number(data.trialDays),
          resultUnlockEnabled: data.resultUnlockEnabled === "true",
          resultUnlockFee: Number(data.resultUnlockFee),
        });
      })
      .finally(() => setLoading(false));
  }, []);

  function setNumber(key: keyof Settings, value: string) {
    setSettings((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/owner/platform-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await response.json().catch(() => null);
    setSaving(false);
    setMessage(response.ok ? "Saved." : data?.error ?? "Could not save settings.");
  }

  if (loading) return <div className="card"><p className="muted">Loading platform settings…</p></div>;

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div className="workspace-header">
        <div>
          <p className="muted">SkulGo Owner</p>
          <h2>Platform Pricing & Access</h2>
          <p>Set plan prices, enable or disable plans, and control the free trial and result unlock fee.</p>
        </div>
      </div>

      <div className="grid grid-2">
        {[
          ["Monthly", "monthlyEnabled", "monthlyPrice"],
          ["Term", "termEnabled", "termPrice"],
          ["Yearly", "yearlyEnabled", "yearlyPrice"],
        ].map(([label, enabledKey, priceKey]) => (
          <div className="card" key={label}>
            <strong>{label} plan</strong>
            <p><label><input type="checkbox" checked={Boolean(settings[enabledKey as keyof Settings])} onChange={(e) => setSettings((s) => ({ ...s, [enabledKey]: e.target.checked }))} /> Enabled</label></p>
            <label>Price (₦)<input type="number" min="0" step="1" value={Number(settings[priceKey as keyof Settings])} onChange={(e) => setNumber(priceKey as keyof Settings, e.target.value)} /></label>
          </div>
        ))}

        <div className="card">
          <strong>Free trial</strong>
          <p><label><input type="checkbox" checked={settings.trialEnabled} onChange={(e) => setSettings((s) => ({ ...s, trialEnabled: e.target.checked }))} /> Enabled</label></p>
          <label>Trial days<input type="number" min="0" step="1" value={settings.trialDays} onChange={(e) => setNumber("trialDays", e.target.value)} /></label>
          <p className="muted">Default: 14 days. You can increase or reduce it.</p>
        </div>

        <div className="card">
          <strong>Result unlock</strong>
          <p><label><input type="checkbox" checked={settings.resultUnlockEnabled} onChange={(e) => setSettings((s) => ({ ...s, resultUnlockEnabled: e.target.checked }))} /> Enabled</label></p>
          <label>Unlock fee (₦)<input type="number" min="0" step="1" value={settings.resultUnlockFee} onChange={(e) => setNumber("resultUnlockFee", e.target.value)} /></label>
        </div>
      </div>

      <button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save settings"}</button>
      {message && <p className="muted">{message}</p>}
    </div>
  );
}
