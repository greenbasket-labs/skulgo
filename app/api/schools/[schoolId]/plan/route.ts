import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const defaults = {
  basicEnabled: "true", basicPrice: "5000",
  starterEnabled: "true", starterPrice: "10000",
  proEnabled: "true", proPrice: "20000",
  premiumEnabled: "true", premiumPrice: "28000",
  trialEnabled: "true", trialDays: "14",
};

const tierDetails = [
  { key: "BASIC", label: "Basic", students: 50, staff: 5, setting: "basic" },
  { key: "STARTER", label: "Starter", students: 150, staff: 15, setting: "starter" },
  { key: "PRO", label: "Pro", students: 500, staff: 40, setting: "pro" },
  { key: "PREMIUM", label: "Premium", students: 1000, staff: 75, setting: "premium" },
] as const;

function priceForMonthly(monthly: number, plan: "MONTHLY" | "TERM" | "YEARLY") {
  if (plan === "TERM") return Math.round(monthly * 3 * 0.95);
  if (plan === "YEARLY") return Math.round(monthly * 12 * 0.90);
  return monthly;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const schoolId = user.membership.schoolId;
  const [subscription, rows] = await Promise.all([
    db.schoolSubscription.findUnique({ where: { schoolId } }),
    db.platformSetting.findMany({ where: { key: { in: Object.keys(defaults) } } }),
  ]);
  if (!subscription) return NextResponse.json({ error: "School plan not found" }, { status: 404 });
  const settings = { ...defaults, ...Object.fromEntries(rows.map(row => [row.key, row.value])) };
  let current = subscription;
  if (current.status === "TRIAL" && current.expiresAt && current.expiresAt <= new Date()) {
    current = await db.schoolSubscription.update({ where: { id: current.id }, data: { status: "EXPIRED" } });
  }
  const plans = tierDetails.map(tier => {
    const enabled = settings[tier.setting + "Enabled" as keyof typeof settings] === "true";
    const monthly = Number(settings[tier.setting + "Price" as keyof typeof settings]);
    return { key: tier.key, label: tier.label, enabled, students: tier.students, staff: tier.staff,
      prices: { monthly, term: priceForMonthly(monthly, "TERM"), yearly: priceForMonthly(monthly, "YEARLY") } };
  }).filter(plan => plan.enabled);
  return NextResponse.json({
    subscription,
    plans,
    customPlan: { label: "Custom", students: null, staff: null, message: "For schools above Premium capacity." },
    trial: { enabled: settings.trialEnabled === "true", days: Number(settings.trialDays) },
    payments: { paystack: Boolean(process.env.PAYSTACK_SECRET_KEY) },
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "");
  if (action !== "PAUSE" && action !== "RESUME") return NextResponse.json({ error: "Action must be PAUSE or RESUME" }, { status: 400 });
  const subscription = await db.schoolSubscription.findUnique({ where: { schoolId: user.membership.schoolId } });
  if (!subscription) return NextResponse.json({ error: "School plan not found" }, { status: 404 });
  if (action === "PAUSE" && subscription.status !== "ACTIVE") return NextResponse.json({ error: "Only an active paid plan can be paused." }, { status: 400 });
  if (action === "RESUME" && subscription.status !== "PAUSED") return NextResponse.json({ error: "Only a paused paid plan can be resumed." }, { status: 400 });
  const updated = await db.schoolSubscription.update({ where: { id: subscription.id }, data: { status: action === "PAUSE" ? "PAUSED" : "ACTIVE" } });
  return NextResponse.json({ ok: true, subscription: updated });
}