import { db } from "@/lib/db";

export default async function OwnerSchools() {
  const schools = await db.school.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      abbr: true,
      address: true,
      phone: true,
      email: true,
      createdAt: true,
      subscription: { select: { plan: true, status: true } },
    },
  });

  return (
    <>
      <div className="workspace-header">
        <div>
          <p className="muted">SkulGo Owner</p>
          <h1>Schools</h1>
          <p>Basic information about schools registered on the platform.</p>
        </div>
      </div>
      <div className="grid">
        {!schools.length ? (
          <div className="card"><p className="muted">No schools yet.</p></div>
        ) : schools.map(school => (
          <div className="card" key={school.id}>
            <strong>{school.name}</strong>
            <p className="muted">{school.abbr}</p>
            <p>{school.address}</p>
            <p className="muted">{school.phone} · {school.email}</p>
            <p className="muted">
              Subscription: {school.subscription?.status ?? "Not configured"} · {school.subscription?.plan ?? "—"}
            </p>
            <p className="muted">Registered: {school.createdAt.toLocaleDateString("en-NG")}</p>
          </div>
        ))}
      </div>
    </>
  );
}
