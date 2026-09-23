"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cacheRecord, queueAction, readCachedRecord, startOfflineSync, syncOfflineQueue, queuedActions } from "@/lib/offline-queue";

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

type FeeDefinition = {
  id: string;
  title: string;
  body: string | null;
  amount: number;
  targetType: "SCHOOL" | "SECTION" | "CLASS";
  status: "DRAFT" | "APPROVED";
  section: { name: string } | null;
  class: { name: string; arm: string | null; section: { name: string } } | null;
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
  const [feeDefinitions, setFeeDefinitions] = useState<FeeDefinition[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; arm: string | null; section: { name: string } }[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);
  const [feeTitle, setFeeTitle] = useState("");
  const [feeBody, setFeeBody] = useState("");
  const [feeTarget, setFeeTarget] = useState<"SCHOOL" | "SECTION" | "CLASS">("SCHOOL");
  const [feeSectionId, setFeeSectionId] = useState("");
  const [feeClassId, setFeeClassId] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [paymentProviders, setPaymentProviders] = useState<{ provider: string; enabled: boolean; status?: string; accountName?: string | null; accountNumberLast4?: string | null; merchantReference?: string | null }[]>([]);
  const [providerAccountName, setProviderAccountName] = useState("");
  const [providerAccountLast4, setProviderAccountLast4] = useState("");
  const [providerMerchantReference, setProviderMerchantReference] = useState("");

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [online, setOnline] = useState(true);
  const [waiting, setWaiting] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const role = user?.membership?.role;
  const schoolId = user?.membership?.schoolId;

  async function load() {
    const meKey = "skulgo-current-me";
    let me: { user?: User } | null = null;

    try {
      const meResponse = await fetch("/api/auth/me");
      const next = await meResponse.json().catch(() => ({ user: null }));
      if (meResponse.ok) {
        me = next;
        cacheRecord(meKey, next);
      }
    } catch {
      me = readCachedRecord<typeof me>(meKey);
    }

    if (!me) me = readCachedRecord<typeof me>(meKey);

    if (!me?.user?.membership) {
      setMessage("Open a school workspace first.");
      return;
    }

    setUser(me.user);

    const currentScope = me.user.id && me.user.membership.id
      ? `${me.user.id}:${me.user.membership.id}`
      : "";
    const feesKey = `skulgo:${currentScope}:fees-${me.user.membership.schoolId}`;
    if (me.user.membership.role === "ADMIN") {
      const [classResponse, sectionResponse, definitionResponse, providerResponse] = await Promise.all([
        fetch(`/api/schools/${me.user.membership.schoolId}/classes`),
        fetch(`/api/schools/${me.user.membership.schoolId}/sections`),
        fetch(`/api/schools/${me.user.membership.schoolId}/fees/definitions`),
        fetch(`/api/schools/${me.user.membership.schoolId}/payments/providers`),
      ]);
      const [classData, sectionData, definitionData, providerData] = await Promise.all([
        classResponse.json().catch(() => []),
        sectionResponse.json().catch(() => []),
        definitionResponse.json().catch(() => []),
        providerResponse.json().catch(() => []),
      ]);
      if (classResponse.ok) setClasses(Array.isArray(classData) ? classData : []);
      if (sectionResponse.ok) setSections(Array.isArray(sectionData) ? sectionData : []);
      if (definitionResponse.ok) setFeeDefinitions(Array.isArray(definitionData) ? definitionData : []);
      if (providerResponse.ok) setPaymentProviders(Array.isArray(providerData) ? providerData : []);
    }

    try {
      const feeResponse = await fetch(`/api/schools/${me.user.membership.schoolId}/fees`);
      const data = await feeResponse.json().catch(() => []);
      if (feeResponse.ok) {
        setFees(data);
        cacheRecord(feesKey, data);
        return;
      }
    } catch {
      // Use the last successful fee snapshot below.
    }

    setFees(readCachedRecord<Fee[]>(feesKey) ?? []);
  }


  async function createFeeDefinition() {
    if (!schoolId || role !== "ADMIN") return;
    const normalizedAmount = feeAmount.replace(/[,₦\s]/g, "");
    const amountValue = Number(normalizedAmount);
    if (!feeTitle.trim()) return setMessage("Enter a fee title.");
    if (!normalizedAmount || !Number.isFinite(amountValue) || amountValue <= 0) return setMessage("Enter a valid fee amount.");
    if (feeTarget === "SECTION" && !feeSectionId) return setMessage("Choose a section.");
    if (feeTarget === "CLASS" && !feeClassId) return setMessage("Choose a class.");
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/fees/definitions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: feeTitle, body: feeBody, amount: amountValue, targetType: feeTarget,
          sectionId: feeTarget === "SECTION" ? feeSectionId : null,
          classId: feeTarget === "CLASS" ? feeClassId : null,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Unable to create fee.");
      setFeeTitle(""); setFeeBody(""); setFeeAmount(""); setFeeTarget("SCHOOL"); setFeeSectionId(""); setFeeClassId("");
      setMessage("Fee saved as draft."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to create fee."); }
    finally { setBusy(false); }
  }

  async function setPaymentProvider(provider: string, enabled: boolean) {
    if (!schoolId || role !== "ADMIN") return;
    const response = await fetch(`/api/schools/${schoolId}/payments/providers`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        enabled,
        accountName: providerAccountName,
        accountNumberLast4: providerAccountLast4,
        merchantReference: providerMerchantReference,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(data?.error || "Unable to update payment provider.");
      return;
    }
    setPaymentProviders(current => current.map(item => item.provider === provider
      ? { ...item, enabled, status: data.status, accountName: data.accountName, accountNumberLast4: data.accountNumberLast4, merchantReference: data.merchantReference }
      : item));
    setMessage(provider + " payment option " + (enabled ? "enabled" : "disabled") + ".");
    if (enabled) {
      setProviderAccountName("");
      setProviderAccountLast4("");
      setProviderMerchantReference("");
    }
  }

  async function approveFeeDefinition(id: string) {
    if (!schoolId || role !== "ADMIN") return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/fees/definitions`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "APPROVE" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Unable to approve fee.");
      setMessage("Fee approved."); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to approve fee."); }
    finally { setBusy(false); }
  }

  async function refreshQueue() {
    setWaiting(queuedActions(user?.id && user.membership?.id ? `${user.id}:${user.membership.id}` : undefined).length);
    const scopeKey = user?.id && user.membership?.id ? `${user.id}:${user.membership.id}` : "";
    const result = await syncOfflineQueue(scopeKey || undefined);
    setWaiting(result.remaining);
    if (result.synced) {
      setMessage(`${result.synced} pending payment(s) synced.`);
      await load();
    }
  }

  useEffect(() => {
    void load();
    setOnline(navigator.onLine);

    const scopeKey = user?.id && user.membership?.id ? `${user.id}:${user.membership.id}` : "";
    if (scopeKey) {
      startOfflineSync(scopeKey, result => setWaiting(result.remaining));
    }

    void refreshQueue();

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

  async function pay(studentId = selectedStudentId) {
    if (!schoolId || !studentId) {
      setMessage("Choose the student first.");
      return;
    }

    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    const fee = fees.find(item => item.studentId === studentId);
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
        scopeKey: user?.id && user.membership?.id ? `${user.id}:${user.membership.id}` : "",
        url: `/api/schools/${schoolId}/payments`,
        method: "POST",
        body: { ...body, studentId },
      });
      setWaiting(queuedActions(user?.id && user.membership?.id ? `${user.id}:${user.membership.id}` : undefined).length);
      setBusy(false);
      setAmount("");
      setMessage("Payment saved on this device. It will sync when internet returns.");
      return;
    }

    const response = await fetch(`/api/schools/${schoolId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, studentId }),
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
          <>
            <div className="card" style={{ marginBottom: 18 }}>
              <h2>Create fee</h2>
              <div className="grid">
                <input value={feeTitle} onChange={event => setFeeTitle(event.target.value)} placeholder="Fee title" />
                <textarea value={feeBody} onChange={event => setFeeBody(event.target.value)} placeholder="Description / body" />
                <input inputMode="decimal" value={feeAmount} onChange={event => setFeeAmount(event.target.value)} placeholder="Amount" />
                <select value={feeTarget} onChange={event => {
                  const next = event.target.value as "SCHOOL" | "SECTION" | "CLASS";
                  setFeeTarget(next); setFeeSectionId(""); setFeeClassId("");
                }}>
                  <option value="SCHOOL">Whole school</option>
                  <option value="SECTION">Section</option>
                  <option value="CLASS">Class</option>
                </select>
                {feeTarget === "SECTION" && (
                  <select value={feeSectionId} onChange={event => setFeeSectionId(event.target.value)}>
                    <option value="">Choose section</option>
                    {sections.map(section => <option key={section.id} value={section.id}>{section.name}</option>)}
                  </select>
                )}
                {feeTarget === "CLASS" && (
                  <select value={feeClassId} onChange={event => setFeeClassId(event.target.value)}>
                    <option value="">Choose class</option>
                    {classes.map(item => (
                      <option key={item.id} value={item.id}>{item.section.name} · {item.name}{item.arm ? ` · Arm ${item.arm}` : ""}</option>
                    ))}
                  </select>
                )}
                <button className="button" type="button" onClick={() => void createFeeDefinition()} disabled={busy}>
                  {busy ? "Saving..." : "Save as Draft"}
                </button>
              </div>
            </div>
            <div className="card" style={{ marginBottom: 18 }}>
              <h2>Payment options</h2>
              <p className="muted">Only a verified school-owned payment account can be enabled. Never enter provider secret keys here.</p>
              <div className="grid">
                <input value={providerAccountName} onChange={event => setProviderAccountName(event.target.value)} placeholder="Verified account / business name" />
                <input inputMode="numeric" value={providerAccountLast4} onChange={event => setProviderAccountLast4(event.target.value.replace(/\D/g, "").slice(-4))} placeholder="Account last 4 digits (optional)" />
                <input value={providerMerchantReference} onChange={event => setProviderMerchantReference(event.target.value)} placeholder="Merchant ID / account reference (optional)" />
                {paymentProviders.map(item => (
                  <div key={item.provider} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <strong>{item.provider === "PAYSTACK" ? "Paystack" : item.provider === "FLUTTERWAVE" ? "Flutterwave" : "Moniepoint"}</strong>
                        <p className="muted" style={{ margin: "4px 0 0" }}>
                          {item.enabled ? ("Enabled" + (item.accountName ? " · " + item.accountName : "")) : item.status === "VERIFIED" ? "Verified · disabled" : "Not verified"}
                        </p>
                      </div>
                      <button
                        className="button"
                        type="button"
                        onClick={() => void setPaymentProvider(item.provider, !item.enabled)}
                      >
                        {item.enabled ? "Disable" : "Verify & enable"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card" style={{ marginBottom: 18 }}>
              <h2>Fee definitions</h2>
              {!feeDefinitions.length ? <p className="muted">No fees created yet.</p> : (
                <div className="grid">
                  {feeDefinitions.map(definition => (
                    <div key={definition.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                      <strong>{definition.title}</strong>
                      <p className="muted">{money(definition.amount)} · {definition.targetType === "SCHOOL" ? "Whole school" : definition.targetType === "SECTION" ? definition.section?.name : `${definition.class?.section.name} · ${definition.class?.name}${definition.class?.arm ? ` · Arm ${definition.class.arm}` : ""}`}</p>
                      {definition.body && <p className="muted">{definition.body}</p>}
                      <p className="muted">Status: {definition.status}</p>
                      {definition.status === "DRAFT" && (
                        <button className="button" type="button" onClick={() => void approveFeeDefinition(definition.id)} disabled={busy}>Approve</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
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
                      void pay(fee.studentId);
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
