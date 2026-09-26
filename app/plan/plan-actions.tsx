"use client";

import { useState } from "react";

export default function PlanActions({ status, schoolId }: { status: string; schoolId: string }) {
  const [current, setCurrent] = useState(status);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function change(action: "PAUSE" | "RESUME") {
    setBusy(true);
    setMessage("");
    const response = await fetch(window.location.pathname.replace(/\/plan$/, "") + "/plan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "Could not update the plan.");
      return;
    }
    setCurrent(data.subscription.status);
    setMessage(action === "PAUSE" ? "Plan paused." : "Plan resumed.");
  }

  if (current !== "ACTIVE" && current !== "PAUSED") {
    return message ? <p className="muted">{message}</p> : null;
  }

  return (
    <div>
      <button
        className="button"
        type="button"
        disabled={busy}
        onClick={() => void change(current === "ACTIVE" ? "PAUSE" : "RESUME")}
      >
        {busy ? "Saving…" : current === "ACTIVE" ? "Pause plan" : "Resume plan"}
      </button>
      {message && <p className="muted">{message}</p>}
    </div>
  );
}
