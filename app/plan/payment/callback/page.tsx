"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
export default function PaymentCallbackPage() {
  const params = useSearchParams(); const reference = params.get("reference");
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your payment…");
  useEffect(() => {
    if (!reference) { setState("error"); setMessage("No payment reference was returned."); return; }
    fetch("/api/subscription-payment/verify?reference=" + encodeURIComponent(reference), { cache: "no-store" })
      .then(async response => { const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || "Payment could not be verified."); return data; })
      .then(() => { setState("success"); setMessage("Payment confirmed. Your school plan is now active."); })
      .catch(error => { setState("error"); setMessage(error instanceof Error ? error.message : "Payment verification failed."); });
  }, [reference]);
  return <main className="workspace"><section className="workspace-main"><div className="card">
    <p className="muted">SkulGo subscription payment</p>
    <h1>{state === "loading" ? "Checking payment" : state === "success" ? "Payment successful" : "Payment not confirmed"}</h1>
    <p className="muted">{message}</p><Link className="button" href="/plan">Back to Plan</Link>
  </div></section></main>;
}