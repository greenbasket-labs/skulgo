import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const secretHash = process.env.FLW_SECRET_HASH;
  const receivedHash = request.headers.get("verif-hash");

  if (secretHash && receivedHash !== secretHash) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (payload?.event !== "charge.completed") return NextResponse.json({ received: true });

  const event = payload.data;
  if (!event || event.status !== "successful" || event.currency !== "NGN") {
    return NextResponse.json({ received: true });
  }

  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });

  const transactionId = String(event.id ?? "");
  if (!transactionId) return NextResponse.json({ received: true });

  const verifyResponse = await fetch(
    `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(transactionId)}/verify`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );
  const verified = await verifyResponse.json().catch(() => null);

  if (
    !verifyResponse.ok ||
    verified?.status !== "success" ||
    verified?.data?.status !== "successful" ||
    verified?.data?.currency !== "NGN" ||
    verified?.data?.tx_ref !== event.tx_ref
  ) {
    return NextResponse.json({ error: "Webhook transaction could not be verified." }, { status: 409 });
  }

  const transaction = verified.data;
  const metadata = transaction.meta ?? transaction.metadata ?? {};
  if (metadata.skulgo !== "school-fee" || !metadata.schoolId || !metadata.studentId || !metadata.userId) {
    return NextResponse.json({ received: true });
  }

  const schoolId = String(metadata.schoolId);
  const studentId = String(metadata.studentId);
  const userId = String(metadata.userId);
  const reference = String(transaction.tx_ref);
  const amount = Number(transaction.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid transaction amount." }, { status: 400 });
  }

  const existing = await db.payment.findFirst({ where: { reference } });
  if (existing) return NextResponse.json({ received: true, recorded: false });

  const fee = await db.feeRecord.findFirst({ where: { schoolId, studentId } });
  if (!fee) return NextResponse.json({ error: "Student fee record not found." }, { status: 404 });

  const paid = await db.payment.aggregate({
    where: { schoolId, studentId },
    _sum: { amount: true },
  });
  const currentPaid = paid._sum.amount ?? 0;
  const balance = Math.max(0, fee.totalFee - currentPaid);

  if (amount > balance) {
    return NextResponse.json({ error: "Payment exceeds outstanding balance." }, { status: 409 });
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
      transactionId,
      paymentMethod: "ONLINE",
      provider: "FLUTTERWAVE",
      source: "WEBHOOK",
    },
  });

  return NextResponse.json({ received: true, recorded: true });
}
