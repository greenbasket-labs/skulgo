"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setMessage(result.error ?? "Login failed"); return; }
    router.push(search.get("next") || "/dashboard");
    router.refresh();
  }

  return <main className="shell"><div className="card" style={{maxWidth:520,margin:"40px auto"}}>
    <p className="muted">SkulGo</p>
    <h1>Login</h1>
    <p className="muted">Use your school email to select the school.</p>
    <form onSubmit={submit} className="grid">
      <input required type="email" name="schoolEmail" placeholder="School email" />
      <input required type="email" name="email" placeholder="Your email" />
      <input required type="password" name="password" placeholder="Password" />
      <button className="button" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
    {message && <p>{message}</p>}
  </div></main>;
}
