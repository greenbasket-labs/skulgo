import { db } from "@/lib/db";

export default async function OwnerSchools() {
  const schools = await db.school.findMany({
    orderBy: { createdAt: "desc" },
    include: { subscription: true, _count: { select: { students: true, memberships: true, classes: true } } },
  });

  return (
    <>
      <div className="workspace-header"><div><p className="muted">SkulGo Owner</p><h1>Schools</h1><p>Schools registered on the platform.</p></div></div>
      <div className="grid">
        {!schools.length ? <div className="card"><p className="muted">No schools yet.</p></div> : schools.map(school => (
          <div className="card" key={school.id}>
            <strong>{school.name}</strong>
            <p className="muted">{school.abbr} · {school.email}</p>
            <div className="grid grid-3">
              <div><p className="muted">Students</p><strong>{school._count.students}</strong></div>
              <div><p className="muted">People</p><strong>{school._count.memberships}</strong></div>
              <div><p className="muted">Classes</p><strong>{school._count.classes}</strong></div>
            </div>
            <p className="muted">Subscription: {school.subscription?.status ?? "Not configured"} · {school.subscription?.plan ?? "—"}</p>
          </div>
        ))}
      </div>
    </>
  );
}
