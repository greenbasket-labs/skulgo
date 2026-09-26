import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const schoolId = user.membership.schoolId;
  const [subscription, rows] = await Promise.all([
    db.schoolSubscription.findUnique({ where: { schoolId } }),
    db.platformSetting.findMany({
      where: { key: { in: Object.keys(defaults) } },
    }),
  ]);

  if (!subscription) {
    return NextResponse.json({ error: "School plan not found" }, { status: 404 });
  }

  const settings = { ...defaults, ...Object.fromEntries(rows.map(row => [row.key, row.value])) };
  let current = subscription;

  if (current.status === "TRIAL" && current.expiresAt && current.expiresAt <= new Date()) {
    current = await db.schoolSubscription.update({
      where: { id: current.id },
      data: { status: "EXPIRED" },
    });
  }

  return NextResponse.json({
    subscription: current,
    plans: [
      { key: "MONTHLY", label: "Monthly", enabled: settings.monthlyEnabled === "true", price: Number(settings.monthlyPrice) },
      { key: "TERM", label: "Term", enabled: settings.termEnabled === "true", price: Number(settings.termPrice) },
      { key: "YEARLY", label: "Yearly", enabled: settings.yearlyEnabled === "true", price: Number(settings.yearlyPrice) },
    ].filter(plan => plan.enabled),
    trial: {
      enabled: settings.trialEnabled === "true",
      days: Number(settings.trialDays),
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "");
  if (action !== "PAUSE" && action !== "RESUME") {
    return NextResponse.json({ error: "Action must be PAUSE or RESUME" }, { status: 400 });
  }

  const subscription = await db.schoolSubscription.findUnique({
    where: { schoolId: user.membership.schoolId },
  });

  if (!subscription) {
    return NextResponse.json({ error: "School plan not found" }, { status: 404 });
  }

  if (action === "PAUSE" && subscription.status !== "ACTIVE") {
    return NextResponse.json({ error: "Only an active paid plan can be paused." }, { status: 400 });
  }

  if (action === "RESUME" && subscription.status !== "PAUSED") {
    return NextResponse.json({ error: "Only a paused paid plan can be resumed." }, { status: 400 });
  }

  const updated = await db.schoolSubscription.update({
    where: { id: subscription.id },
    data: { status: action === "PAUSE" ? "PAUSED" : "ACTIVE" },
  });

  return NextResponse.json({ ok: true, subscription: updated });
}
