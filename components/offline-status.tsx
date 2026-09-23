"use client";

import { useEffect, useState } from "react";
import { cacheRecord, queuedCount, readCachedRecord, startOfflineSync } from "@/lib/offline-queue";

export default function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let scopeKey = "";

    const loadScope = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json().catch(() => ({}));
        const userId = data?.user?.id;
        const membershipId = data?.user?.membership?.id;
        scopeKey = userId && membershipId ? `${userId}:${membershipId}` : "";
        if (response.ok) cacheRecord("skulgo-current-me", data);
      } catch {
        const cached = readCachedRecord<{ user?: { id?: string; membership?: { id?: string } | null } }>("skulgo-current-me");
        const userId = cached?.user?.id;
        const membershipId = cached?.user?.membership?.id;
        scopeKey = userId && membershipId ? `${userId}:${membershipId}` : "";
      }

      setPending(scopeKey ? queuedCount(scopeKey) : 0);

      if (scopeKey) {
        startOfflineSync(scopeKey, result => setPending(result.remaining));
      }
    };

    setOnline(navigator.onLine);
    void loadScope();

    const onOnline = async () => {
      setOnline(true);
      if (scopeKey) setPending(queuedCount(scopeKey));
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        right: 12,
        bottom: 12,
        zIndex: 50,
        padding: "7px 10px",
        border: "1px solid #e5e7eb",
        borderRadius: 999,
        background: "#fff",
        fontSize: 12,
      }}
    >
      <strong>{online ? "Online" : "Offline"}</strong>
      {pending > 0 && <span className="muted"> · {pending} waiting to sync</span>}
    </div>
  );
}
