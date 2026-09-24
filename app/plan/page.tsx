import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import SubscriptionPlanPicker from "@/components/subscription-plan-picker";
import { isPlanCode, type SubscriptionPlanCode } from "@/lib/subscription-plans";

export default async function PlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.membership || user.membership.role !== "ADMIN") redirect("/dashboard");

  const subscription = await db.schoolSubscription.findUnique({
    where: { schoolId: user.membership.schoolId },
    select: { productPlan: true, status: true, expiresAt: true },
  });

  const moniepoint = process.env.MONIEPOINT_BANK_NAME && process.env.MONIEPOINT_ACCOUNT_NAME && process.env.MONIEPOINT_ACCOUNT_NUMBER
    ? {
        bankName: process.env.MONIEPOINT_BANK_NAME,
        accountName: process.env.MONIEPOINT_ACCOUNT_NAME,
        accountNumber: process.env.MONIEPOINT_ACCOUNT_NUMBER,
      }
    : null;

  const currentPlan = subscription?.productPlan && isPlanCode(subscription.productPlan)
    ? (subscription.plan as SubscriptionPlanCode)
    : null;

  return (
    <main className="workspace">
      <aside className="workspace-sidebar">
        <div className="workspace-brand">SkulGo</div>
        <div className="workspace-school">
          <strong>{user.membership.school.name}</strong>
          <span>{user.membership.school.abbr}</span>
        </div>
        <nav className="workspace-nav">
          <a href="/dashboard">Dashboard</a>
          <a href="/plan">Plan</a>
          <a href="/fees">Fees</a>
          <a href="/settings">Result Settings</a>
          <a href="/account">My Account</a>
        </nav>
        <div className="workspace-person">
          <strong>{user.name}</strong>
          <span>ADMIN</span>
        </div>
      </aside>

      <section className="workspace-main">
        <div className="workspace-header">
          <div>
            <p className="muted">School subscription · {user.membership.school.name}</p>
            <h1>Plan</h1>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 18 }}>
          <strong>Simple school pricing</strong>
          <p className="muted">Choose the plan that fits your school's current usage. Capacity limits remain configurable while we finish real infrastructure testing.</p>
        </div>

        <SubscriptionPlanPicker
          moniepoint={moniepoint}
          currentPlan={currentPlan}
          currentStatus={subscription?.status ?? "TRIAL"}
          expiresAt={subscription?.expiresAt?.toISOString() ?? null}
        />

        <div className="card" style={{ marginTop: 18 }}>
          <strong>Result unlock</strong>
          <p className="muted">The ₦200 result unlock is separate from your school subscription.</p>
        </div>
      </section>
    </main>
  );
}
