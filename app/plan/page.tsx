import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import PlanActions from "./plan-actions";
import PlanPurchase from "./plan-purchase";

const defaults = {
  basicEnabled: "true", basicPrice: "5000",
  starterEnabled: "true", starterPrice: "10000",
  proEnabled: "true", proPrice: "20000",
  premiumEnabled: "true", premiumPrice: "28000",
  trialEnabled: "true", trialDays: "14",
};

const tiers = [
  { key: "BASIC", label: "Basic", students: 50, staff: 5, setting: "basic" },
  { key: "STARTER", label: "Starter", students: 150, staff: 15, setting: "starter" },
  { key: "PRO", label: "Pro", students: 500, staff: 40, setting: "pro" },
  { key: "PREMIUM", label: "Premium", students: 1000, staff: 75, setting: "premium" },
] as const;

function money(value: number) {
  return "₦" + value.toLocaleString("en-NG", { maximumFractionDigits: 0 });
}

function price(monthly: number, plan: "MONTHLY" | "TERM" | "YEARLY") {
  if (plan === "TERM") return Math.round(monthly * 3 * 0.95);
  if (plan === "YEARLY") return Math.round(monthly * 12 * 0.90);
  return monthly;
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
    return <main className="workspace"><section className="workspace-main"><div className="card">
      <h1>Plan</h1><p className="muted">No school plan record was found.</p>
      <Link className="button" href="/dashboard">Back to dashboard</Link>
    </div></section></main>;
  }

  const settings = { ...defaults, ...Object.fromEntries(rows.map(row => [row.key, row.value])) };
  const effectiveStatus = subscription.status === "TRIAL" && subscription.expiresAt && subscription.expiresAt <= new Date()
    ? "EXPIRED" : subscription.status;
  const currentTier = tiers.find(tier => tier.key === subscription.tier) ?? tiers[0];

  const plans = tiers.map(tier => {
    const monthly = Number(settings[tier.setting + "Price" as keyof typeof settings]);
    return {
      ...tier,
      enabled: settings[tier.setting + "Enabled" as keyof typeof settings] === "true",
      monthly: price(monthly, "MONTHLY"),
      term: price(monthly, "TERM"),
      yearly: price(monthly, "YEARLY"),
    };
  }).filter(plan => plan.enabled);

  return (
    <main className="workspace">
      <aside className="workspace-sidebar">
        <div className="workspace-brand">SkulGo</div>
        <div className="workspace-school"><strong>{user.membership.school.name}</strong><span>{user.membership.school.abbr}</span></div>
        <nav className="workspace-nav">
          <Link href="/dashboard">Dashboard</Link><Link href="/applications">Applications</Link><Link href="/staff">Staff</Link>
          <Link href="/sections">Sections</Link><Link href="/classes">Classes</Link><Link href="/subjects">Subjects</Link>
          <Link href="/assign">Assign</Link><Link href="/fees">Fees</Link><Link href="/admin/attendance">Attendance</Link>
          <Link href="/announcements">Announcements</Link><Link href="/support">Talk to SkulGo Support</Link>
          <Link href="/settings">Result Settings</Link><Link href="/plan">Plan</Link><Link href="/account">My Account</Link>
        </nav>
        <div className="workspace-person"><strong>{user.name}</strong><span>ADMIN</span></div>
      </aside>

      <section className="workspace-main">
        <div className="workspace-header"><div><p className="muted">School plan · {user.membership.school.name}</p><h1>Plan</h1></div></div>

        <div className="card">
          <p className="muted">Current plan</p>
          <h2>{currentTier.label} · {subscription.plan}</h2>
          <p className="muted">{currentTier.students.toLocaleString("en-NG")} students · {currentTier.staff} staff</p>
          <p className="muted">Status: {effectiveStatus}</p>
          {subscription.status === "TRIAL" && subscription.startedAt && subscription.expiresAt && (
            <p className="muted">Free trial started {subscription.startedAt.toLocaleDateString("en-NG")} · ends {subscription.expiresAt.toLocaleDateString("en-NG")}.</p>
          )}
          {subscription.status === "TRIAL" && !subscription.startedAt && (
            <p className="muted">Your free trial starts when the school approves its first person.</p>
          )}
          {effectiveStatus === "EXPIRED" && <p className="muted">The free trial has ended. Choose an available paid plan when payment is ready.</p>}
          {subscription.status === "PAUSED" && subscription.pausedAt && subscription.expiresAt && (
            <p className="muted">
              Paid time is paused. Your plan will keep the remaining time when you resume.
            </p>
          )}
          <PlanActions status={effectiveStatus} schoolId={schoolId} />
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <h2>Available plans</h2>
          <p className="muted">Choose a school size and billing period.</p>
          <div className="grid grid-2" style={{ marginTop: 12 }}>
            {plans.map(plan => (
              <div className="card" key={plan.key}>
                <strong>{plan.label}</strong>
                <p className="muted">{plan.students.toLocaleString("en-NG")} students · {plan.staff} staff</p>
                <div>Monthly: <strong>{money(plan.monthly)}</strong></div>
                <div>Term: <strong>{money(plan.term)}</strong></div>
                <div>Yearly: <strong>{money(plan.yearly)}</strong></div>
              </div>
            ))}
          </div>
          <div className="card" style={{ marginTop: 12 }}>
            <strong>Custom</strong>
            <p className="muted">For schools above Premium capacity. Pricing is handled separately.</p>
          </div>
        </div>

        <PlanPurchase schoolId={schoolId} plans={plans} paystackEnabled={Boolean(process.env.PAYSTACK_SECRET_KEY)} />

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
