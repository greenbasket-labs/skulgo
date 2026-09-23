"use client";

import { useEffect, useState } from "react";
import { cacheRecord, readCachedRecord } from "@/lib/offline-queue";

type Child = {
  id: string;
  admissionId: string;
  firstName: string;
  lastName: string;
  class?: { name: string; arm?: string | null; section?: { name: string } } | null;
};

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [message, setMessage] = useState("Loading…");

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
      const cacheKey = scopeKey ? `skulgo:${scopeKey}:children` : "";

      try {
        const response = await fetch("/api/schools/current/children");
        const data = await response.json().catch(() => []);
        if (response.ok) {
          const next = Array.isArray(data) ? data : [];
          setChildren(next);
          if (cacheKey) cacheRecord(cacheKey, next);
          setMessage(next.length ? "" : "No approved children are connected yet.");
          return;
        }
      } catch {
        // Use the last successful child snapshot below.
      }

      const cached = cacheKey ? readCachedRecord<Child[]>(cacheKey) : null;
      if (cached) {
        setChildren(cached);
        setMessage(navigator.onLine ? (cached.length ? "" : "No approved children are connected yet.") : "Showing the last saved children.");
        return;
      }

      setMessage("Children are not available on this device yet.");
    };

    void load();
  }, []);

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 800, margin: "0 auto" }}>
        <p className="muted">Parent workspace</p>
        <h1>My Children</h1>

        {!children.length && <p className="muted">{message}</p>}

        <div className="grid">
          {children.map(child => (
            <div className="card" key={child.id}>
              <strong>{child.firstName} {child.lastName}</strong>
              <p className="muted">Admission ID: {child.admissionId}</p>
              <p>
                {child.class?.section?.name ? child.class.section.name + " · " : ""}
                {child.class?.name || "Class not assigned"}
                {child.class?.arm ? " · " + child.class.arm : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
