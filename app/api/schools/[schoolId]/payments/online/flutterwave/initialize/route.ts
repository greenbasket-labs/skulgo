import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { decryptProviderSecret } from "@/lib/payment-provider-secrets";

async function allowedStudent(schoolId: string, userId: string, role: "STUDENT" | "PARENT", studentId: string) {
  if (role === "STUDENT") {
    return db.student.findFirst({
      where: { schoolId, userId, id: studentId },
      select: { id: true, admissionId: true, firstName: true, lastName: true },
    });
  }

  const parent = await db.parent.findUnique({ where: { userId }, select: { id: true } });
  if (!parent) return null;

  return db.student.findFirst({
    where: {
      id: studentId,
      schoolId,
      parentLinks: { some: { parentId: parent.id, approved: true } },
    },
    select: { id: true, admissionId: true, firstName: true, lastName: true },
  });
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
    where: { schoolId, provider: "FLUTTERWAVE", enabled: true, status: "VERIFIED" },
  });
  if (!provider) {
    return NextResponse.json({ error: "Flutterwave online payment is not enabled for this school yet." }, { status: 409 });
  }

  const secretKey = decryptProviderSecret(provider.secretKeyEncrypted);
  if (!secretKey) {
    return NextResponse.json({ error: "Flutterwave online payment is not configured yet." }, { status: 503 });
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

  const origin = request.headers.get("origin") || new URL(request.url).origin;
  const redirectUrl = new URL("/api/payments/flutterwave/callback", origin).toString();
  const txRef = `SKG-FLW-${schoolId.slice(0, 8)}-${studentId.slice(0, 8)}-${Date.now()}`;

  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: txRef,
      amount,
      currency: "NGN",
      redirect_url: redirectUrl,
      payment_options: "card,banktransfer,ussd",
      customer: {
        email: user.email,
        name: `${student.firstName} ${student.lastName}`,
      },
      customizations: {
        title: "SkulGo School Fees",
        description: `School fee payment for ${student.firstName} ${student.lastName}`,
      },
      meta: {
        skulgo: "school-fee",
        schoolId,
        studentId,
        userId: user.id,
        amount,
      },
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || data?.status !== "success" || !data?.data?.link) {
    return NextResponse.json({ error: data?.message || "Unable to start Flutterwave payment." }, { status: 502 });
  }

  return NextResponse.json({
    authorizationUrl: data.data.link,
    reference: txRef,
    student: {
      id: student.id,
      admissionId: student.admissionId,
      name: `${student.firstName} ${student.lastName}`,
    },
    amount,
    balance,
  });
}
