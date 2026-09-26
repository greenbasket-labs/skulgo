import { Suspense } from "react";
import PaymentCallbackClient from "./payment-callback-client";

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<main className="workspace"><section className="workspace-main"><div className="card"><h1>Checking payment</h1><p className="muted">Loading payment verification…</p></div></section></main>}>
      <PaymentCallbackClient />
    </Suspense>
  );
}
