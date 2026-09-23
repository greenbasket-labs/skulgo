import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

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

      <section className="card">
        <h2>My schools</h2>
        {!user.memberships.length ? (
          <p className="muted">No school connection yet.</p>
        ) : (
          <div className="grid">
            {user.memberships.map(membership => (
              <div className="card" key={membership.id}>
                <strong>{membership.school.name}</strong>
                <p className="muted">{membership.role}</p>
                <p className="muted">School connection</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
