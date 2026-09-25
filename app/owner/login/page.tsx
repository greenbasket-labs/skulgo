"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function OwnerLogin() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/owner-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData)),
    });
    const data = await response.json().catch(() => ({}));

    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || "Owner login failed.");
      return;
    }

    router.push("/owner");
    router.refresh();
  }

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "80px auto" }}>
        <p className="muted">SkulGo</p>
        <h1>Owner sign in</h1>
        <p className="muted">
          SkulGo Owner is a private desktop-only control area.
        </p>

        <form onSubmit={submit} className="grid">
          <label className="grid">
            <span>Owner email</span>
            <input required type="email" name="email" autoComplete="username" />
          </label>

          <label className="grid">
            <span>Password</span>
            <input required type="password" name="password" autoComplete="current-password" />
          </label>

          <button className="button" disabled={busy}>
            {busy ? "Signing in…" : "Sign in as Owner"}
          </button>
        </form>

        {message && <p>{message}</p>}
      </div>
    </main>
  );
}
