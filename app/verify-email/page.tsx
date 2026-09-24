"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const pending = params.get("pending") === "1";
  const email = params.get("email") || "";
  const [message, setMessage] = useState(pending ? "Check your email for the verification link." : "Verifying…");
  const [busy, setBusy] = useState(!pending);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json().catch(() => ({}));
      setBusy(false);
      if (!response.ok) {
        setMessage(data.error || "Could not verify your email.");
        return;
      }
      setMessage("Email verified. You can now sign in.");
    })();
  }, [token]);

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "40px auto" }}>
        <p className="muted">SkulGo</p>
        <h1>{pending ? "Check your email" : "Verify your email"}</h1>
        {email && <p className="muted">{email}</p>}
        <p>{message}</p>
        {!busy && !pending && (
          <button className="button" onClick={() => router.push("/login")}>
            Go to sign in
          </button>
        )}
        {pending && (
          <button className="button" onClick={() => router.push("/login")}>
            Back to sign in
          </button>
        )}
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <main className="shell">
        <div className="card" style={{ maxWidth: 520, margin: "40px auto" }}>
          <p className="muted">SkulGo</p>
          <p>Loading…</p>
        </div>
      </main>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
