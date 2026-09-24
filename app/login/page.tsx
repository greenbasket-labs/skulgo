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
  const [verificationEmail, setVerificationEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [pinConfigured, setPinConfigured] = useState(true);
  const router = useRouter();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const form = e.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });

    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      if (data.emailVerificationRequired && data.email) {
        setVerificationEmail(data.email);
      }
      setMessage(data.error || "Login failed");
      return;
    }

    setVerificationEmail("");
    const available = Array.isArray(data.workspaces) ? data.workspaces : [];
    setWorkspaces(available);
    setPinConfigured(Boolean(data.pinConfigured));

    if (available.length === 1) {
      setSelectedWorkspace(available[0]);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  async function resendVerification() {
    if (!verificationEmail) return;
    setBusy(true);
    setMessage("");

    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: verificationEmail }),
    });
    const data = await response.json().catch(() => ({}));

    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "Could not send verification email.");
      return;
    }

    router.push("/verify-email?pending=1&email=" + encodeURIComponent(verificationEmail));
    router.refresh();
  }

  if (selectedWorkspace) {
    return (
      <main className="shell">
        <div className="card" style={{ maxWidth: 520, margin: "40px auto" }}>
          {!pinConfigured ? (
            <div className="grid">
              <p className="muted">SkulGo</p>
              <h1>Workspace PIN required</h1>
              <p className="muted">Set your 4-6 digit PIN in My Account before entering a school workspace.</p>
              <Link className="button" href="/account">Set workspace PIN →</Link>
            </div>
          ) : (
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
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "40px auto" }}>
        <p className="muted">SkulGo</p>
        <h1>Sign in</h1>
        <p className="muted">
          Use your SkulGo account to continue to your available school workspaces.
        </p>

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

        {message && <p>{message}</p>}

        {verificationEmail && (
          <div className="grid" style={{ marginTop: 12 }}>
            <p className="muted">Your email is not verified yet.</p>
            <button className="button" type="button" onClick={resendVerification} disabled={busy}>
              {busy ? "Sending…" : "Send verification OTP"}
            </button>
          </div>
        )}

        <p className="muted" style={{ marginTop: 16 }}>
          <Link href="/forgot-password">Forgot password?</Link>
        </p>

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
