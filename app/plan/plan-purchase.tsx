"use client";
import { useState } from "react";
type Plan = { key: string; label: string; students: number; staff: number; monthly: number; term: number; yearly: number };
function money(value: number) { return "₦" + value.toLocaleString("en-NG", { maximumFractionDigits: 0 }); }
export default function PlanPurchase({ schoolId, plans, paystackEnabled }: { schoolId: string; plans: Plan[]; paystackEnabled: boolean }) {
  const [tier, setTier] = useState(plans[0]?.key ?? "");
  const [billing, setBilling] = useState<"MONTHLY" | "TERM" | "YEARLY">("MONTHLY");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selected = plans.find(plan => plan.key === tier);
  async function pay() {
    if (!tier || !selected) return;
    setBusy(true); setMessage("");
    const response = await fetch("/api/schools/" + schoolId + "/subscription-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tier, plan: billing }) });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setMessage(data.error || "Could not start payment."); return; }
    window.location.href = data.authorizationUrl;
  }
  const amount = selected ? billing === "MONTHLY" ? selected.monthly : billing === "TERM" ? selected.term : selected.yearly : 0;
  return <div className="card" style={{ marginTop: 18 }}>
    <h2>Pay for a plan</h2>
    <p className="muted">Pay securely with Paystack. SkulGo activates the school plan after server verification.</p>
    <div className="grid grid-2" style={{ marginTop: 12 }}>
      <label><span className="muted">Plan</span><select value={tier} onChange={e => setTier(e.target.value)} disabled={busy || !paystackEnabled}>{plans.map(plan => <option key={plan.key} value={plan.key}>{plan.label} · {money(plan.monthly)}/month</option>)}</select></label>
      <label><span className="muted">Billing</span><select value={billing} onChange={e => setBilling(e.target.value as "MONTHLY" | "TERM" | "YEARLY")} disabled={busy || !paystackEnabled}><option value="MONTHLY">{selected ? money(selected.monthly) : ""} · Monthly</option><option value="TERM">{selected ? money(selected.term) : ""} · Term</option><option value="YEARLY">{selected ? money(selected.yearly) : ""} · Yearly</option></select></label>
    </div>
    {!paystackEnabled && <p className="muted">Paystack is not configured for this environment.</p>}
    {paystackEnabled && <button className="button" type="button" disabled={busy || !selected} onClick={() => void pay()}>{busy ? "Opening Paystack…" : "Pay " + money(amount) + " with Paystack"}</button>}
    {message && <p className="muted">{message}</p>}
    <p className="muted">Moniepoint will use the same subscription payment record when its gateway is connected.</p>
  </div>;
}