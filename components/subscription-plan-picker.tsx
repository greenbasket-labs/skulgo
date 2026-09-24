"use client";

import { useState } from "react";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanCode } from "@/lib/subscription-plans";

type Props = {
  moniepoint: { bankName: string; accountName: string; accountNumber: string } | null;
  currentPlan?: SubscriptionPlanCode | null;
  currentStatus: string;
  expiresAt?: string | null;
};

function money(value: number) {
  return "₦" + value.toLocaleString("en-NG");
}

export default function SubscriptionPlanPicker({ moniepoint, currentPlan, currentStatus, expiresAt }: Props) {
  const [busy, setBusy] = useState<string>("");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");

  async function paystack(plan: SubscriptionPlanCode) {
    setBusy(plan);
    setMessage("");
    const response = await fetch("/api/subscription/paystack/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy("");
    if (!response.ok) {
      setMessage(data.error || "Could not start payment.");
      return;
    }
    window.location.href = data.authorizationUrl;
  }

  async function submitMoniepoint(plan: SubscriptionPlanCode) {
    if (!reference.trim()) {
      setMessage("Enter your Moniepoint transfer/reference number first.");
      return;
    }
    setBusy("MONIEPOINT");
    setMessage("");
    const response = await fetch("/api/subscription/moniepoint/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, reference }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy("");
    setMessage(response.ok ? "Payment submitted. SkulGo will activate the plan after the transfer is verified." : (data.error || "Could not submit payment."));
    if (response.ok) setReference("");
  }

  return (
    <div className="grid">
      <div className="card">
        <p className="muted">Current plan</p>
        <h2>{currentPlan ? SUBSCRIPTION_PLANS[currentPlan].name : "Free Trial"}</h2>
        <p className="muted">Status: {currentStatus}{expiresAt ? ` · expires ${new Date(expiresAt).toLocaleDateString("en-NG")}` : ""}</p>
      </div>

      <div className="grid grid-2">
        {(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlanCode[]).map(plan => (
          <div className="card" key={plan}>
            <p className="muted">{SUBSCRIPTION_PLANS[plan].name}</p>
            <div className="stat">{money(SUBSCRIPTION_PLANS[plan].price)}</div>
            <p className="muted">per month</p>
            <button className="button" type="button" onClick={() => void paystack(plan)} disabled={!!busy}>
              {busy === plan ? "Opening payment…" : "Pay with Paystack"}
            </button>
            {moniepoint && (
              <div style={{ marginTop: 12 }}>
                <p className="muted">Or transfer to Moniepoint:</p>
                <strong>{moniepoint.accountName}</strong>
                <p className="muted">{moniepoint.bankName} · {moniepoint.accountNumber}</p>
                <input value={reference} onChange={event => setReference(event.target.value)} placeholder="Transfer reference" />
                <button className="button" type="button" onClick={() => void submitMoniepoint(plan)} disabled={!!busy}>
                  {busy === "MONIEPOINT" ? "Submitting…" : "I have paid"}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {message && <div className="card"><strong>{message}</strong></div>}
    </div>
  );
}
