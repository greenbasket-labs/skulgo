import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPlanCode, planPrice } from "@/lib/subscription-plans";

async function fulfill(reference: string, transaction: { status: string; amount: number; reference: string }) {
  const payment = await db.subscriptionPayment.findUnique({ where: { reference } });
  if (!payment) return false;
  if (payment.status === "PAID") return true;

  const expectedKobo = Math.round(payment.amount * 100);
  if (transaction.status !== "success" || transaction.reference !== reference || transaction.amount !== expectedKobo) return false;

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  await db.$transaction(async tx => {
    const subscription = await tx.schoolSubscription.upsert({
      where: { schoolId: payment.schoolId },
      update: {
        plan: "MONTHLY",
        productPlan: payment.plan,
        status: "ACTIVE",
        startedAt: new Date(),
        expiresAt,
      },
      create: {
        schoolId: payment.schoolId,
        plan: payment.plan,
        status: "ACTIVE",
        startedAt: new Date(),
        expiresAt,
      },
    });

    await tx.subscriptionPayment.update({
      where: { reference },
      data: { status: "PAID", paidAt: new Date(), subscriptionId: subscription.id },
    });
  });

  return true;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin school access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const reference = String(body?.reference ?? "");
  if (!reference) return NextResponse.json({ error: "Reference is required." }, { status: 400 });

  const payment = await db.subscriptionPayment.findUnique({ where: { reference } });
  if (!payment || payment.schoolId !== user.membership.schoolId) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }
  if (!isPlanCode(payment.plan) || payment.amount !== planPrice(payment.plan)) {
    return NextResponse.json({ error: "Payment configuration mismatch." }, { status: 409 });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Paystack is not configured yet." }, { status: 503 });

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.status) {
    return NextResponse.json({ error: data?.message || "Paystack verification failed." }, { status: 502 });
  }

  const paid = await fulfill(reference, data.data);
  return NextResponse.json({ paid, status: data.data?.status ?? "unknown" });
}
