"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SupportReply({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch(`/api/support/threads/${threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-skulgo-owner": "1" },
      body: JSON.stringify({ message }),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error ?? "Could not send reply.");
    setMessage("");
    router.refresh();
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <strong>Reply</strong>
      <form onSubmit={submit} className="grid" style={{ marginTop: 10 }}>
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} required maxLength={5000} />
        {error && <p className="muted">{error}</p>}
        <button className="button" type="submit">Send reply</button>
      </form>
    </div>
  );
}
