import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const studentId = request.nextUrl.searchParams.get("studentId");

  const payments = await db.payment.findMany({
    where: { schoolId, ...(studentId ? { studentId } : {}) },
    include: {
      student: { select: { id: true, admissionId: true, firstName: true, lastName: true } },
    },
    orderBy: { paidAt: "desc" },
  });

  return NextResponse.json(payments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const body = await request.json().catch(() => null);

  const studentId = String(body?.studentId ?? "");
  const amount = Number(body?.amount);
  const reference = body?.reference ? String(body.reference).trim() : null;
  const recordedById = String(body?.recordedById ?? "");

  if (!studentId || !Number.isFinite(amount) || amount <= 0 || !recordedById) {
    return NextResponse.json(
      { error: "studentId, positive amount and recordedById are required" },
      { status: 400 }
    );
  }

  const [student, fee, recorder] = await Promise.all([
    db.student.findFirst({ where: { id: studentId, schoolId } }),
    db.feeRecord.findFirst({ where: { studentId, schoolId } }),
    db.user.findFirst({ where: { id: recordedById, memberships: { some: { schoolId, active: true, role: "CASHIER" } } } }),
  ]);

  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (!fee) return NextResponse.json({ error: "Create a fee record for the student first" }, { status: 400 });
  if (!recorder) return NextResponse.json({ error: "Payment must be recorded by a cashier in this school" }, { status: 400 });

  const paid = await db.payment.aggregate({
    where: { schoolId, studentId },
    _sum: { amount: true },
  });
  const currentPaid = paid._sum.amount ?? 0;
  const balance = fee.totalFee - currentPaid;

  if (amount > balance) {
    return NextResponse.json({ error: "Payment exceeds the remaining balance", balance }, { status: 400 });
  }

  const payment = await db.payment.create({
    data: { schoolId, studentId, amount, reference, recordedById },
  });

  return NextResponse.json({
    payment,
    totalPaid: currentPaid + amount,
    balance: balance - amount,
  }, { status: 201 });
}
