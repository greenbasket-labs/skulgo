"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const pending = params.get("pending") === "1";
  const email = params.get("email") || "";
  const [message, setMessage] = useState(pending ? "Enter the 6-digit code sent to your email." : "Verifying…");
  const [otp, setOtp] = useState("");
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

  async function verifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (otp.length !== 6 || !email) return;

    setBusy(true);
    setMessage("");

    const response = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await response.json().catch(() => ({}));

    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "This OTP is invalid or expired.");
      return;
    }

    setMessage("Email verified successfully. You can now sign in.");
  }

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "40px auto" }}>
        <p className="muted">SkulGo</p>
        <h1>Verify your email</h1>

        {email && <p className="muted">{email}</p>}
        <p>{message}</p>

        {pending && (
          <form onSubmit={verifyOtp} className="grid" style={{ marginTop: 16 }}>
            <label className="grid">
              <span>Enter 6-digit OTP</span>
              <input
                required
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                aria-label="6-digit email verification code"
              />
            </label>

            <button className="button" disabled={busy || otp.length !== 6}>
              {busy ? "Verifying…" : "Verify email"}
            </button>
          </form>
        )}

        {pending && (
          <p className="muted" style={{ marginTop: 14 }}>
            Didn’t receive it? Check spam/junk. The email also contains a verification link.
          </p>
        )}

        {!busy && !pending && (
          <button className="button" onClick={() => router.push("/login")}>
            Go to sign in
          </button>
        )}

        {pending && (
          <button
            className="button"
            style={{ marginTop: 12 }}
            type="button"
            onClick={() => router.push("/login")}
          >
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
