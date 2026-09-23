"use client";

import { useEffect, useState } from "react";
import { cacheRecord, readCachedRecord } from "@/lib/offline-queue";

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
    const load = async () => {
      const meKey = "skulgo-current-me";
      let me: { user?: { id?: string; membership?: { id?: string } | null } } | null = null;

      try {
        const meResponse = await fetch("/api/auth/me");
        const next = await meResponse.json().catch(() => ({}));
        if (meResponse.ok) {
          me = next;
          cacheRecord(meKey, next);
        }
      } catch {
        me = readCachedRecord<typeof me>(meKey);
      }

      if (!me) me = readCachedRecord<typeof me>(meKey);

      const userId = me?.user?.id;
      const membershipId = me?.user?.membership?.id;
      const scopeKey = userId && membershipId ? `${userId}:${membershipId}` : "";
      const cacheKey = scopeKey ? `skulgo:${scopeKey}:my-assignments` : "";

      try {
        const response = await fetch("/api/schools/current/my-assignments");
        const body = await response.json().catch(() => ({}));
        if (response.ok) {
          setData(body);
          if (cacheKey) cacheRecord(cacheKey, body);
          setMessage("");
          return;
        }
      } catch {
        // Use the last successful assignment snapshot below.
      }

      const cached = cacheKey ? readCachedRecord<Data>(cacheKey) : null;
      if (cached) {
        setData(cached);
        setMessage(navigator.onLine ? "" : "Showing the last saved assignments.");
        return;
      }

      setMessage("Teacher assignments are not available on this device yet.");
    };

    void load();
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
