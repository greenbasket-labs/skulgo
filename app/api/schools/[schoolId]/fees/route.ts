import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

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
  const allowedIds = await visibleStudentIds(schoolId, user.id, membership.role, studentId);
  if (!allowedIds.length) return NextResponse.json([]);

  await syncApprovedFeeRecords(schoolId);

  const records = await db.feeRecord.findMany({
    where: { schoolId, studentId: { in: allowedIds } },
    include: {
      student: { select: { id: true, admissionId: true, firstName: true, lastName: true } },
    },
    orderBy: { student: { lastName: "asc" } },
  });

  const balances = await Promise.all(records.map(async record => {
    const paid = await db.payment.aggregate({
      where: { schoolId, studentId: record.studentId },
      _sum: { amount: true },
    });
    const totalPaid = paid._sum.amount ?? 0;
    return { ...record, totalPaid, balance: record.totalFee - totalPaid };
  }));

  return NextResponse.json(balances);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const membership = await db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId: user.id } },
  });
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

  await recordAudit({
    schoolId,
    actorUserId: user.id,
    action: "UPSERT",
    entity: "FEE_RECORD",
    entityId: fee.id,
    details: { studentId, totalFee },
  });

  return NextResponse.json(fee, { status: 201 });
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


async function syncApprovedFeeRecords(schoolId: string) {
  const definitions = await db.feeDefinition.findMany({
    where: { schoolId, status: "APPROVED" },
    select: {
      amount: true,
      targetType: true,
      sectionId: true,
      classId: true,
    },
  });

  if (!definitions.length) return;

  const students = await db.student.findMany({
    where: { schoolId },
    select: { id: true, classId: true, class: { select: { sectionId: true } } },
  });

  await db.$transaction(async tx => {
    for (const student of students) {
      const assignedTotal = definitions.reduce((total, definition) => {
        const applies =
          definition.targetType === "SCHOOL" ||
          (definition.targetType === "SECTION" && definition.sectionId === student.class?.sectionId) ||
          (definition.targetType === "CLASS" && definition.classId === student.classId);

        return applies ? total + definition.amount : total;
      }, 0);

      if (assignedTotal <= 0) continue;

      const existing = await tx.feeRecord.findUnique({
        where: { studentId: student.id },
        select: { id: true, totalFee: true },
      });

      if (!existing) {
        await tx.feeRecord.create({
          data: { schoolId, studentId: student.id, totalFee: assignedTotal },
        });
      } else if (existing.totalFee < assignedTotal) {
        await tx.feeRecord.update({
          where: { id: existing.id },
          data: { totalFee: assignedTotal },
        });
      }
    }
  });
}
