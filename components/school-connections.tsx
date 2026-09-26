"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WorkspaceUnlock from "@/components/workspace-unlock";

type Membership = {
  id: string;
  role: string;
  school: { id: string; name: string; abbr: string };
};

export default function SchoolConnections({ memberships }: { memberships: Membership[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [selected, setSelected] = useState<Membership | null>(null);

  async function openSchool(membershipId: string, pin: string) {
    setBusy(membershipId);
    try {
      const response = await fetch("/api/workspaces/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId, pin }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) return { ok: false, error: data.error || "Could not unlock workspace." };
      router.push("/dashboard");
      router.refresh();
      return { ok: true };
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="card">
      <h2>My school workspaces</h2>
      {!memberships.length ? (
        <p className="muted">No school connection yet.</p>
      ) : (
        <div className="grid">
          {memberships.map(membership => (
            <div key={membership.id}>
              <button
                type="button"
                className="card"
                disabled={Boolean(busy)}
                onClick={() => setSelected(membership)}
                style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                aria-label={"Open " + membership.school.name + " workspace"}
              >
                <strong>{membership.school.name}</strong>
                <p className="muted">{membership.school.abbr} · {membership.role}</p>
                <p className="muted">Open school workspace →</p>
              </button>
              {selected?.id === membership.id && (
                <WorkspaceUnlock
                  schoolName={membership.school.name}
                  onCancel={() => setSelected(null)}
                  onUnlock={(pin) => openSchool(membership.id, pin)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
