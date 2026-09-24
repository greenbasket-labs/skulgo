"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import WorkspaceUnlock from "@/components/workspace-unlock";

type Workspace = {
  membershipId: string;
  schoolId: string;
  schoolName: string;
  schoolAbbr: string;
  role: string;
};

export default function Login() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [pinConfigured, setPinConfigured] = useState(true);
  const router = useRouter();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))),
    });

    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || "Login failed");
      return;
    }

    const available = Array.isArray(data.workspaces) ? data.workspaces : [];
    setWorkspaces(available);

    if (available.length === 1) {
      const selected = await fetch("/api/workspaces/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId: available[0].membershipId }),
      });
      if (!selected.ok) {
        setMessage("Signed in, but the school workspace could not be opened.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function chooseWorkspace(membershipId: string, pin: string) {
    setBusy(true);
    setMessage("");

    const response = await fetch("/api/workspaces/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId, pin }),
    });

    setBusy(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setMessage(data.error || "Could not open workspace");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "40px auto" }}>
        <p className="muted">SkulGo</p>
        <h1>Sign in</h1>
        <p className="muted">
          Use your SkulGo account to continue to your available school workspaces.
        </p>

        {!workspaces.length ? (
          <form onSubmit={submit} className="grid">
            <label className="grid">
              <span>Email</span>
              <input required type="email" name="email" placeholder="Email" />
            </label>

            <label className="grid">
              <span>Password</span>
              <input required type="password" name="password" placeholder="Password" />
            </label>

            <button className="button" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : !pinConfigured ? (
          <div className="grid">
            <strong>Workspace PIN required</strong>
            <p className="muted">Set your 4-6 digit PIN in My Account before entering a school workspace.</p>
            <Link className="button" href="/account">Set workspace PIN →</Link>
          </div>
        ) : selectedWorkspace ? (
          <WorkspaceUnlock
            schoolName={selectedWorkspace.schoolName}
            onCancel={() => setSelectedWorkspace(null)}
            onUnlock={async pin => {
              const response = await fetch("/api/workspaces/select", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ membershipId: selectedWorkspace.membershipId, pin }),
              });
              const data = await response.json().catch(() => ({}));
              if (!response.ok) return { ok: false, error: data.error };
              router.push("/dashboard");
              router.refresh();
              return { ok: true };
            }}
          />
        ) : (
          <div className="grid">
            <strong>Choose school workspace</strong>
            {workspaces.map(workspace => (
              <button
                key={workspace.membershipId}
                className="button"
                disabled={busy}
                onClick={() => setSelectedWorkspace(workspace)}
              >
                {workspace.schoolName} · {workspace.role}
              </button>
            ))}
          </div>
        )}

        {message && <p>{message}</p>}

        {!workspaces.length && (
          <p className="muted" style={{ marginTop: 16 }}>
            <Link href="/forgot-password">Forgot password?</Link>
          </p>
        )}

        <div style={{ marginTop: 20 }} className="grid">
          <p className="muted">
            Need a personal account? <Link href="/signup">Create one</Link>
          </p>
          <p className="muted">
            Registering a school? <Link href="/register">Create a school</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
