"use client";

import { FormEvent, useState } from "react";

export default function WorkspacePin({ configured }: { configured: boolean }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const response = await fetch("/api/account/pin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, confirmPin }),
    });
    const data = await response.json().catch(() => ({}));

    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "Could not save PIN.");
      return;
    }

    setPin("");
    setConfirmPin("");
    setMessage(configured ? "School workspace PIN updated." : "Workspace PIN created.");
  }

  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <h2>Workspace PIN</h2>
      <p className="muted">
        {configured
          ? "Your account password signs you in. Your 4–6 digit PIN unlocks a school workspace."
          : "Set a 4-6 digit PIN. You will need it before entering a school workspace."}
      </p>
      <form onSubmit={save} className="grid" style={{ marginTop: 16, maxWidth: 420 }}>
        <label className="grid">
          <span>{configured ? "New PIN" : "PIN"}</span>
          <input
            required
            inputMode="numeric"
            pattern="[0-9]{4,6}"
            minLength={4}
            maxLength={6}
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="4-6 digits"
            autoComplete="new-password"
          />
        </label>
        <label className="grid">
          <span>Confirm PIN</span>
          <input
            required
            inputMode="numeric"
            pattern="[0-9]{4,6}"
            minLength={4}
            maxLength={6}
            type="password"
            value={confirmPin}
            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Repeat PIN"
            autoComplete="new-password"
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : configured ? "Change PIN" : "Create PIN"}
        </button>
      </form>
      {message && <p>{message}</p>}
    </section>
  );
}
