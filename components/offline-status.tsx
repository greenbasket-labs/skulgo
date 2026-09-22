"use client";

import { useEffect, useState } from "react";
import { queuedCount, startOfflineSync } from "@/lib/offline-queue";

export default function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setOnline(navigator.onLine);
    setPending(queuedCount());

    startOfflineSync(result => setPending(result.remaining));

    const onOnline = async () => {
      setOnline(true);
      setPending(queuedCount());
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
