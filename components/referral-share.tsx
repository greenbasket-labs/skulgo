"use client";

import { useState } from "react";

export default function ReferralShare({ referralCode }: { referralCode: string }) {
  const [status, setStatus] = useState("");

  async function loadShareData() {
    const response = await fetch("/api/referrals/share");
    if (!response.ok) throw new Error("Could not prepare referral message");
    return response.json() as Promise<{ referralCode: string; referralLink: string; message: string }>;
  }

  async function copyReferral() {
    try {
      const data = await loadShareData();
      await navigator.clipboard.writeText(data.message);
      setStatus("Copied");
    } catch {
      setStatus("Could not copy");
    }
  }

  async function shareReferral() {
    try {
      const data = await loadShareData();

      if (navigator.share) {
        await navigator.share({
          title: "Try SkulGo",
          text: data.message,
          url: data.referralLink,
        });
        setStatus("Ready to share");
        return;
      }

      await navigator.clipboard.writeText(data.message);
      setStatus("Copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("Could not share");
    }
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <strong>{referralCode}</strong>
        <button type="button" className="button" onClick={copyReferral}>
          Copy
        </button>
        <button type="button" className="button" onClick={shareReferral}>
          Share SkulGo
        </button>
      </div>
      {status && <p className="muted" style={{ marginTop: 8 }}>{status}</p>}
    </div>
  );
}
