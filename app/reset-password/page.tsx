"use client";

import { FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(e.currentTarget);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password: form.get("password"),
        confirmPassword: form.get("confirmPassword"),
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "Could not reset password.");
      return;
    }
    setDone(true);
    setMessage("Password reset successfully.");
  }

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "40px auto" }}>
        <p className="muted">SkulGo</p>
        <h1>Reset password</h1>
        {!token && <p>Invalid or missing reset link.</p>}
        {token && !done && (
          <form onSubmit={submit} className="grid">
            <input required minLength={8} type="password" name="password" placeholder="New password" />
            <input required minLength={8} type="password" name="confirmPassword" placeholder="Confirm password" />
            <button className="button" disabled={busy}>{busy ? "Saving…" : "Reset password"}</button>
          </form>
        )}
        {message && <p>{message}</p>}
        {done && (
          <button className="button" onClick={() => router.push("/login")}>Go to sign in</button>
        )}
      </div>
    </main>
  );
}
