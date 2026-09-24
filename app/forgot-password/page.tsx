"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    setMessage(data.message || data.error || "Check your email.");
  }

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "40px auto" }}>
        <p className="muted">SkulGo</p>
        <h1>Forgot password</h1>
        <p className="muted">Enter your account email and we’ll send a reset link.</p>
        <form onSubmit={submit} className="grid">
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
          <button className="button" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
        </form>
        {message && <p>{message}</p>}
        <p className="muted" style={{ marginTop: 16 }}>
          <a href="/login">Back to sign in</a>
        </p>
      </div>
    </main>
  );
}
