import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { decryptProviderSecret } from "@/lib/payment-provider-secrets";

async function getMonnifyToken(apiKey: string, secretKey: string, baseUrl: string) {
  const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString("base64");
  const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}` },
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.requestSuccessful || !data?.responseBody?.accessToken) {
    throw new Error(data?.responseMessage || "Unable to authenticate with Monnify.");
  }
  return data.responseBody.accessToken as string;
}

export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("schoolId")?.trim();
  const paymentReference =
    request.nextUrl.searchParams.get("paymentReference")?.trim() ||
    request.nextUrl.searchParams.get("paymentreference")?.trim();

  if (!schoolId || !paymentReference) {
    return NextResponse.json({ error: "Payment reference is required" }, { status: 400 });
  }

  const provider = await db.paymentProvider.findUnique({ where: { schoolId_provider: { schoolId, provider: "MONIEPOINT" } } });
  const apiKey = decryptProviderSecret(provider?.apiKeyEncrypted);
  const secretKey = decryptProviderSecret(provider?.secretKeyEncrypted);
  if (!apiKey || !secretKey) {
    return NextResponse.json({ error: "Moniepoint online payment is not configured." }, { status: 503 });
  }

  const baseUrl = process.env.MONNIFY_BASE_URL || "https://api.monnify.com";

  try {
    const token = await getMonnifyToken(apiKey, secretKey, baseUrl);
    const verifyResponse = await fetch(
      `${baseUrl}/api/v2/merchant/transactions/query?paymentReference=${encodeURIComponent(paymentReference)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const verified = await verifyResponse.json().catch(() => null);

    if (!verifyResponse.ok || !verified?.requestSuccessful) {
      return NextResponse.json({ error: verified?.responseMessage || "Payment could not be verified with Monnify." }, { status: 402 });
    }

    const transaction = verified.responseBody;
    if (transaction?.paymentStatus !== "PAID") {
      return NextResponse.json({ error: "Payment was not confirmed by Monnify." }, { status: 402 });
    }

    const metadata = transaction.metaData ?? transaction.metadata ?? {};
    if (metadata.skulgo !== "school-fee" || !metadata.schoolId || !metadata.studentId || !metadata.userId) {
      return NextResponse.json({ error: "Invalid SkulGo payment metadata." }, { status: 400 });
    }

    const schoolId = String(metadata.schoolId);
    const studentId = String(metadata.studentId);
    const userId = String(metadata.userId);
    const amount = Number(transaction.amountPaid);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Invalid verified payment amount." }, { status: 400 });
    }

    const existing = await db.payment.findFirst({ where: { reference: paymentReference } });
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
          transactionReference: transaction.transactionReference,
          paymentMethod: "ONLINE",
          provider: "MONIEPOINT",
        },
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    return NextResponse.redirect(new URL("/fees?payment=success", appUrl));
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Payment verification failed.",
    }, { status: 502 });
  }
}
