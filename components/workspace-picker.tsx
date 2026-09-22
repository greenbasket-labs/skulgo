"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Workspace = {
  membershipId: string;
  schoolId: string;
  schoolName: string;
  schoolAbbr: string;
  role: string;
};

export default function WorkspacePicker({ workspaces }: { workspaces: Workspace[] }) {
  const [busy, setBusy] = useState("");
  const router = useRouter();

  async function enter(membershipId: string) {
    setBusy(membershipId);
    const response = await fetch("/api/workspaces/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId }),
    });

    setBusy("");
    if (response.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="grid">
      {workspaces.map(workspace => (
        <button
          key={workspace.membershipId}
          className="card"
          style={{ textAlign: "left", cursor: "pointer" }}
          disabled={!!busy}
          onClick={() => enter(workspace.membershipId)}
        >
          <strong>{workspace.schoolName}</strong>
          <div className="muted">{workspace.schoolAbbr} · {workspace.role}</div>
          <div style={{ marginTop: 8 }}>{busy === workspace.membershipId ? "Opening…" : "Enter school"}</div>
        </button>
      ))}
    </div>
  );
}
