import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveResultCheckerAccess, resultCheckerEnabled } from "@/lib/result-checker";

export async function POST(request: Request) {
  if (!(await resultCheckerEnabled())) {
    return NextResponse.json({ error: "Result Checker is not available." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const access = await resolveResultCheckerAccess(String(body?.id ?? ""), String(body?.pin ?? ""));
  if (!access) return NextResponse.json({ error: "Invalid ID or PIN." }, { status: 401 });

  const requested = Array.isArray(body?.studentIds) ? body.studentIds.map(String) : [];
  const studentIds = requested.filter(id => access.studentIds.includes(id));
  if (!studentIds.length) return NextResponse.json({ error: "Select at least one result." }, { status: 400 });

  const published = await db.result.findMany({
    where: { schoolId: access.schoolId, studentId: { in: studentIds }, published: true },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  const availableIds = published.map(item => item.studentId);
  const selectedIds = studentIds.filter(id => availableIds.includes(id));
  if (!selectedIds.length) return NextResponse.json({ error: "No published result is available." }, { status: 409 });

  const feeSetting = await db.platformSetting.findUnique({ where: { key: "resultUnlockFee" } });
  const feePerChild = Math.max(0, Number(feeSetting?.value ?? 200));
  const amount = feePerChild * selectedIds.length;

  const reference = "SKULGO-RESULT-" + Date.now().toString(36) + "-" + randomUUID().replace(/-/g, "").slice(0, 12);

  const payment = await db.resultAccessPayment.create({
    data: {
      schoolId: access.schoolId,
      membershipId: access.membershipId,
      accessId: String(body?.id ?? "").trim(),
      studentIds: JSON.stringify(selectedIds),
      childCount: selectedIds.length,
      amount,
      reference,
    },
  });

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    await db.resultAccessPayment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "Payment is not configured." }, { status: 503 });
  }

  const baseUrl = process.env.APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: access.email,
      amount: String(Math.round(amount * 100)),
      currency: "NGN",
      reference,
      callback_url: baseUrl + "/result-checker/callback",
      metadata: { paymentId: payment.id, schoolId: access.schoolId, childCount: selectedIds.length },
    }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.status || !data?.data?.authorization_url) {
    await db.resultAccessPayment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: "Could not start payment." }, { status: 502 });
  }

  return NextResponse.json({ authorizationUrl: data.data.authorization_url });
}
