"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { queueAction, syncOfflineQueue, queuedActions } from "@/lib/offline-queue";

type User = {
  id: string;
  name: string;
  email: string;
  membership: {
    id: string;
    schoolId: string;
    role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "CASHIER";
    school: { id: string; name: string; abbr: string };
  } | null;
};

type Fee = {
  id: string;
  studentId: string;
  totalFee: number;
  totalPaid: number;
  balance: number;
  student: { id: string; admissionId: string; firstName: string; lastName: string };
};

function money(value: number) {
  return "₦" + value.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

export default function FeesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [online, setOnline] = useState(true);
  const [waiting, setWaiting] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const role = user?.membership?.role;
  const schoolId = user?.membership?.schoolId;

  async function load() {
    const meResponse = await fetch("/api/auth/me");
    const me = await meResponse.json().catch(() => ({ user: null }));
    if (!meResponse.ok || !me.user?.membership) {
      setMessage("Open a school workspace first.");
      return;
    }

    setUser(me.user);

    const feeResponse = await fetch(`/api/schools/${me.user.membership.schoolId}/fees`);
    const data = await feeResponse.json().catch(() => []);
    setFees(feeResponse.ok ? data : []);
  }

  async function refreshQueue() {
    setWaiting(queuedActions().length);
    const result = await syncOfflineQueue();
    setWaiting(result.remaining);
    if (result.synced) {
      setMessage(`${result.synced} pending payment(s) synced.`);
      if (schoolId) {
        const response = await fetch(`/api/schools/${schoolId}/fees`);
        const data = await response.json().catch(() => []);
        if (response.ok) setFees(data);
      }
    }
  }

  useEffect(() => {
    load();
    setOnline(navigator.onLine);
    refreshQueue();

    const onOnline = () => { setOnline(true); refreshQueue(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const payOptions = useMemo(() => {
    if (role === "STUDENT") return fees.slice(0, 1);
    return fees;
  }, [fees, role]);

  async function pay() {
    if (!schoolId || !selectedStudentId) {
      setMessage("Choose the student first.");
      return;
    }

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    const fee = fees.find(item => item.studentId === selectedStudentId);
    if (!fee) {
      setMessage("Fee record not found.");
      return;
    }
    if (value > fee.balance) {
      setMessage(`Maximum payment is ${money(fee.balance)}.`);
      return;
    }

    setBusy(true);
    setMessage("");

    const body = {
      studentId: selectedStudentId,
      amount: value,
    };

    if (!navigator.onLine) {
      queueAction({
        url: `/api/schools/${schoolId}/payments`,
        method: "POST",
        body,
      });
      setWaiting(queuedActions().length);
      setBusy(false);
      setAmount("");
      setMessage("Payment saved on this device. It will sync when internet returns.");
      return;
    }

    const response = await fetch(`/api/schools/${schoolId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));

    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || "Payment could not be recorded.");
      return;
    }

    setAmount("");
    setMessage("Payment recorded.");
    await load();
  }

  if (!user?.membership) {
    return (
      <main className="shell">
        <div className="card" style={{ maxWidth: 700, margin: "40px auto" }}>
          <p className="muted">Fees</p>
          <h1>No school workspace selected</h1>
          <Link className="button" href="/dashboard">Back to dashboard</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="workspace">
      <aside className="workspace-sidebar">
        <div className="workspace-brand">SkulGo</div>
        <div className="workspace-school">
          <strong>{user.membership.school.name}</strong>
          <span>{user.membership.school.abbr}</span>
        </div>
        <nav className="workspace-nav">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/fees">Fees</Link>
          {role === "CASHIER" && <Link href="/payments">Payments</Link>}
        </nav>
        <div className="workspace-person">
          <strong>{user.name}</strong>
          <span>{role}</span>
        </div>
      </aside>

      <section className="workspace-main">
        <div className="workspace-header">
          <p className="muted">Fees & payments</p>
          <h1>School fees</h1>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{online ? "Online" : "Offline"}</strong>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                {waiting ? `${waiting} payment(s) waiting to sync` : "Nothing waiting to sync"}
              </p>
            </div>
            <button className="button" onClick={refreshQueue}>Sync</button>
          </div>
        </div>

        {role === "ADMIN" && (
          <div className="card" style={{ marginBottom: 18 }}>
            <strong>Fee records</strong>
            <p className="muted">Fee setup stays with the school. Payment uses the same record.</p>
          </div>
        )}

        <div className="grid">
          {fees.map(fee => (
            <div className="card" key={fee.id}>
              <strong>{fee.student.firstName} {fee.student.lastName}</strong>
              <p className="muted">{fee.student.admissionId}</p>
              <div className="grid grid-2">
                <div>
                  <p className="muted">Total fee</p>
                  <div className="stat">{money(fee.totalFee)}</div>
                </div>
                <div>
                  <p className="muted">Balance</p>
                  <div className="stat">{money(fee.balance)}</div>
                </div>
              </div>

              {fee.balance > 0 && (role === "STUDENT" || role === "PARENT" || role === "CASHIER" || role === "ADMIN") && (
                <div className="grid" style={{ marginTop: 16 }}>
                  {role !== "STUDENT" && (
                    <select
                      value={selectedStudentId}
                      onChange={event => setSelectedStudentId(event.target.value)}
                    >
                      <option value="">Choose student to pay</option>
                      {payOptions.map(option => (
                        <option key={option.studentId} value={option.studentId}>
                          {option.student.firstName} {option.student.lastName} · {option.student.admissionId}
                        </option>
                      ))}
                    </select>
                  )}

                  {role === "STUDENT" && <p className="muted">You can pay for your own school fees.</p>}
                  {role === "PARENT" && <p className="muted">You can pay for an approved child.</p>}
                  {role === "CASHIER" && <p className="muted">Record a payment received from a student or parent.</p>}
                  {role === "ADMIN" && <p className="muted">You can record a school payment when needed.</p>}

                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={event => setAmount(event.target.value)}
                    placeholder="Payment amount"
                  />
                  <button
                    className="button"
                    disabled={busy || (role !== "STUDENT" && selectedStudentId !== fee.studentId)}
                    onClick={() => {
                      setSelectedStudentId(fee.studentId);
                      window.setTimeout(() => { void pay(); }, 0);
                    }}
                  >
                    {busy ? "Saving…" : "Record payment"}
                  </button>
                </div>
              )}
            </div>
          ))}

          {!fees.length && (
            <div className="card">
              <p className="muted">No fee record is available for this workspace yet.</p>
            </div>
          )}
        </div>

        {message && <p>{message}</p>}
      </section>
    </main>
  );
}
