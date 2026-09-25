import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { referralLevel } from "@/lib/referrals";
import SchoolConnections from "@/components/school-connections";
import WorkspacePin from "@/components/workspace-pin";

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const referral = user.referralCode
    ? await db.user.findUnique({
        where: { id: user.id },
        select: {
          referralCode: true,
          foundingNumber: true,
          _count: {
            select: {
              referrals: {
                where: { emailVerifiedAt: { not: null } },
              },
            },
          },
        },
      })
    : null;

  const referralCount = referral?._count.referrals ?? 0;

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

      <section className="card" style={{ marginBottom: 18 }}>
        <h2>My Referral</h2>
        {referral ? (
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            <div>
              <p className="muted">Referral ID</p>
              <strong>{referral.referralCode}</strong>
            </div>
            <div>
              <p className="muted">Level</p>
              <strong>{referralLevel(referralCount)}</strong>
            </div>
            <div>
              <p className="muted">Verified referrals</p>
              <strong>{referralCount}</strong>
            </div>
            {referral.foundingNumber && (
              <div style={{ gridColumn: "1 / -1" }}>
                <strong>You are among the first 100 people helping pilot SkulGo.</strong>
                <p className="muted">
                  You are one of the early believers in SkulGo. Keep your place and
                  share your Referral ID with people you trust.
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="muted">Your referral ID will be available for new accounts.</p>
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
    </main>
  );
}
