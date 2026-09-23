"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Membership = {
  id: string;
  role: string;
  school: { id: string; name: string; abbr: string };
};

export default function SchoolConnections({ memberships }: { memberships: Membership[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState("");

  async function openSchool(membershipId: string) {
    setBusy(membershipId);
    try {
      const response = await fetch("/api/workspaces/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });

      if (!response.ok) return;
      router.push("/dashboard");
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="card">
      <h2>My schools</h2>
      {!memberships.length ? (
        <p className="muted">No school connection yet.</p>
      ) : (
        <div className="grid">
          {memberships.map(membership => (
            <button
              key={membership.id}
              type="button"
              className="card"
              disabled={busy === membership.id}
              onClick={() => void openSchool(membership.id)}
              style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
              aria-label={"Open " + membership.school.name}
            >
              <strong>{membership.school.name}</strong>
              <p className="muted">
                {membership.school.abbr} · {membership.role}
              </p>
              <p className="muted">
                {busy === membership.id ? "Opening school…" : "Open school workspace →"}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
