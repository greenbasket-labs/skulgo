import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const membership = await db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId: user.id } },
  });
  if (!membership?.active) return NextResponse.json({ error: "School access required" }, { status: 403 });

  const studentId = request.nextUrl.searchParams.get("studentId");
  const allowedStudentIds = await visibleStudentIds(schoolId, user.id, membership.role, studentId);
  if (!allowedStudentIds.length) return NextResponse.json([]);

  return NextResponse.json(await db.payment.findMany({
    where: { schoolId, studentId: { in: allowedStudentIds } },
    include: {
      student: { select: { id: true, admissionId: true, firstName: true, lastName: true } },
    },
    orderBy: { paidAt: "desc" },
  }));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const membership = await db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId: user.id } },
  });
  if (!membership?.active) return NextResponse.json({ error: "School access required" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const studentId = String(body?.studentId ?? "");
  const amount = Number(body?.amount);
  const reference = body?.reference ? String(body.reference).trim() : null;
  const payerRole = membership.role;
  const recordedById = user.id;

  if (!studentId || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "studentId and a positive amount are required" }, { status: 400 });
  }

  const visible = await visibleStudentIds(schoolId, user.id, membership.role, studentId);
  if (!visible.includes(studentId)) {
    return NextResponse.json({ error: "You cannot pay for this student" }, { status: 403 });
  }

  if (reference) {
    const existing = await db.payment.findFirst({ where: { schoolId, reference } });
    if (existing) return NextResponse.json({ payment: existing, duplicate: true }, { status: 200 });
  }

  const [student, fee] = await Promise.all([
    db.student.findFirst({ where: { id: studentId, schoolId } }),
    db.feeRecord.findFirst({ where: { studentId, schoolId } }),
  ]);
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (!fee) return NextResponse.json({ error: "Create a fee record for the student first" }, { status: 400 });

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
    payerRole,
    totalPaid: currentPaid + amount,
    balance: balance - amount,
  }, { status: 201 });
}

async function visibleStudentIds(
  schoolId: string,
  userId: string,
  role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT" | "CASHIER",
  requestedStudentId: string | null
) {
  if (role === "ADMIN" || role === "CASHIER") {
    if (!requestedStudentId) {
      const students = await db.student.findMany({ where: { schoolId }, select: { id: true } });
      return students.map(student => student.id);
    }
    const student = await db.student.findFirst({ where: { id: requestedStudentId, schoolId }, select: { id: true } });
    return student ? [student.id] : [];
  }

  if (role === "STUDENT") {
    const student = await db.student.findFirst({ where: { schoolId, userId }, select: { id: true } });
    return student && (!requestedStudentId || requestedStudentId === student.id) ? [student.id] : [];
  }

  if (role === "PARENT") {
    const parent = await db.parent.findUnique({ where: { userId }, select: { id: true } });
    if (!parent) return [];
    const links = await db.parentStudent.findMany({
      where: {
        parentId: parent.id,
        approved: true,
        student: { schoolId },
        ...(requestedStudentId ? { studentId: requestedStudentId } : {}),
      },
      select: { studentId: true },
    });
    return links.map(link => link.studentId);
  }

  return [];
}
