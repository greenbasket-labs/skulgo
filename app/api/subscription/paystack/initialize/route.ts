import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPlanCode, planPrice } from "@/lib/subscription-plans";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin school access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const plan = String(body?.plan ?? "");
  if (!isPlanCode(plan)) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Paystack is not configured yet." }, { status: 503 });

  const amount = planPrice(plan);
  const reference = `SKG-${user.membership.schoolId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  const appUrl = process.env.APP_URL || "https://skulgo.com";

  await db.subscriptionPayment.create({
    data: {
      schoolId: user.membership.schoolId,
      plan,
      amount,
      provider: "PAYSTACK",
      reference,
      metadata: JSON.stringify({ email: user.email }),
    },
  });

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      amount: String(Math.round(amount * 100)),
      currency: "NGN",
      reference,
      callback_url: `${appUrl}/plan?payment=paystack&reference=${encodeURIComponent(reference)}`,
      metadata: { schoolId: user.membership.schoolId, plan, reference },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.status || !data?.data?.authorization_url) {
    await db.subscriptionPayment.update({ where: { reference }, data: { status: "FAILED" } });
    return NextResponse.json({ error: data?.message || "Paystack initialization failed." }, { status: 502 });
  }

  return NextResponse.json({
    authorizationUrl: data.data.authorization_url,
    reference,
  });
}
