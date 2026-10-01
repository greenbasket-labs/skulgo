import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const txRef = request.nextUrl.searchParams.get("tx_ref")?.trim();
  const transactionId = request.nextUrl.searchParams.get("transaction_id")?.trim();
  const status = request.nextUrl.searchParams.get("status")?.trim();

  if (!txRef) return NextResponse.json({ error: "Payment reference is required" }, { status: 400 });

  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: "Flutterwave online payment is not configured." }, { status: 503 });

  if (status !== "successful" || !transactionId) {
    return NextResponse.json({ error: "Payment was not completed." }, { status: 402 });
  }

  const verifyResponse = await fetch(
    `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );
  const verified = await verifyResponse.json().catch(() => null);

  if (!verifyResponse.ok || verified?.status !== "success") {
    return NextResponse.json({ error: "Payment could not be verified by Flutterwave." }, { status: 402 });
  }

  const transaction = verified.data;
  if (
    transaction?.status !== "successful" ||
    transaction?.currency !== "NGN" ||
    transaction?.tx_ref !== txRef
  ) {
    return NextResponse.json({ error: "Flutterwave verification did not match this payment." }, { status: 409 });
  }

  const metadata = transaction.meta ?? transaction.metadata ?? {};
  if (metadata.skulgo !== "school-fee" || !metadata.schoolId || !metadata.studentId || !metadata.userId) {
    return NextResponse.json({ error: "Invalid SkulGo payment metadata." }, { status: 400 });
  }

  const schoolId = String(metadata.schoolId);
  const studentId = String(metadata.studentId);
  const userId = String(metadata.userId);
  const amount = Number(transaction.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid verified payment amount." }, { status: 400 });
  }

  const existing = await db.payment.findFirst({ where: { reference: txRef } });
  if (!existing) {
    const fee = await db.feeRecord.findFirst({ where: { schoolId, studentId } });
    if (!fee) return NextResponse.json({ error: "Student fee record not found." }, { status: 404 });

    const paid = await db.payment.aggregate({
      where: { schoolId, studentId },
      _sum: { amount: true },
    });
    const currentPaid = paid._sum.amount ?? 0;
    const balance = Math.max(0, fee.totalFee - currentPaid);

    if (amount > balance) {
      return NextResponse.json({ error: "Verified payment exceeds the student's outstanding balance." }, { status: 409 });
    }

    const student = await db.student.findFirst({ where: { id: studentId, schoolId } });
    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

    const payment = await db.payment.create({
      data: {
        schoolId,
        studentId,
        amount,
        reference: txRef,
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
        reference: txRef,
        transactionId,
        paymentMethod: "ONLINE",
        provider: "FLUTTERWAVE",
      },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  return NextResponse.redirect(new URL("/fees?payment=success", appUrl));
}
