import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import SchoolConnections from "@/components/school-connections";
import WorkspacePin from "@/components/workspace-pin";
import AccountIdCopy from "@/components/account-id-copy";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const accountId = user.referralCode;

  const schoolHistory = await db.schoolMembership.findMany({
    where: { userId: user.id },
    include: { school: { select: { id: true, name: true, abbr: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <h1>{user.name}</h1>
        <p className="muted">{user.email}</p>
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <h2>Personal profile</h2>
        <p className="muted">
          Your personal account is used to access SkulGo. School records stay inside each
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

      <section className="card" style={{ marginBottom: 18 }}>
        <h2>SkulGo Account ID</h2>
        <p className="muted">
          Your unique SkulGo identity. Share it when you want someone to connect with your account.
        </p>
        {accountId ? (
          <AccountIdCopy accountId={accountId} />
        ) : (
          <p className="muted">Account ID unavailable.</p>
        )}
      </section>

      <WorkspacePin configured={Boolean(user.pinHash)} />

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

      <section className="card" style={{ marginTop: 18 }}>
        <h2>School history</h2>
        {!schoolHistory.length ? (
          <p className="muted">Your school work history will appear here when a school approves your connection.</p>
        ) : (
          <div className="grid" style={{ marginTop: 12 }}>
            {schoolHistory.map(item => (
              <div key={item.id}>
                <strong>{item.school.name}</strong>
                <p className="muted">
                  {item.school.abbr} · {item.role} · Started {new Date(item.createdAt).toLocaleDateString("en-NG")}
                </p>
                {item.active ? (
                  <p className="muted">Active</p>
                ) : (
                  <p className="muted">
                    Ended {item.endedAt ? new Date(item.endedAt).toLocaleDateString("en-NG") : ""}
                    {item.endReason ? " · " + item.endReason : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
