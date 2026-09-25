import { requireOwner } from "@/lib/owner";
import { db } from "@/lib/db";

function money(value: number) {
  return "₦" + value.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

export default async function OwnerPayments() {
  await requireOwner();
  const [summary, payments] = await Promise.all([
    db.payment.aggregate({ _sum: { amount: true }, _count: { _all: true } }),
    db.payment.findMany({
      orderBy: { paidAt: "desc" },
      take: 50,
      include: { school: { select: { name: true, abbr: true } }, student: { select: { firstName: true, lastName: true, admissionId: true } } },
    }),
  ]);

  return (
    <>
      <div className="workspace-header"><div><p className="muted">SkulGo Owner</p><h1>Payments</h1><p>School payment activity already recorded in SkulGo.</p></div></div>
      <div className="grid grid-2">
        <div className="card"><p className="muted">Recorded payments</p><div className="stat">{summary._count._all}</div></div>
        <div className="card"><p className="muted">Recorded amount</p><div className="stat">{money(summary._sum.amount ?? 0)}</div></div>
      </div>
      <div className="grid" style={{ marginTop: 18 }}>
        {!payments.length ? <div className="card"><p className="muted">No payments recorded yet.</p></div> : payments.map(payment => (
          <div className="card" key={payment.id}>
            <strong>{payment.school.name} · {payment.school.abbr}</strong>
            <p className="muted">{payment.student.firstName} {payment.student.lastName} · {payment.student.admissionId}</p>
            <p>{money(payment.amount)} · {payment.paymentMethod} · {payment.paidAt.toLocaleString("en-NG")}</p>
          </div>
        ))}
      </div>
    </>
  );
}
