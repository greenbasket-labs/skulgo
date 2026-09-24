"use client";

import { FormEvent, useState } from "react";

type Props = {
  schoolName: string;
  onCancel?: () => void;
  onUnlock: (pin: string) => Promise<{ ok: boolean; error?: string; setupRequired?: boolean }>;
};

export default function WorkspaceUnlock({ schoolName, onCancel, onUnlock }: Props) {
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const result = await onUnlock(pin);
    setBusy(false);

    if (!result.ok) {
      setMessage(result.error || "Could not unlock workspace.");
      return;
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <strong>Unlock {schoolName}</strong>
      <p className="muted">Enter your 4-6 digit workspace PIN.</p>
      <form onSubmit={submit} className="grid" style={{ marginTop: 12 }}>
        <input
          required
          autoFocus
          inputMode="numeric"
          pattern="[0-9]{4,6}"
          minLength={4}
          maxLength={6}
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="Workspace PIN"
          autoComplete="current-password"
        />
        <button className="button" disabled={busy}>
          {busy ? "Unlocking…" : "Unlock workspace"}
        </button>
        {onCancel && (
          <button type="button" className="button" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
        )}
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
