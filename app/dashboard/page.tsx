import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { navForRole, type WorkspaceRole } from "@/lib/workspace-nav";

export default async function Dashboard() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");

  if (!u.membership) {
    return (
      <main className="shell">
        <div className="card" style={{ maxWidth: 760, margin: "40px auto" }}>
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

  const role = u.membership.role as WorkspaceRole;
  const nav = navForRole(role);

  return (
    <main className="workspace">
      <aside className="workspace-sidebar">
        <div className="workspace-brand">SkulGo</div>
        <div className="workspace-school">
          <strong>{u.membership.school.name}</strong>
          <span>{u.membership.school.abbr}</span>
        </div>

        <nav className="workspace-nav">
          {nav.map(([label, href]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>

        <div className="workspace-person">
          <strong>{u.name}</strong>
          <span>{role}</span>
          <Link href="/dashboard">Switch school</Link>
        </div>
      </aside>

      <section className="workspace-main">
        <div className="workspace-header">
          <div>
            <p className="muted">{role.toLowerCase()} workspace</p>
            <h1>Good morning, {u.name.split(" ")[0]}</h1>
          </div>
        </div>

        <div className="grid grid-2">
          <div className="card">
            <p className="muted">School</p>
            <h2>{u.membership.school.name}</h2>
            <p className="muted">Your work is limited to this school's records and your assigned duty.</p>
          </div>

          <div className="card">
            <p className="muted">Today</p>
            <h2>Ready for school work</h2>
            <p className="muted">More activity appears here as the school's records are entered.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
