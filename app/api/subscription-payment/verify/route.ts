import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function addPeriod(from: Date, plan: "MONTHLY" | "TERM" | "YEARLY") {
  const date = new Date(from);
  if (plan === "MONTHLY") date.setMonth(date.getMonth() + 1);
  if (plan === "TERM") date.setMonth(date.getMonth() + 3);
  if (plan === "YEARLY") date.setFullYear(date.getFullYear() + 1);
  return date;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const reference = new URL(request.url).searchParams.get("reference");
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!reference || !secret) return NextResponse.json({ error: "Payment reference is required." }, { status: 400 });
  const payment = await db.schoolSubscriptionPayment.findUnique({ where: { reference } });
  if (!payment || payment.schoolId !== user.membership.schoolId) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (payment.status === "SUCCESS") return NextResponse.json({ ok: true, status: "SUCCESS" });

  const response = await fetch("https://api.paystack.co/transaction/verify/" + encodeURIComponent(reference), {
    headers: { Authorization: "Bearer " + secret }, cache: "no-store",
  });
  const result = await response.json().catch(() => null);
  const transaction = result?.data;
  const expectedKobo = Math.round(payment.amount * 100);
  if (!response.ok || !result?.status || transaction?.status !== "success") {
    return NextResponse.json({ ok: false, status: transaction?.status || "PENDING", error: "Payment has not been confirmed." }, { status: 400 });
  }
  if (transaction.reference !== reference || transaction.currency !== payment.currency || Number(transaction.amount) !== expectedKobo) {
    await db.schoolSubscriptionPayment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "Payment verification did not match the expected amount." }, { status: 400 });
  }
  const now = new Date();
  const subscription = await db.schoolSubscription.findUnique({ where: { schoolId: payment.schoolId } });
  if (!subscription) return NextResponse.json({ error: "School plan not found." }, { status: 404 });
  const baseDate = subscription.expiresAt && subscription.expiresAt > now ? subscription.expiresAt : now;
  const expiresAt = addPeriod(baseDate, payment.plan);
  await db.$transaction([
    db.schoolSubscriptionPayment.update({ where: { id: payment.id }, data: { status: "SUCCESS", paidAt: transaction.paid_at ? new Date(transaction.paid_at) : now } }),
    db.schoolSubscription.update({ where: { id: subscription.id }, data: { tier: payment.tier, plan: payment.plan, status: "ACTIVE", startedAt: now, expiresAt } }),
  ]);
  return NextResponse.json({ ok: true, status: "SUCCESS", tier: payment.tier, plan: payment.plan, expiresAt });
}