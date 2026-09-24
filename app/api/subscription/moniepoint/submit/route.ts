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
  const reference = String(body?.reference ?? "").trim();
  if (!isPlanCode(plan) || !reference) {
    return NextResponse.json({ error: "Plan and transfer reference are required." }, { status: 400 });
  }

  const existing = await db.subscriptionPayment.findUnique({ where: { reference } });
  if (existing) return NextResponse.json({ error: "This payment reference has already been submitted." }, { status: 409 });

  const payment = await db.subscriptionPayment.create({
    data: {
      schoolId: user.membership.schoolId,
      plan,
      amount: planPrice(plan),
      provider: "MONIEPOINT",
      reference,
      metadata: JSON.stringify({ submittedBy: user.email }),
    },
  });

  return NextResponse.json({ id: payment.id, status: payment.status });
}
