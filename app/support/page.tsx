"use client";

import { useEffect, useState } from "react";

type SupportMessage = {
  id: string;
  body: string;
  senderType: string;
  createdAt: string;
  sender?: { name: string } | null;
};

type SupportThread = {
  id: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessage[];
};

export default function SupportPage() {
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  async function loadThreads(selectLatest = false) {
    try {
      const response = await fetch("/api/support/threads", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not load support.");
        return;
      }
      const next = Array.isArray(data.threads) ? data.threads : [];
      setThreads(next);
      if (selectLatest && next[0]) setActiveThreadId(next[0].id);
      if (!activeThreadId && next[0]) setActiveThreadId(next[0].id);
    } catch {
      setError("Could not connect to SkulGo Support.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadThreads();
    const timer = window.setInterval(() => void loadThreads(), 3000);
    return () => window.clearInterval(timer);
  }, [activeThreadId]);

  const activeThread = threads.find(thread => thread.id === activeThreadId) ?? null;

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!message.trim()) return;

    setSending(true);
    try {
      if (!activeThread) {
        if (!subject.trim()) {
          setError("Subject is required.");
          return;
        }
        const response = await fetch("/api/support/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, message }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Could not send your message.");
          return;
        }
        setSubject("");
        setMessage("");
        await loadThreads(true);
        return;
      }

      const response = await fetch("/api/support/threads/" + activeThread.id + "/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not send your message.");
        return;
      }
      setMessage("");
      await loadThreads();
    } catch {
      setError("Could not send your message. Please check your connection.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">SkulGo Support · Online</p>
        <h1>Talk to SkulGo Support</h1>
        <p className="muted">Ask SkulGo Support. The SkulGo Support Bot responds using the current product rules and school workflows.</p>
      </div>

      {loading ? <p className="muted">Loading support...</p> : (
        <div className="grid grid-2">
          <div className="card">
            <strong>Conversations</strong>
            {!threads.length ? (
              <p className="muted">No conversations yet.</p>
            ) : (
              <div className="grid" style={{ marginTop: 12 }}>
                {threads.map(thread => (
                  <button
                    key={thread.id}
                    className="button"
                    style={{ textAlign: "left" }}
                    aria-pressed={thread.id === activeThreadId}
                    onClick={() => setActiveThreadId(thread.id)}
                  >
                    <strong>{thread.subject}</strong>
                    <br />
                    <span className="muted">{thread.status} · {new Date(thread.updatedAt).toLocaleString()}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            {!activeThread ? (
              <>
                <strong>Start a conversation</strong>
                <form onSubmit={sendMessage} className="grid" style={{ marginTop: 14 }}>
                  <label>
                    Subject
                    <input value={subject} onChange={e => setSubject(e.target.value)} required maxLength={160} />
                  </label>
                  <label>
                    Message
                    <textarea value={message} onChange={e => setMessage(e.target.value)} required maxLength={5000} rows={7} />
                  </label>
                  <button className="button" type="submit" disabled={sending}>{sending ? "Sending..." : "Send message"}</button>
                </form>
              </>
            ) : (
              <>
                <strong>{activeThread.subject}</strong>
                <p className="muted">Live conversation · replies refresh automatically.</p>
                <div className="grid" style={{ margin: "16px 0" }}>
                  {activeThread.messages.map(item => (
                    <div
                      key={item.id}
                      className="card"
                      style={{ margin: 0, border: "1px solid var(--border)" }}
                    >
                      <strong>{item.senderType === "BOT" ? "🤖 SkulGo Support Bot" : item.sender?.name ?? "You"}</strong>
                      <p style={{ whiteSpace: "pre-wrap" }}>{item.body}</p>
                      <p className="muted">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <form onSubmit={sendMessage} className="grid">
                  <label>
                    Message
                    <textarea value={message} onChange={e => setMessage(e.target.value)} required maxLength={5000} rows={5} placeholder="Reply to SkulGo Support..." />
                  </label>
                  <button className="button" type="submit" disabled={sending}>{sending ? "Sending..." : "Send reply"}</button>
                </form>
              </>
            )}
            {error && <p className="muted">{error}</p>}
          </div>
        </div>
      )}
    </main>
  );
}
