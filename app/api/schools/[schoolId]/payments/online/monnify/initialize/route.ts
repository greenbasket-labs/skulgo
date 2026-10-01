import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { decryptProviderSecret } from "@/lib/payment-provider-secrets";

function allowedStudent(schoolId: string, userId: string, role: "STUDENT" | "PARENT", studentId: string) {
  if (role === "STUDENT") {
    return db.student.findFirst({
      where: { schoolId, userId, id: studentId },
      select: { id: true, admissionId: true, firstName: true, lastName: true },
    });
  }

  return db.parent.findUnique({
    where: { userId },
    select: { id: true },
  }).then(parent => parent
    ? db.student.findFirst({
        where: {
          id: studentId,
          schoolId,
          parentLinks: { some: { parentId: parent.id, approved: true } },
        },
        select: { id: true, admissionId: true, firstName: true, lastName: true },
      })
    : null);
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const membership = user.membership?.schoolId === schoolId && user.membership.active
    ? user.membership
    : null;

  if (!membership || (membership.role !== "STUDENT" && membership.role !== "PARENT")) {
    return NextResponse.json({ error: "Parent or student access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const studentId = String(body?.studentId ?? "").trim();
  const amount = Number(body?.amount);

  if (!studentId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Student and a positive payment amount are required" }, { status: 400 });
  }

  const student = await allowedStudent(schoolId, user.id, membership.role, studentId);
  if (!student) return NextResponse.json({ error: "You cannot pay for this student" }, { status: 403 });

  const provider = await db.paymentProvider.findFirst({
    where: { schoolId, provider: "MONIEPOINT", enabled: true, status: "VERIFIED" },
  });
  if (!provider) {
    return NextResponse.json({ error: "Moniepoint online payment is not enabled for this school yet." }, { status: 409 });
  }

  const apiKey = decryptProviderSecret(provider.apiKeyEncrypted);
  const secretKey = decryptProviderSecret(provider.secretKeyEncrypted);
  const contractCode = decryptProviderSecret(provider.contractCodeEncrypted);
  if (!apiKey || !secretKey || !contractCode) {
    return NextResponse.json({ error: "Moniepoint online payment is not configured yet." }, { status: 503 });
  }

  const fee = await db.feeRecord.findFirst({ where: { schoolId, studentId } });
  if (!fee) return NextResponse.json({ error: "No fee record was found for this student." }, { status: 404 });

  const paid = await db.payment.aggregate({
    where: { schoolId, studentId },
    _sum: { amount: true },
  });
  const currentPaid = paid._sum.amount ?? 0;
  const balance = Math.max(0, fee.totalFee - currentPaid);

  if (balance <= 0) return NextResponse.json({ error: "This fee has already been paid in full." }, { status: 409 });
  if (amount > balance) {
    return NextResponse.json({ error: "Payment exceeds the outstanding balance.", balance }, { status: 400 });
  }

  const baseUrl = process.env.MONNIFY_BASE_URL || "https://api.monnify.com";
  const origin = request.headers.get("origin") || new URL(request.url).origin;
  const redirectUrl = new URL("/api/payments/monnify/callback", origin).toString();
  const paymentReference = `SKG-${schoolId.slice(0, 8)}-${studentId.slice(0, 8)}-${Date.now()}`;

  try {
    const token = await getMonnifyToken(apiKey, secretKey, baseUrl);
    const response = await fetch(`${baseUrl}/api/v1/merchant/transactions/init-transaction`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        customerEmail: user.email,
        customerName: `${student.firstName} ${student.lastName}`,
        paymentReference,
        paymentDescription: `School fee payment - ${student.firstName} ${student.lastName}`,
        currencyCode: "NGN",
        contractCode,
        redirectUrl,
        paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD", "PHONE_NUMBER"],
        metadata: {
          skulgo: "school-fee",
          schoolId,
          studentId,
          userId: user.id,
          amount,
        },
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.requestSuccessful || !data?.responseBody?.checkoutUrl) {
      return NextResponse.json({ error: data?.responseMessage || "Unable to start Moniepoint payment." }, { status: 502 });
    }

    return NextResponse.json({
      authorizationUrl: data.responseBody.checkoutUrl,
      reference: paymentReference,
      transactionReference: data.responseBody.transactionReference,
      student: {
        id: student.id,
        admissionId: student.admissionId,
        name: `${student.firstName} ${student.lastName}`,
      },
      amount,
      balance,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unable to start Moniepoint payment.",
    }, { status: 502 });
  }
}
