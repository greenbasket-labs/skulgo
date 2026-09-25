import { requireOwner } from "@/lib/owner";
import Link from "next/link";
import { db } from "@/lib/db";

export default async function OwnerOverview() {
  await requireOwner();
  const [users, schools, activeSubscriptions, trialSubscriptions, recentSchools] = await Promise.all([
    db.user.count(),
    db.school.count(),
    db.schoolSubscription.count({ where: { status: "ACTIVE" } }),
    db.schoolSubscription.count({ where: { status: "TRIAL" } }),
    db.school.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, abbr: true, createdAt: true, subscription: { select: { plan: true, status: true, expiresAt: true } } },
    }),
  ]);

  return (
    <>
      <div className="workspace-header">
        <div><p className="muted">SkulGo Owner</p><h1>Overview</h1><p>One simple view of the schools using SkulGo.</p></div>
      </div>
      <div className="grid grid-2">
        <div className="card"><p className="muted">Users</p><div className="stat">{users}</div><Link href="/owner/users">View users →</Link></div>
        <div className="card"><p className="muted">Schools</p><div className="stat">{schools}</div><Link href="/owner/schools">View schools →</Link></div>
        <div className="card"><p className="muted">Active subscriptions</p><div className="stat">{activeSubscriptions}</div><Link href="/owner/subscriptions">View subscriptions →</Link></div>
        <div className="card"><p className="muted">Trials</p><div className="stat">{trialSubscriptions}</div></div>
        <div className="card"><p className="muted">Platform</p><div className="stat">Online</div><Link href="/owner/system">System →</Link></div>
      </div>
      <div className="card" style={{ marginTop: 18 }}>
        <strong>Recent schools</strong>
        {!recentSchools.length ? <p className="muted">No schools yet.</p> : (
          <div className="grid" style={{ marginTop: 12 }}>
            {recentSchools.map(school => (
              <div key={school.id}>
                <strong>{school.name} · {school.abbr}</strong>
                <p className="muted">{school.subscription?.status ?? "No subscription"} · {school.subscription?.plan ?? "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
