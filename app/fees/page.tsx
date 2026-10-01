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

type ClassStudent = {
  id: string;
  admissionId: string;
  firstName: string;
  lastName: string;
};

type PaymentHistory = {
  id: string;
  amount: number;
  reference: string | null;
  paymentMethod: string;
  tellerNumber: string | null;
  paidAt: string;
};

function money(value: number) {
  return "₦" + value.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

export default function FeesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [fees, setFees] = useState<Fee[]>([]);
  const [feeDefinitions, setFeeDefinitions] = useState<FeeDefinition[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; arm: string | null; section: { name: string }; students: ClassStudent[] }[]>([]);
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
  const [providerSecrets, setProviderSecrets] = useState<Record<string, { apiKey: string; secretKey: string; contractCode: string; webhookSecret: string }>>({});

  const [classSearch, setClassSearch] = useState("");
  const [selectedFeeClassId, setSelectedFeeClassId] = useState("");
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [paymentHistoryStudent, setPaymentHistoryStudent] = useState<ClassStudent | null>(null);

  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [cashierStudentCode, setCashierStudentCode] = useState("");
  const [cashierTeller, setCashierTeller] = useState("");
  const [cashierMethod, setCashierMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [cashierFee, setCashierFee] = useState<Fee | null>(null);
  const [online, setOnline] = useState(true);
  const [waiting, setWaiting] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const role = user?.membership?.role;
  const schoolId = user?.membership?.schoolId;

  const filteredFeeClasses = classes.filter(item => {
    const label = `${item.section.name} · ${item.name}${item.arm ? ` · Arm ${item.arm}` : ""}`;
    return label.toLowerCase().includes(classSearch.trim().toLowerCase());
  });

  const selectedFeeClass = classes.find(item => item.id === selectedFeeClassId);
  const selectedClassStudents = (selectedFeeClass?.students ?? []) as ClassStudent[];
  const classFeeRows = selectedClassStudents.map(student => {
    const fee = fees.find(item => item.studentId === student.id);
    return {
      student,
      totalFee: fee?.totalFee ?? 0,
      totalPaid: fee?.totalPaid ?? 0,
      balance: fee?.balance ?? 0,
    };
  });
  const classTotalFee = classFeeRows.reduce((sum, row) => sum + row.totalFee, 0);
  const classTotalPaid = classFeeRows.reduce((sum, row) => sum + row.totalPaid, 0);
  const classBalance = classFeeRows.reduce((sum, row) => sum + row.balance, 0);
  const classPaymentPercentage = classTotalFee > 0
    ? Math.round((classTotalPaid / classTotalFee) * 100)
    : 0;

  async function openPaymentHistory(student: ClassStudent) {
    if (!schoolId) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/payments?studentId=${encodeURIComponent(student.id)}`);
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data?.error || "Unable to load payment history.");
      setPaymentHistory(Array.isArray(data) ? data : []);
      setPaymentHistoryStudent(student);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load payment history.");
    } finally {
      setBusy(false);
    }
  }

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
    } else {
      const providerResponse = await fetch(`/api/schools/${me.user.membership.schoolId}/payments/providers`);
      const providerData = await providerResponse.json().catch(() => []);
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
        ...(providerSecrets[provider] ?? {}),
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
      setProviderSecrets(current => ({ ...current, [provider]: { apiKey: "", secretKey: "", contractCode: "", webhookSecret: "" } }));
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
    window.addEventListener("offline", onOffline);    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const payOptions = useMemo(() => {
    if (role === "STUDENT") return fees.slice(0, 1);
    return fees;
  }, [fees, role]);

  async function startOnlinePayment(studentId: string) {
    if (!schoolId || (role !== "STUDENT" && role !== "PARENT")) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setSelectedStudentId(studentId);
      setMessage("Enter the amount you want to pay.");
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

    setSelectedStudentId(studentId);
    setBusy(true);
    setMessage("");
    try {
      const endpoint = `/api/schools/${schoolId}/payments/online/monnify/initialize`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, amount: value }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Unable to start online payment.");
      window.location.assign(data.authorizationUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start online payment.");
      setBusy(false);
    }
  }

  async function findCashierStudent() {
    if (!schoolId || role !== "CASHIER") return;
    const admissionId = cashierStudentCode.trim();
    if (!admissionId) {
      setCashierFee(null);
      setMessage("Enter the student's Admission ID.");
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/schools/${schoolId}/fees?studentId=${encodeURIComponent(admissionId)}`);
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data?.error || "Unable to find student.");
      const match = Array.isArray(data) ? data[0] : null;
      if (!match) throw new Error("No fee record found with that Admission ID.");
      setCashierFee(match);
      setSelectedStudentId(match.studentId);
      setAmount("");
      setMessage("Student found. Verify the name and balance before accepting payment.");
    } catch (error) {
      setCashierFee(null);
      setSelectedStudentId("");
      setMessage(error instanceof Error ? error.message : "Unable to find student.");
    } finally {
      setBusy(false);
    }
  }

  async function recordCashierPayment() {
    if (!schoolId || role !== "CASHIER" || !cashierFee) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }
    if (value > cashierFee.balance) {
      setMessage(`Maximum payment is ${money(cashierFee.balance)}.`);
      return;
    }
    if (cashierMethod === "CASH" && !cashierTeller.trim()) {
      setMessage("Enter the school teller / receipt number.");
      return;
    }

    setBusy(true);
    setMessage("");
    const body = {
      admissionId: cashierFee.student.admissionId,
      amount: value,
      paymentMethod: cashierMethod,
      tellerNumber: cashierTeller.trim() || null,
    };

    try {
      if (!navigator.onLine) {
        queueAction({
          scopeKey: user?.id && user?.membership?.id ? `${user.id}:${user.membership.id}` : "",
          url: `/api/schools/${schoolId}/payments`,
          method: "POST",
          body,
        });
        setWaiting(queuedActions(user?.id && user?.membership?.id ? `${user.id}:${user.membership.id}` : undefined).length);
        setCashierFee(current => current ? { ...current, totalPaid: current.totalPaid + value, balance: current.balance - value } : current);
        setAmount("");
        setCashierTeller("");
        setMessage("Payment saved on this device. It will sync when internet returns.");
        return;
      }

      const response = await fetch(`/api/schools/${schoolId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Payment could not be recorded.");

      setCashierFee(current => current ? { ...current, totalPaid: data.totalPaid ?? current.totalPaid + value, balance: data.balance ?? current.balance - value } : current);
      setAmount("");
      setCashierTeller("");
      setMessage(`Payment recorded. Remaining balance: ${money(data.balance ?? cashierFee.balance - value)}.`);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment could not be recorded.");
    } finally {
      setBusy(false);
    }
  }

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

        {role === "CASHIER" && (
          <div className="card" style={{ marginBottom: 18 }}>
            <h2>Receive payment</h2>
            <p className="muted">Student gives the cashier the Admission ID and school teller. Verify the student before accepting cash.</p>
            <div className="grid">
              <input
                value={cashierStudentCode}
                onChange={event => setCashierStudentCode(event.target.value.trimStart())}
                onKeyDown={event => { if (event.key === "Enter") void findCashierStudent(); }}
                placeholder="Student Admission ID"
              />
              <button className="button" type="button" onClick={() => void findCashierStudent()} disabled={busy}>Find student</button>
              {cashierFee && (
                <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 14 }}>
                  <strong>{cashierFee.student.firstName} {cashierFee.student.lastName}</strong>
                  <p className="muted" style={{ margin: "4px 0 0" }}>{cashierFee.student.admissionId}</p>
                  <div className="grid grid-2" style={{ marginTop: 12 }}>
                    <div><p className="muted">Total fee</p><div className="stat">{money(cashierFee.totalFee)}</div></div>
                    <div><p className="muted">Outstanding</p><div className="stat">{money(cashierFee.balance)}</div></div>
                  </div>
                </div>
              )}
              {cashierFee && cashierFee.balance > 0 && (
                <>
                  <select value={cashierMethod} onChange={event => setCashierMethod(event.target.value as "CASH" | "BANK_TRANSFER")}>
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank transfer / manual</option>
                  </select>
                  <input value={cashierTeller} onChange={event => setCashierTeller(event.target.value)} placeholder="School teller / receipt number" />
                  <input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Amount received" />
                  <button className="button" type="button" onClick={() => void recordCashierPayment()} disabled={busy}>{busy ? "Recording…" : "Record payment"}</button>
                </>
              )}
              {cashierFee && cashierFee.balance <= 0 && <p className="muted">This student has no outstanding balance.</p>}
            </div>
          </div>
        )}

        {role === "ADMIN" && (
          <>
            <div className="card" style={{ marginBottom: 18 }}>
              <h2>Create fee</h2>
              <div className="grid">
                <input value={feeTitle} onChange={event => setFeeTitle(event.target.value)} placeholder="Fee title" />
                <textarea value={feeBody} onChange={event => setFeeBody(event.target.value)} placeholder="Description / body" />
                <input inputMode="decimal" value={feeAmount} onChange={event => setFeeAmount(event.target.value)} placeholder="Amount" />
                <select value={feeTarget} onChange={event => {
                  const next = event.target.value as "SCHOOL" | "SECTION" | "CLASS";                  setFeeTarget(next); setFeeSectionId(""); setFeeClassId("");
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
              <h2>Class payment overview</h2>
              <p className="muted">Search or choose a class to see payment progress and student balances.</p>
              <div className="grid grid-2">
                <input
                  value={classSearch}
                  onChange={event => setClassSearch(event.target.value)}
                  placeholder="Search class"
                  aria-label="Search class"
                />
                <select
                  value={selectedFeeClassId}
                  onChange={event => {
                    setSelectedFeeClassId(event.target.value);
                    setPaymentHistoryStudent(null);
                    setPaymentHistory([]);
                  }}
                  aria-label="Choose class"
                >
                  <option value="">Choose class</option>
                  {filteredFeeClasses.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.section.name} · {item.name}{item.arm ? ` · Arm ${item.arm}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedFeeClass && (
                <div style={{ marginTop: 16 }}>
                  <div className="grid grid-2">
                    <div className="card">
                      <p className="muted">Students</p>
                      <div className="stat">{classFeeRows.length}</div>
                    </div>
                    <div className="card">
                      <p className="muted">Payment</p>
                      <div className="stat">{classPaymentPercentage}%</div>
                    </div>
                    <div className="card">
                      <p className="muted">Paid</p>
                      <div className="stat">{money(classTotalPaid)}</div>
                    </div>
                    <div className="card">
                      <p className="muted">Outstanding</p>
                      <div className="stat">{money(classBalance)}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <strong>{selectedFeeClass.section.name} · {selectedFeeClass.name}{selectedFeeClass.arm ? ` · Arm ${selectedFeeClass.arm}` : ""}</strong>
                    {!classFeeRows.length ? (
                      <p className="muted">No students are saved in this class yet.</p>
                    ) : (
                      <div className="grid" style={{ marginTop: 10 }}>
                        {classFeeRows.map(row => (
                          <button
                            key={row.student.id}
                            type="button"
                            className="card"
                            style={{ textAlign: "left", cursor: "pointer" }}
                            onClick={() => void openPaymentHistory(row.student)}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                              <div>
                                <strong>{row.student.firstName} {row.student.lastName}</strong>
                                <p className="muted" style={{ margin: "4px 0 0" }}>{row.student.admissionId}</p>
                              </div>
                              <div>
                                <strong>{row.balance <= 0 && row.totalFee > 0 ? "Paid" : row.totalPaid > 0 ? "Partial" : "Not paid"}</strong>
                                <p className="muted" style={{ margin: "4px 0 0" }}>
                                  Paid {money(row.totalPaid)} · Balance {money(row.balance)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {paymentHistoryStudent && (
                    <div className="card" style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <strong>Payment history · {paymentHistoryStudent.firstName} {paymentHistoryStudent.lastName}</strong>
                          <p className="muted" style={{ margin: "4px 0 0" }}>{paymentHistoryStudent.admissionId}</p>
                        </div>
                        <button className="button" type="button" onClick={() => {
                          setPaymentHistoryStudent(null);
                          setPaymentHistory([]);
                        }}>Close</button>
                      </div>
                      {!paymentHistory.length ? (
                        <p className="muted" style={{ marginTop: 12 }}>No payment history found.</p>
                      ) : (
                        <div className="grid" style={{ marginTop: 12 }}>
                          {paymentHistory.map(payment => (
                            <div key={payment.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                              <strong>{money(payment.amount)}</strong>
                              <p className="muted" style={{ margin: "4px 0 0" }}>
                                {new Date(payment.paidAt).toLocaleString("en-NG")}
                              </p>
                              <p className="muted" style={{ margin: "4px 0 0" }}>
                                {payment.paymentMethod}{payment.tellerNumber ? ` · Teller ${payment.tellerNumber}` : ""}{payment.reference ? ` · Ref ${payment.reference}` : ""}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="card" style={{ marginBottom: 18 }}>
              <h2>Payment options</h2>
              <p className="muted">
                Online payment uses the school's own Moniepoint account. Cash and bank-transfer payments are verified and recorded by the school cashier.
              </p>
              <div className="grid">
                {paymentProviders.map(item => {
                  const secret = providerSecrets[item.provider] ?? { apiKey: "", secretKey: "", contractCode: "", webhookSecret: "" };
                  return (
                    <div key={item.provider} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div>
                          <strong>Moniepoint</strong>
                          <p className="muted" style={{ margin: "4px 0 0" }}>
                            {item.enabled ? ("Enabled" + (item.accountName ? " · " + item.accountName : "")) : item.status === "VERIFIED" ? "Configured · disabled" : "Not configured"}
                          </p>
                        </div>
                        <button className="button" type="button" onClick={() => void setPaymentProvider(item.provider, !item.enabled)}>
                          {item.enabled ? "Disable" : "Save & enable"}
                        </button>
                      </div>
                      {!item.enabled && (
                        <div className="grid" style={{ marginTop: 12 }}>
                          <input value={providerAccountName} onChange={event => setProviderAccountName(event.target.value)} placeholder="School payment account / business name" />
                          <input inputMode="numeric" value={providerAccountLast4} onChange={event => setProviderAccountLast4(event.target.value.replace(/\D/g, "").slice(-4))} placeholder="Account last 4 digits (optional)" />
                          <input value={providerMerchantReference} onChange={event => setProviderMerchantReference(event.target.value)} placeholder="Moniepoint account / merchant reference (optional)" />
                          <input value={secret.apiKey} onChange={event => setProviderSecrets(current => ({ ...current, [item.provider]: { ...secret, apiKey: event.target.value } }))} placeholder="School Monnify API key" type="password" />
                          <input value={secret.contractCode} onChange={event => setProviderSecrets(current => ({ ...current, [item.provider]: { ...secret, contractCode: event.target.value } }))} placeholder="Monnify contract code" />
                          <input value={secret.secretKey} onChange={event => setProviderSecrets(current => ({ ...current, [item.provider]: { ...secret, secretKey: event.target.value } }))} placeholder="School Monnify secret key" type="password" />
                          <input value={secret.webhookSecret} onChange={event => setProviderSecrets(current => ({ ...current, [item.provider]: { ...secret, webhookSecret: event.target.value } }))} placeholder="Webhook secret (if provided)" type="password" />
                        </div>
                      )}
                    </div>
                  );
                })}
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

        {(role === "STUDENT" || role === "PARENT") && (
          <div className="card" style={{ marginBottom: 18 }}>
            <h2>{role === "PARENT" ? "Children's Fees" : "My Fees"}</h2>
            <p className="muted">
              {role === "PARENT"
                ? "Approved fees for your children are shown below, including amounts paid and outstanding balances."
                : "Your approved school fees are shown below, including the amount paid and outstanding balance."}
            </p>
            {!payOptions.length ? (
              <p className="muted" style={{ marginTop: 14 }}>
                {role === "PARENT" ? "No approved child fee record is available yet." : "No approved fee record is available yet."}
              </p>
            ) : (
              <div className="grid" style={{ marginTop: 14 }}>
                {payOptions.map(fee => (
                  <div key={fee.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <strong>{fee.student.firstName} {fee.student.lastName}</strong>
                        <p className="muted" style={{ margin: "4px 0 0" }}>{fee.student.admissionId}</p>
                      </div>
                      <strong>{money(fee.totalFee)}</strong>
                    </div>
                    <div className="grid grid-2" style={{ marginTop: 12 }}>
                      <div>
                        <p className="muted">Amount Paid</p>
                        <div className="stat">{money(fee.totalPaid)}</div>
                      </div>
                      <div>
                        <p className="muted">Outstanding Balance</p>
                        <div className="stat">{money(Math.max(0, fee.balance))}</div>
                      </div>
                    </div>
                    <p className="muted" style={{ marginTop: 10 }}>
                      <strong>Payment Status:</strong> {fee.balance <= 0 ? "Paid in full" : fee.totalPaid > 0 ? "Partially paid" : "Outstanding"}
                    </p>
                    {fee.balance > 0 ? (
                      <div className="grid grid-2" style={{ marginTop: 12 }}>
                        <input
                          inputMode="decimal"
                          value={selectedStudentId === fee.studentId ? amount : ""}
                          onChange={event => {
                            setSelectedStudentId(fee.studentId);
                            setAmount(event.target.value);
                          }}
                          placeholder="Amount to pay"
                          aria-label={`Amount to pay for ${fee.student.firstName} ${fee.student.lastName}`}
                        />
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {paymentProviders.some(item => item.provider === "MONIEPOINT" && item.enabled && item.status === "VERIFIED") ? (
                            <button className="button" type="button" onClick={() => void startOnlinePayment(fee.studentId)} disabled={busy}>
                              {busy && selectedStudentId === fee.studentId ? "Starting payment…" : "Pay with Moniepoint"}
                            </button>
                          ) : (
                            <span className="muted">Online Moniepoint payment is not enabled by the school yet.</span>
                          )}
                        </div>
                    {fee.balance > 0 ? (
                      <div className="grid grid-2" style={{ marginTop: 12 }}>
                        <input
                          inputMode="decimal"
                          value={selectedStudentId === fee.studentId ? amount : ""}
                          onChange={event => {
                            setSelectedStudentId(fee.studentId);
                            setAmount(event.target.value);
                          }}
                          placeholder="Amount to pay"
                          aria-label={`Amount to pay for ${fee.student.firstName} ${fee.student.lastName}`}
                        />
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {paymentProviders.some(item => item.provider === "MONIEPOINT" && item.enabled && item.status === "VERIFIED") ? (
                            <button className="button" type="button" onClick={() => void startOnlinePayment(fee.studentId)} disabled={busy}>
                              {busy && selectedStudentId === fee.studentId ? "Starting payment…" : "Pay with Moniepoint"}
                            </button>
                          ) : (
                            <span className="muted">Online Moniepoint payment is not enabled by the school yet.</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="muted" style={{ marginTop: 12 }}>No outstanding balance.</p>
                    )}
                    <p className="muted" style={{ marginTop: 10 }}>
                      Online payment is recorded only after the payment provider confirms the transaction.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {message && <p>{message}</p>}
      </section>
    </main>
  );
}
