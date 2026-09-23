"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AccountWorkspace
      user={{
        name: user.name,
        email: user.email,
        teacher: user.teacher,
        student: user.student,
        memberships: user.memberships,
      }}
    />
  );
}

function AccountWorkspace({
  user,
}: {
  user: {
    name: string;
    email: string;
    teacher: { teacherCode: string } | null;
    student: { admissionId: string } | null;
    memberships: Array<{
      id: string;
      role: string;
      school: { name: string; abbr: string };
    }>;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");

  async function openSchool(membershipId: string) {
    setBusy(membershipId);

    const response = await fetch("/api/workspaces/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId }),
    });

    setBusy("");

    if (!response.ok) return;

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">Personal account</p>
        <h1>{user.name}</h1>
        <p className="muted">{user.email}</p>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <h2>My profile</h2>
        <p className="muted">
          This is your personal SkulGo profile. School records stay inside each
          school workspace.
        </p>
        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <div>
            <p className="muted">Name</p>
            <strong>{user.name}</strong>
          </div>
          <div>
            <p className="muted">Email</p>
            <strong>{user.email}</strong>
          </div>
          {user.teacher && (
            <div>
              <p className="muted">Teacher ID</p>
              <strong>{user.teacher.teacherCode}</strong>
            </div>
          )}
          {user.student && (
            <div>
              <p className="muted">Admission ID</p>
              <strong>{user.student.admissionId}</strong>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2>My schools</h2>
        {!user.memberships.length ? (
          <p className="muted">No school connection yet.</p>
        ) : (
          <div className="grid">
            {user.memberships.map(membership => (
              <button
                key={membership.id}
                type="button"
                className="card"
                disabled={busy === membership.id}
                onClick={() => openSchool(membership.id)}
                style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
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
    </main>
  );
}
