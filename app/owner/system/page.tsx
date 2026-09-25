import { requireOwner } from "@/lib/owner";
import { db } from "@/lib/db";

export default async function OwnerSystem() {
  await requireOwner();
  const [users, schools, memberships, auditLogs] = await Promise.all([
    db.user.count(),
    db.school.count(),
    db.schoolMembership.count({ where: { active: true } }),
    db.auditLog.count(),
  ]);

  return (
    <>
      <div className="workspace-header"><div><p className="muted">SkulGo Owner</p><h1>System</h1><p>Small operational counters from the current database.</p></div></div>
      <div className="grid grid-2">
        <div className="card"><p className="muted">Personal accounts</p><div className="stat">{users}</div></div>
        <div className="card"><p className="muted">Schools</p><div className="stat">{schools}</div></div>
        <div className="card"><p className="muted">Active school connections</p><div className="stat">{memberships}</div></div>
        <div className="card"><p className="muted">Audit records</p><div className="stat">{auditLogs}</div></div>
      </div>
    </>
  );
}
