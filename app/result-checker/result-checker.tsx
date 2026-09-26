"use client";

import { useState } from "react";

type Child = { id: string; name: string };

function money(value: number) {
  return "₦" + value.toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

export default function ResultChecker() {
  const [id, setId] = useState("");
  const [pin, setPin] = useState("");
  const [children, setChildren] = useState<Child[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [fee, setFee] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  async function check() {
    setBusy(true);
    setMessage("");
    setChecked(false);
    const response = await fetch("/api/result-checker/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pin }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || "Could not check result.");
      return;
    }

    const available = Array.isArray(data.children) ? data.children : [];
    setChildren(available);
    setSelected(available.length === 1 ? [available[0].id] : []);
    setFee(Number(data.feePerChild ?? 0));
    setChecked(true);
  }

  async function pay() {
    if (!selected.length) {
      setMessage("Select at least one result.");
      return;
    }

    setBusy(true);
    setMessage("");
    const response = await fetch("/api/result-checker/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pin, studentIds: selected }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || "Could not start payment.");
      return;
    }

    window.location.href = data.authorizationUrl;
  }

  function toggle(childId: string) {
    setSelected(current =>
      current.includes(childId) ? current.filter(id => id !== childId) : [...current, childId]
    );
  }

  function selectAll() {
    setSelected(selected.length === children.length ? [] : children.map(child => child.id));
  }

  const amount = fee * selected.length;

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">SkulGo</p>
        <h1>Result Checker</h1>
        <p className="muted">Check and print a published school result.</p>
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <label className="grid">
          <span>ID</span>
          <input value={id} onChange={event => setId(event.target.value)} autoComplete="username" />
        </label>

        <label className="grid" style={{ marginTop: 12 }}>
          <span>PIN</span>
          <input
            value={pin}
            onChange={event => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            type="password"
            autoComplete="current-password"
            maxLength={6}
          />
        </label>

        <button className="button" type="button" disabled={busy || !id || pin.length < 4} onClick={() => void check()} style={{ marginTop: 14 }}>
          {busy ? "Checking…" : "Check Result"}
        </button>

        {checked && children.length > 1 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <strong>Select result(s)</strong>
              <button className="button" type="button" onClick={selectAll} disabled={busy}>
                {selected.length === children.length ? "Clear all" : "Select all"}
              </button>
            </div>
            <div className="grid" style={{ marginTop: 10 }}>
              {children.map(child => (
                <label key={child.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="checkbox" checked={selected.includes(child.id)} onChange={() => toggle(child.id)} />
                  <span>{child.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {checked && children.length === 0 && (
          <p className="muted" style={{ marginTop: 16 }}>No published result is available.</p>
        )}

        {checked && children.length > 0 && (
          <div className="card" style={{ marginTop: 18 }}>
            <p className="muted">{selected.length} result{selected.length === 1 ? "" : "s"} selected</p>
            <strong>{money(amount)}</strong>
            <button className="button" type="button" disabled={busy || !selected.length} onClick={() => void pay()} style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>
              {busy ? "Opening payment…" : "Pay and View Result"}
            </button>
          </div>
        )}

        {message && <p className="muted" style={{ marginTop: 12 }}>{message}</p>}
      </div>
    </main>
  );
}
