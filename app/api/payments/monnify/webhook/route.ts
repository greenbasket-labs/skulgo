import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { decryptProviderSecret } from "@/lib/payment-provider-secrets";

function validSignature(rawBody: string, signature: string | null, secretKey: string) {
  if (!signature) return false;
  const expected = crypto.createHash("sha512").update(secretKey + rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("monnify-signature");
  const payload = JSON.parse(rawBody || "{}");
  const event = payload.eventData ?? {};
  const metadata = event.metaData ?? event.metadata ?? {};
  const schoolId = String(metadata.schoolId ?? "").trim();
  if (!schoolId) return NextResponse.json({ received: true });

  const provider = await db.paymentProvider.findUnique({
    where: { schoolId_provider: { schoolId, provider: "MONIEPOINT" } },
  });
  const secretKey = decryptProviderSecret(provider?.secretKeyEncrypted);
  if (!secretKey) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  if (!validSignature(rawBody, signature, secretKey)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }
  if (payload?.eventType !== "SUCCESSFUL_TRANSACTION") {
    return NextResponse.json({ received: true });
  }

  const paymentReference = String(event.paymentReference ?? "").trim();

  if (!paymentReference || metadata.skulgo !== "school-fee" || !metadata.schoolId || !metadata.studentId || !metadata.userId) {
    return NextResponse.json({ received: true });
  }

  if (event.paymentStatus !== "PAID") {
    return NextResponse.json({ received: true });
  }

  const studentId = String(metadata.studentId);
  const userId = String(metadata.userId);
  const amount = Number(event.amountPaid);

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Invalid payment amount." }, { status: 400 });
  }

  const existing = await db.payment.findFirst({ where: { reference: paymentReference } });
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
      reference: paymentReference,
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
      reference: paymentReference,
      transactionReference: event.transactionReference,
      paymentMethod: "ONLINE",
      provider: "MONIEPOINT",
      source: "WEBHOOK",
    },
  });

  return NextResponse.json({ received: true, recorded: true });
}
