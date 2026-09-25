"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function Register() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    const form = e.currentTarget;
    const password = String(new FormData(form).get("password") ?? "");
    const confirmPassword = String(new FormData(form).get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setBusy(false);
      setMessage("Passwords do not match");
      return;
    }

    const response = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });

    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error ?? "Could not create account");
      return;
    }

    router.push("/verify-email?pending=1&email=" + encodeURIComponent(data.email));
    router.refresh();
  }

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "40px auto" }}>
        <p className="muted">SkulGo</p>
        <h1>Create your personal account</h1>
        <p className="muted">
          Use one personal account for your school connections. We’ll send a verification link to your email.
        </p>

        <form onSubmit={submit} className="grid">
          <label className="grid">
            <span>Full name</span>
            <input required name="name" placeholder="Full name" />
          </label>

          <label className="grid">
            <span>Email</span>
            <input required type="email" name="email" placeholder="Email" />
          </label>

          <label className="grid">
            <span>Password</span>
            <input required minLength={8} type="password" name="password" placeholder="Password" />
          </label>

          <label className="grid">
            <span>Referral ID <span className="muted">(optional)</span></span>
            <input name="referralCode" placeholder="e.g. SKG100-001" />
          </label>

          <label className="grid">
            <span>Confirm password</span>
            <input
              required
              minLength={8}
              type="password"
              name="confirmPassword"
              placeholder="Confirm password"
            />
          </label>

          <button className="button" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        {message && <p>{message}</p>}
        <p className="muted" style={{ marginTop: 16 }}>
          Already have an account? <a href="/login">Sign in</a>
        </p>
      </div>
    </main>
  );
}
