"use client";

import { useState } from "react";

export default function AccountIdCopy({ accountId }: { accountId: string }) {
  const [status, setStatus] = useState("");

  async function copyAccountId() {
    try {
      await navigator.clipboard.writeText(accountId);
      setStatus("Copied");
    } catch {
      setStatus("Could not copy");
    }
  }

  return (
    <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <strong>{accountId}</strong>
      <button type="button" className="button" onClick={copyAccountId}>
        Copy
      </button>
      {status && <span className="muted">{status}</span>}
    </div>
  );
}
