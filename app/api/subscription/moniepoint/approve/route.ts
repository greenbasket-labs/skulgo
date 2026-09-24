import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin school access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const reference = String(body?.reference ?? "");
  const payment = await db.subscriptionPayment.findUnique({ where: { reference } });

  if (!payment || payment.schoolId !== user.membership.schoolId || payment.provider !== "MONIEPOINT") {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  await db.$transaction(async tx => {
    const subscription = await tx.schoolSubscription.upsert({
      where: { schoolId: payment.schoolId },
      update: { plan: payment.plan, status: "ACTIVE", startedAt: new Date(), expiresAt },
      create: { schoolId: payment.schoolId, plan: payment.plan, status: "ACTIVE", startedAt: new Date(), expiresAt },
    });

    await tx.subscriptionPayment.update({
      where: { reference },
      data: { status: "PAID", paidAt: new Date(), subscriptionId: subscription.id },
    });
  });

  return NextResponse.json({ paid: true });
}
