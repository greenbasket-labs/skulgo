import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import SchoolConnections from "@/components/school-connections";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">Personal account</p>
        <h1>{user.name}</h1>
        <p className="muted">{user.email}</p>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <h2>My profile</h2>
        <p className="muted">
          This is your personal SkulGo profile. School records stay inside each
          school workspace.
        </p>
        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <div>
            <p className="muted">Name</p>
            <strong>{user.name}</strong>
          </div>
          <div>
            <p className="muted">Email</p>
            <strong>{user.email}</strong>
          </div>
          {user.teacher && (
            <div>
              <p className="muted">Teacher ID</p>
              <strong>{user.teacher.teacherCode}</strong>
            </div>
          )}
          {user.student && (
            <div>
              <p className="muted">Admission ID</p>
              <strong>{user.student.admissionId}</strong>
            </div>
          )}
        </div>
      </section>

      <SchoolConnections
        memberships={user.memberships.map(membership => ({
          id: membership.id,
          role: membership.role,
          school: {
            id: membership.school.id,
            name: membership.school.name,
            abbr: membership.school.abbr,
          },
        }))}
      />
    </main>
  );
}
