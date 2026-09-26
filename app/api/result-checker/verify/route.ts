import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resultCheckerEnabled } from "@/lib/result-checker";

export async function POST(request: Request) {
  if (!(await resultCheckerEnabled())) {
    return NextResponse.json({ error: "Result Checker is not available." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const reference = String(body?.reference ?? "").trim();
  if (!reference) return NextResponse.json({ error: "reference is required" }, { status: 400 });

  const payment = await db.resultAccessPayment.findUnique({ where: { reference } });
  if (!payment) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (payment.status === "SUCCESS") return NextResponse.json({ ok: true });

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Payment is not configured." }, { status: 503 });

  const response = await fetch("https://api.paystack.co/transaction/verify/" + encodeURIComponent(reference), {
    headers: { Authorization: "Bearer " + secret },
  });
  const data = await response.json().catch(() => null);
  const transaction = data?.data;

  const valid =
    response.ok &&
    data?.status === true &&
    transaction?.status === "success" &&
    transaction?.reference === payment.reference &&
    transaction?.currency === payment.currency &&
    Number(transaction?.amount) === Math.round(payment.amount * 100);

  if (!valid) {
    if (transaction?.status === "failed" || transaction?.status === "abandoned" || transaction?.status === "reversed") {
      await db.resultAccessPayment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    }
    return NextResponse.json({ error: "Payment has not been verified." }, { status: 402 });
  }

  await db.resultAccessPayment.update({
    where: { id: payment.id },
    data: { status: "SUCCESS", paidAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
