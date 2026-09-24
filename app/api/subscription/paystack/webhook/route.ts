import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

async function fulfill(reference: string, transaction: { status: string; amount: number; reference: string }) {
  const payment = await db.subscriptionPayment.findUnique({ where: { reference } });
  if (!payment || payment.status === "PAID") return;

  if (transaction.status !== "success" || transaction.reference !== reference) return;
  if (transaction.amount !== Math.round(payment.amount * 100)) return;

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  await db.$transaction(async tx => {
    const subscription = await tx.schoolSubscription.upsert({
      where: { schoolId: payment.schoolId },
      update: { plan: "MONTHLY", productPlan: payment.plan, status: "ACTIVE", startedAt: new Date(), expiresAt },
      create: { schoolId: payment.schoolId, plan: payment.plan, status: "ACTIVE", startedAt: new Date(), expiresAt },
    });

    await tx.subscriptionPayment.update({
      where: { reference },
      data: { status: "PAID", paidAt: new Date(), subscriptionId: subscription.id },
    });
  });
}

export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", secret).update(raw).digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (!signature || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(raw);
  if (event?.event === "charge.success" && event?.data?.reference) {
    await fulfill(event.data.reference, event.data);
  }

  return NextResponse.json({ received: true });
}
