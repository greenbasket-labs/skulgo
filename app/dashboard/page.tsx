import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import WorkspacePicker from "@/components/workspace-picker";

export default async function Dashboard() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");

  const memberships = await db.schoolMembership.findMany({
    where: { userId: u.id, active: true },
    include: {
      school: { select: { id: true, name: true, abbr: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!memberships.length) {
    return (
      <main className="shell">
        <div className="card" style={{ maxWidth: 640, margin: "40px auto" }}>
          <p className="muted">Personal SkulGo account</p>
          <h1>Welcome, {u.name}</h1>
          <p>You do not have a school workspace yet.</p>
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            <a className="button" href="/schools">Find a school</a>
            <a className="button" href="/register">Create a school</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 760, margin: "40px auto" }}>
        <p className="muted">Personal SkulGo account</p>
        <h1>Welcome, {u.name}</h1>
        <p className="muted">Choose a school workspace to continue.</p>
        <WorkspacePicker
          workspaces={memberships.map(m => ({
            membershipId: m.id,
            schoolId: m.schoolId,
            schoolName: m.school.name,
            schoolAbbr: m.school.abbr,
            role: m.role,
          }))}
        />
      </div>
    </main>
  );
}
