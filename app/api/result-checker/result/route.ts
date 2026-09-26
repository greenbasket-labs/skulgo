import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resultCheckerEnabled } from "@/lib/result-checker";

export async function GET(request: NextRequest) {
  if (!(await resultCheckerEnabled())) {
    return NextResponse.json({ error: "Result Checker is not available." }, { status: 404 });
  }

  const reference = request.nextUrl.searchParams.get("reference")?.trim();
  if (!reference) return NextResponse.json({ error: "reference is required" }, { status: 400 });

  const payment = await db.resultAccessPayment.findUnique({ where: { reference } });
  if (!payment || payment.status !== "SUCCESS") {
    return NextResponse.json({ error: "Result access is not unlocked." }, { status: 402 });
  }

  let studentIds: string[] = [];
  try {
    const parsed = JSON.parse(payment.studentIds);
    if (Array.isArray(parsed)) studentIds = parsed.map(String);
  } catch {}

  const results = await db.result.findMany({
    where: { schoolId: payment.schoolId, studentId: { in: studentIds }, published: true },
    include: {
      student: { select: { admissionId: true, firstName: true, lastName: true, class: { select: { name: true, arm: true } } } },
      subject: { select: { name: true } },
    },
    orderBy: [{ studentId: "asc" }, { term: "asc" }, { subject: { name: "asc" } }],
  });

  return NextResponse.json({
    school: await db.school.findUnique({ where: { id: payment.schoolId }, select: { name: true, abbr: true } }),
    results,
  });
}
