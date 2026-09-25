import { db } from "@/lib/db";

export default async function OwnerActivity() {
  const activity = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { school: { select: { name: true, abbr: true } }, actor: { select: { name: true, email: true } } },
  });

  return (
    <>
      <div className="workspace-header"><div><p className="muted">SkulGo Owner</p><h1>Activity</h1><p>Recent activity recorded in the existing school audit logs.</p></div></div>
      <div className="grid">
        {!activity.length ? <div className="card"><p className="muted">No activity yet.</p></div> : activity.map(item => (
          <div className="card" key={item.id}>
            <strong>{item.action} · {item.entity}</strong>
            <p className="muted">{item.school.name} · {item.actor.name} · {item.createdAt.toLocaleString("en-NG")}</p>
          </div>
        ))}
      </div>
    </>
  );
}
