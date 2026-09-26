"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function ResultCheckerCallback() {
  const params = useSearchParams();
  const [message, setMessage] = useState("Verifying payment…");

  useEffect(() => {
    const reference = params.get("reference");
    if (!reference) {
      setMessage("Payment reference is missing.");
      return;
    }

    void (async () => {
      const response = await fetch("/api/result-checker/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(data.error || "Payment could not be verified.");
        return;
      }
      window.location.href = "/result-checker/result?reference=" + encodeURIComponent(reference);
    })();
  }, [params]);

  return (
    <main className="workspace-main">
      <div className="card">
        <h1>Result Checker</h1>
        <p className="muted">{message}</p>
      </div>
    </main>
  );
}
