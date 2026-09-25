"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SupportPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/support/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, message }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error ?? "Could not send your message.");
    setSent(true);
    setSubject("");
    setMessage("");
    setTimeout(() => router.push("/dashboard"), 800);
  }

  return (
    <div className="card" style={{ maxWidth: 760 }}>
      <p className="muted">SkulGo Support</p>
      <h1>Talk to SkulGo Support</h1>
      <p className="muted">Send a message to the SkulGo team. We will reply here.</p>
      {sent ? <p><strong>Message sent.</strong></p> : (
        <form onSubmit={submit} className="grid" style={{ marginTop: 18 }}>
          <label>Subject<input value={subject} onChange={e => setSubject(e.target.value)} required maxLength={160} /></label>
          <label>Message<textarea value={message} onChange={e => setMessage(e.target.value)} required maxLength={5000} rows={7} /></label>
          {error && <p className="muted">{error}</p>}
          <button className="button" type="submit">Send message</button>
        </form>
      )}
    </div>
  );
}
