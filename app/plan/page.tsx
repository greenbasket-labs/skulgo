import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import PlanActions from "./plan-actions";

const defaults = {
  monthlyEnabled: "true",
  monthlyPrice: "0",
  termEnabled: "true",
  termPrice: "0",
  yearlyEnabled: "true",
  yearlyPrice: "0",
  trialEnabled: "true",
  trialDays: "14",
};

function money(value: number) {
  return "₦" + value.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

export default async function PlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.membership || user.membership.role !== "ADMIN") redirect("/dashboard");

  const schoolId = user.membership.schoolId;
  const [subscription, rows] = await Promise.all([
    db.schoolSubscription.findUnique({ where: { schoolId } }),
    db.platformSetting.findMany({ where: { key: { in: Object.keys(defaults) } } }),
  ]);

  if (!subscription) {
    return (
      <main className="workspace">
        <section className="workspace-main">
          <div className="card">
            <h1>Plan</h1>
            <p className="muted">No school plan record was found.</p>
            <Link className="button" href="/dashboard">Back to dashboard</Link>
          </div>
        </section>
      </main>
    );
  }

  const settings = { ...defaults, ...Object.fromEntries(rows.map(row => [row.key, row.value])) };
  const now = new Date();
  const effectiveStatus =
    subscription.status === "TRIAL" && subscription.expiresAt && subscription.expiresAt <= now
      ? "EXPIRED"
      : subscription.status;

  const plans = [
    { label: "Monthly", price: Number(settings.monthlyPrice), enabled: settings.monthlyEnabled === "true" },
    { label: "Term", price: Number(settings.termPrice), enabled: settings.termEnabled === "true" },
    { label: "Yearly", price: Number(settings.yearlyPrice), enabled: settings.yearlyEnabled === "true" },
  ].filter(item => item.enabled);

  return (
    <main className="workspace">
      <aside className="workspace-sidebar">
        <div className="workspace-brand">SkulGo</div>
        <div className="workspace-school">
          <strong>{user.membership.school.name}</strong>
          <span>{user.membership.school.abbr}</span>
        </div>
        <nav className="workspace-nav">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/applications">Applications</Link>
          <Link href="/staff">Staff</Link>
          <Link href="/sections">Sections</Link>
          <Link href="/classes">Classes</Link>
          <Link href="/subjects">Subjects</Link>
          <Link href="/assign">Assign</Link>
          <Link href="/fees">Fees</Link>
          <Link href="/admin/attendance">Attendance</Link>
          <Link href="/announcements">Announcements</Link>
          <Link href="/support">Talk to SkulGo Support</Link>
          <Link href="/settings">Result Settings</Link>
          <Link href="/plan">Plan</Link>
          <Link href="/account">My Account</Link>
        </nav>
        <div className="workspace-person">
          <strong>{user.name}</strong>
          <span>ADMIN</span>
        </div>
      </aside>

      <section className="workspace-main">
        <div className="workspace-header">
          <div>
            <p className="muted">School plan · {user.membership.school.name}</p>
            <h1>Plan</h1>
          </div>
        </div>

        <div className="card">
          <p className="muted">Current status</p>
          <h2>{effectiveStatus}</h2>
          {subscription.status === "TRIAL" && subscription.startedAt && subscription.expiresAt && (
            <p className="muted">
              {"Free trial started " + subscription.startedAt.toLocaleDateString("en-NG") + " · ends " + subscription.expiresAt.toLocaleDateString("en-NG") + "."}
            </p>
          )}
          {subscription.status === "TRIAL" && !subscription.startedAt && (
            <p className="muted">Your free trial starts when the school approves its first person.</p>
          )}
          {effectiveStatus === "EXPIRED" && (
            <p className="muted">The free trial has ended. Choose an available paid plan when payment is ready.</p>
          )}
          <PlanActions status={effectiveStatus} schoolId={schoolId} />
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <h2>Available plans</h2>
          {!plans.length ? (
            <p className="muted">No paid plans are currently enabled by SkulGo.</p>
          ) : (
            <div className="grid grid-2" style={{ marginTop: 12 }}>
              {plans.map(plan => (
                <div className="card" key={plan.label}>
                  <strong>{plan.label}</strong>
                  <div className="stat">{money(plan.price)}</div>
                  <p className="muted">Configured by SkulGo.</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <h2>Free trial</h2>
          <p className="muted">
            {settings.trialEnabled === "true"
              ? "SkulGo has configured a " + Number(settings.trialDays) + "-day free trial. It begins at the school's first approval, not at school creation."
              : "The SkulGo free trial is currently disabled."}
          </p>
        </div>
      </section>
    </main>
  );
}
