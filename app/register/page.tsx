"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage("");
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const response = await fetch("/api/schools", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const result = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setMessage(result.error ?? "Registration failed"); return; }
    router.push("/dashboard");
    router.refresh();
  }

  return <main className="shell"><div className="card" style={{ maxWidth: 600, margin: "40px auto" }}>
    <h1>Register your school</h1>
    <p className="muted">SkulGo creates the basic school structure automatically and signs the principal in.</p>
    <form onSubmit={submit} className="grid">
      <input required name="name" placeholder="School name" />
      <input required name="abbr" placeholder="School abbreviation" />
      <input required name="address" placeholder="Address" />
      <input required name="phone" placeholder="Phone" />
      <input required type="email" name="email" placeholder="School email" />
      <input required name="adminName" placeholder="Principal/Admin name" />
      <input required type="email" name="adminEmail" placeholder="Principal/Admin email" />
      <input required type="password" name="password" placeholder="Password" />
      <button className="button" disabled={busy} type="submit">{busy ? "Creating…" : "Create school"}</button>
    </form>
    {message && <p>{message}</p>}
  </div></main>;
}
