"use client";

import { useEffect, useState } from "react";

type Assignment = {
  id: string;
  class: { name: string; arm?: string | null; section: { name: string } };
  subject: { id: string; name: string };
};

type Data = {
  teacher: { teacherCode: string };
  assignments: Assignment[];
};

export default function MySubjects() {
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch("/api/schools/current/my-assignments")
      .then(async response => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Could not load assignments");
        return body as Data;
      })
      .then(body => {
        setData(body);
        setMessage("");
      })
      .catch(error => setMessage(error.message));
  }, []);

  if (!data) {
    return (
      <main className="workspace-main">
        <p className="muted">{message}</p>
      </main>
    );
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">Teacher workspace</p>
        <h1>My Subjects</h1>
        <p className="muted">Teacher ID: {data.teacher.teacherCode}</p>
      </div>

      {!data.assignments.length && (
        <div className="card">
          <strong>No subject assignment yet.</strong>
          <p className="muted">Your school Admin can assign your class and subject.</p>
        </div>
      )}

      <div className="grid">
        {data.assignments.map(item => (
          <div className="card" key={item.id}>
            <strong>{item.subject.name}</strong>
            <p className="muted">
              {item.class.section.name} · {item.class.name}
              {item.class.arm ? " · " + item.class.arm : ""}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
