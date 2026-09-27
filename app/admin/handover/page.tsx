"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const REASONS = [
  "Resignation",
  "Transfer",
  "Retirement",
  "Change of role",
  "End of appointment",
  "Administrative restructuring",
  "Other",
];

export default function AdminHandoverPage() {
  const [reason, setReason] = useState("");
  const [referralId, setReferralId] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const response = await fetch("/api/admin/handover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, referralId, note }),
    });
    const data = await response.json().catch(() => ({}));

    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "Could not complete handover.");
      return;
    }

    setMessage(`Admin handover completed. ${data.newAdminName} is now the school Admin.`);
    router.refresh();
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <div>
          <p className="muted">Admin</p>
          <h1>Admin Handover</h1>
          <p>Transfer this school workspace to another SkulGo account.</p>
        </div>
      </div>

      <section className="card" style={{ maxWidth: 680 }}>
        <p className="muted">
          The previous Admin keeps their personal SkulGo account. Their Admin access to this school ends after the handover.
        </p>

        <form onSubmit={submit} className="grid">
          <label className="grid">
            <span>Reason</span>
            <select required value={reason} onChange={e => setReason(e.target.value)}>
              <option value="" disabled>Select a reason</option>
              {REASONS.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>

          <label className="grid">
            <span>New Admin SkulGo Referral ID</span>
            <input
              required
              value={referralId}
              onChange={e => setReferralId(e.target.value)}
              placeholder="Enter Referral ID"
            />
            <span className="muted">
              If the person is already a member of this school, their existing membership will be used.
            </span>
          </label>

          <label className="grid">
            <span>Note (optional)</span>
            <textarea rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional explanation" />
          </label>

          <button className="button" disabled={busy}>
            {busy ? "Completing handover…" : "Confirm Admin Handover"}
          </button>
        </form>

        {message && <p role="status">{message}</p>}
      </section>
    </main>
  );
}
