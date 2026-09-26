import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const tiers = {
  BASIC: { enabled: "basicEnabled", price: "basicPrice" },
  STARTER: { enabled: "starterEnabled", price: "starterPrice" },
  PRO: { enabled: "proEnabled", price: "proPrice" },
  PREMIUM: { enabled: "premiumEnabled", price: "premiumPrice" },
} as const;

const defaults = {
  basicEnabled: "true", basicPrice: "5000",
  starterEnabled: "true", starterPrice: "10000",
  proEnabled: "true", proPrice: "20000",
  premiumEnabled: "true", premiumPrice: "28000",
};

function amountFor(monthly: number, plan: "MONTHLY" | "TERM" | "YEARLY") {
  if (plan === "TERM") return Math.round(monthly * 3 * 0.95);
  if (plan === "YEARLY") return Math.round(monthly * 12 * 0.90);
  return monthly;
}

function appBaseUrl(request: Request) {
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return host ? forwardedProto + "://" + host : "https://skulgo.com";
}

export async function POST(request: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const user = await getCurrentUser();
  const { schoolId } = await params;
  if (!user?.membership || user.membership.role !== "ADMIN" || user.membership.schoolId !== schoolId) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Paystack is not configured yet." }, { status: 503 });
  const body = await request.json().catch(() => null);
  const tier = String(body?.tier ?? "") as keyof typeof tiers;
  const plan = String(body?.plan ?? "") as "MONTHLY" | "TERM" | "YEARLY";
  if (!(tier in tiers) || !["MONTHLY", "TERM", "YEARLY"].includes(plan)) {
    return NextResponse.json({ error: "Choose a valid plan and billing period." }, { status: 400 });
  }
  const rows = await db.platformSetting.findMany({ where: { key: { in: Object.keys(defaults) } } });
  const settings = { ...defaults, ...Object.fromEntries(rows.map(row => [row.key, row.value])) };
  const tierSetting = tiers[tier];
  if (settings[tierSetting.enabled as keyof typeof settings] !== "true") {
    return NextResponse.json({ error: "That plan is not currently available." }, { status: 400 });
  }
  const monthly = Number(settings[tierSetting.price as keyof typeof settings]);
  const amount = amountFor(monthly, plan);
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Invalid plan price." }, { status: 400 });
  const reference = "SKULGO-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  const payment = await db.schoolSubscriptionPayment.create({ data: { schoolId, tier, plan, amount, reference, provider: "PAYSTACK" } });
  try {
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email, amount: String(Math.round(amount * 100)), currency: "NGN", reference,
        callback_url: appBaseUrl(request) + "/plan/payment/callback",
        metadata: JSON.stringify({ schoolId, paymentId: payment.id, tier, plan }),
      }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.status || !data?.data?.authorization_url) {
      await db.schoolSubscriptionPayment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      return NextResponse.json({ error: data?.message || "Could not start Paystack checkout." }, { status: 502 });
    }
    return NextResponse.json({ authorizationUrl: data.data.authorization_url, reference });
  } catch {
    await db.schoolSubscriptionPayment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "Could not connect to Paystack." }, { status: 502 });
  }
}