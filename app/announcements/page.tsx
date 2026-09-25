"use client";

import { FormEvent, useEffect, useState } from "react";

type Announcement = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  audience: string;
};

type User = {
  membership: {
    schoolId: string;
    role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "CASHIER";
  } | null;
};

export default function AnnouncementsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("SCHOOL");
  const [message, setMessage] = useState("Loading...");
  const [saving, setSaving] = useState(false);

  async function load() {
    const me = await fetch("/api/auth/me");
    const data = await me.json().catch(() => ({ user: null }));

    if (!me.ok || !data.user?.membership) {
      setMessage("Open a school workspace first.");
      return;
    }

    setUser(data.user);

    const response = await fetch(
      `/api/schools/${data.user.membership.schoolId}/announcements`
    );
    const result = await response.json().catch(() => []);

    if (!response.ok) {
      setMessage(result.error || "Unable to load announcements.");
      return;
    }

    setItems(result);
    setMessage("");
  }

  useEffect(() => {
    void load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user?.membership) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/schools/${user.membership.schoolId}/announcements`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, body, audience }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setMessage(result.error || "Announcement could not be saved.");
        return;
      }

      setTitle("");
      setBody("");
      setAudience("SCHOOL");
      setMessage("Announcement posted.");
      await load();
    } catch {
      setMessage("Connection failed. Try again when the school is online.");
    } finally {
      setSaving(false);
    }
  }

  if (!user?.membership) {
    return <main className="workspace-main"><p className="muted">{message}</p></main>;
  }

  const admin = user.membership.role === "ADMIN";

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">School communication</p>
        <h1>Announcements</h1>
        <p className="muted">One message, shared with the school community.</p>
      </div>

      {message && <p role="status" className="muted">{message}</p>}

      {admin && (
        <form className="card" onSubmit={submit} style={{ marginBottom: 18 }}>
          <h2>New announcement</h2>
          <div className="grid">
            <input
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Title"
              required
            />
            <textarea
              value={body}
              onChange={event => setBody(event.target.value)}
              placeholder="Write the school message"
              rows={4}
              required
            />
            <select value={audience} onChange={event => setAudience(event.target.value)}>
              <option value="SCHOOL">Whole school</option>
              <option value="STAFF">Staff</option>
              <option value="TEACHER">Teachers</option>
              <option value="STUDENT">Students</option>
              <option value="PARENT">Parents</option>
              <option value="CASHIER">Cashiers</option>
            </select>
          </div>
          <button className="button" type="submit" disabled={saving}>
            {saving ? "Posting..." : "Post announcement"}
          </button>
        </form>
      )}

      {!items.length ? (
        <div className="card">
          <strong>No announcements yet.</strong>
        </div>
      ) : (
        <div className="grid">
          {items.map(item => (
            <article className="card" key={item.id}>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
              <p className="muted">{item.audience === "SCHOOL" ? "Whole school" : item.audience === "STAFF" ? "Staff" : item.audience === "TEACHER" ? "Teachers" : item.audience === "STUDENT" ? "Students" : item.audience === "PARENT" ? "Parents" : "Cashiers"}</p>
              <p className="muted">{new Date(item.createdAt).toLocaleString()}</p>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
