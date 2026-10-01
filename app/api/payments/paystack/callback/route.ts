import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference")?.trim();
  if (!reference) return NextResponse.json({ error: "Payment reference is required" }, { status: 400 });

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: "Online payment is not configured." }, { status: 503 });

  const verifyResponse = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );
  const verified = await verifyResponse.json().catch(() => null);

  if (!verifyResponse.ok || !verified?.status || verified?.data?.status !== "success") {
    return NextResponse.json({ error: "Payment was not confirmed by Paystack." }, { status: 402 });
  }

  const transaction = verified.data;
  const metadata = transaction.metadata ?? {};
  if (metadata.skulgo !== "school-fee" || !metadata.schoolId || !metadata.studentId || !metadata.userId) {
    return NextResponse.json({ error: "Invalid SkulGo payment metadata." }, { status: 400 });
  }

  const schoolId = String(metadata.schoolId);
  const studentId = String(metadata.studentId);
  const userId = String(metadata.userId);
  const amount = Number(transaction.amount) / 100;

  const existing = await db.payment.findFirst({ where: { reference } });
  if (!existing) {
    const fee = await db.feeRecord.findFirst({ where: { schoolId, studentId } });
    if (!fee) return NextResponse.json({ error: "Student fee record not found." }, { status: 404 });

    const paid = await db.payment.aggregate({
      where: { schoolId, studentId },
      _sum: { amount: true },
    });
    const currentPaid = paid._sum.amount ?? 0;
    const balance = Math.max(0, fee.totalFee - currentPaid);

    if (amount <= 0 || amount > balance) {
      return NextResponse.json({ error: "Verified payment does not match the student's outstanding balance." }, { status: 409 });
    }

    const student = await db.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

    const payment = await db.payment.create({
      data: {
        schoolId,
        studentId,
        amount,
        reference,
        paymentMethod: "ONLINE",
        tellerNumber: null,
        recordedById: userId,
      },
    });

    await recordAudit({
      schoolId,
      actorUserId: userId,
      action: "CREATE",
      entity: "PAYMENT",
      entityId: payment.id,
      details: {
        studentId,
        amount,
        reference,
        paymentMethod: "ONLINE",
        provider: "PAYSTACK",
      },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  return NextResponse.redirect(new URL("/fees?payment=success", appUrl));
}
