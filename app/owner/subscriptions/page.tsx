import { requireOwner } from "@/lib/owner";
import { db } from "@/lib/db";

export default async function OwnerSubscriptions() {
  await requireOwner();
  const subscriptions = await db.schoolSubscription.findMany({
    orderBy: { createdAt: "desc" },
    include: { school: { select: { name: true, abbr: true } } },
  });

  return (
    <>
      <div className="workspace-header"><div><p className="muted">SkulGo Owner</p><h1>Subscriptions</h1><p>Subscription status for each school.</p></div></div>
      <div className="grid">
        {!subscriptions.length ? <div className="card"><p className="muted">No subscription records yet.</p></div> : subscriptions.map(item => (
          <div className="card" key={item.id}>
            <strong>{item.school.name} · {item.school.abbr}</strong>
            <p className="muted">Plan: {item.plan} · Status: {item.status}</p>
            <p className="muted">Expires: {item.expiresAt ? item.expiresAt.toLocaleDateString("en-NG") : "—"}</p>
          </div>
        ))}
      </div>
    </>
  );
}
