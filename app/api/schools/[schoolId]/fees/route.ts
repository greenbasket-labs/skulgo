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
  const membership = await db.schoolMembership.findUnique({ where: { schoolId_userId: { schoolId, userId: user.id } } });
  if (!membership?.active) return NextResponse.json({ error: "School access required" }, { status: 403 });
  const studentId = request.nextUrl.searchParams.get("studentId");

  const records = await db.feeRecord.findMany({
    where: { schoolId, ...(studentId ? { studentId } : {}) },
    include: {
      student: { select: { id: true, admissionId: true, firstName: true, lastName: true } },
    },
    orderBy: { student: { lastName: "asc" } },
  });

  const balances = await Promise.all(
    records.map(async (record) => {
      const paid = await db.payment.aggregate({
        where: { schoolId, studentId: record.studentId },
        _sum: { amount: true },
      });
      const totalPaid = paid._sum.amount ?? 0;
      return { ...record, totalPaid, balance: record.totalFee - totalPaid };
    })
  );

  return NextResponse.json(balances);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });
  const membership = await db.schoolMembership.findUnique({ where: { schoolId_userId: { schoolId, userId: user.id } } });
  if (!membership?.active || (membership.role !== "ADMIN" && membership.role !== "CASHIER")) {
    return NextResponse.json({ error: "Admin or cashier access required" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const studentId = String(body?.studentId ?? "");
  const totalFee = Number(body?.totalFee);

  if (!studentId || !Number.isFinite(totalFee) || totalFee < 0) {
    return NextResponse.json({ error: "studentId and a valid totalFee are required" }, { status: 400 });
  }

  const student = await db.student.findFirst({ where: { id: studentId, schoolId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  const fee = await db.feeRecord.upsert({
    where: { studentId },
    update: { totalFee },
    create: { schoolId, studentId, totalFee },
  });

  return NextResponse.json(fee, { status: 201 });
}
