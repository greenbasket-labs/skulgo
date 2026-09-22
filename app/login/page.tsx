"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
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
