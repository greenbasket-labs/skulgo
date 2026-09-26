import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { makeNonAcademicStaffId, makeStudentId, makeTeacherId } from "@/lib/ids";
import { recordAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ schoolId: string; requestId: string }> }
) {
  const admin = await getCurrentUser();
  const { schoolId, requestId } = await params;

  if (!admin?.membership || admin.membership.schoolId !== schoolId || admin.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const schoolRequest = await db.schoolRequest.findFirst({
    where: { id: requestId, schoolId, status: "PENDING" },
    include: { user: true },
  });

  if (!schoolRequest) {
    return NextResponse.json({ error: "Pending request not found" }, { status: 404 });
  }

  const input = await request.json().catch(() => ({}));
  const action = String(input.action ?? "");
  const requestedClassId = input.classId;

  if (action !== "APPROVE" && action !== "REJECT") {
    return NextResponse.json({ error: "action must be APPROVE or REJECT" }, { status: 400 });
  }

  if (action === "REJECT") {
    await db.schoolRequest.update({
      where: { id: schoolRequest.id },
      data: { status: "REJECTED", reviewedAt: new Date() },
    });
    await recordAudit({ schoolId, actorUserId: admin.id, action: "REJECT", entity: "SCHOOL_REQUEST", entityId: schoolRequest.id, details: { requestedRole: schoolRequest.requestedRole } });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  if (schoolRequest.requestedRole === "STUDENT") {
    const finalClassId = String(requestedClassId ?? schoolRequest.classId ?? "");
    if (!finalClassId) {
      return NextResponse.json({ error: "Choose a class" }, { status: 400 });
    }

    const validClass = await db.schoolClass.findFirst({
      where: { id: finalClassId, schoolId },
      include: { section: true },
    });
    if (!validClass) {
      return NextResponse.json({ error: "Class does not belong to this school" }, { status: 400 });
    }
  }

  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: { id: true, abbr: true },
  });
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const approvalTime = new Date();

  await db.$transaction(async tx => {
    await tx.schoolMembership.upsert({
      where: { schoolId_userId: { schoolId, userId: schoolRequest.userId } },
      update: { active: true, role: schoolRequest.requestedRole },
      create: {
        schoolId,
        userId: schoolRequest.userId,
        role: schoolRequest.requestedRole,
      },
    });

    if (schoolRequest.requestedRole === "TEACHER") {
      const existing = await tx.teacher.findUnique({ where: { userId: schoolRequest.userId } });
      if (!existing) {
        const ids = await tx.teacher.findMany({ select: { teacherCode: true } });
        await tx.teacher.create({
          data: {
            userId: schoolRequest.userId,
            teacherCode: makeTeacherId(school.abbr, new Date().getFullYear(), ids.map(x => x.teacherCode)),
            approved: true,
          },
        });
      }
    } else if (schoolRequest.requestedRole === "CASHIER") {
      const existing = await tx.cashier.findUnique({ where: { userId: schoolRequest.userId } });

      if (!existing) {
        const ids = await tx.cashier.findMany({ select: { cashierCode: true } });
        await tx.cashier.create({
          data: {
            userId: schoolRequest.userId,
            cashierCode: makeNonAcademicStaffId(
              school.abbr,
              new Date().getFullYear(),
              ids.map(item => item.cashierCode)
            ),
            approved: true,
          },
        });
      } else if (!existing.approved) {
        await tx.cashier.update({
          where: { id: existing.id },
          data: { approved: true },
        });
      }
    } else if (schoolRequest.requestedRole === "PARENT") {
      const admissionId = String(schoolRequest.studentAdmissionId ?? "").trim();
      const student = await tx.student.findFirst({
        where: { schoolId, admissionId },
        select: { id: true },
      });
      if (!student) throw new Error("Child not found");

      const existingParent = await tx.parent.findUnique({
        where: { userId: schoolRequest.userId },
      });
      const parent = existingParent ?? await tx.parent.create({
        data: { userId: schoolRequest.userId },
      });

      await tx.parentStudent.upsert({
        where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
        update: { approved: true },
        create: { parentId: parent.id, studentId: student.id, approved: true },
      });
    } else {
      const finalClassId = String(requestedClassId ?? schoolRequest.classId ?? "");
      const validClass = await tx.schoolClass.findFirst({
        where: { id: finalClassId, schoolId },
        include: { section: true },
      });
      if (!validClass) throw new Error("Admission class not found");

      const ids = await tx.student.findMany({
        where: { schoolId },
        select: { admissionId: true },
      });

      const admissionId = makeStudentId(
        school.abbr,
        new Date().getFullYear(),
        validClass.section.name,
        ids.map(x => x.admissionId)
      );

      const names = schoolRequest.user.name.trim().split(/\s+/);
      const existingStudent = await tx.student.findUnique({ where: { userId: schoolRequest.userId } });

      if (!existingStudent) {
        await tx.student.create({
          data: {
            schoolId,
            userId: schoolRequest.userId,
            firstName: names[0] || schoolRequest.user.name,
            lastName: names.slice(1).join(" ") || "Student",
            classId: finalClassId,
            admissionId,
          },
        });
      }
    }

    await tx.schoolRequest.update({
      where: { id: schoolRequest.id },
      data: { status: "APPROVED", reviewedAt: approvalTime },
    });

    const subscription = await tx.schoolSubscription.findUnique({
      where: { schoolId },
    });

    if (subscription && !subscription.startedAt) {
      const rows = await tx.platformSetting.findMany({
        where: { key: { in: ["trialEnabled", "trialDays"] } },
      });
      const settings = Object.fromEntries(rows.map(row => [row.key, row.value]));
      const trialEnabled = settings.trialEnabled !== "false";
      const trialDays = Math.max(0, Number(settings.trialDays ?? "14") || 0);

      if (trialEnabled && trialDays > 0) {
        const expiresAt = new Date(approvalTime);
        expiresAt.setDate(expiresAt.getDate() + trialDays);
        await tx.schoolSubscription.update({
          where: { id: subscription.id },
          data: { status: "TRIAL", startedAt: approvalTime, expiresAt },
        });
      } else {
        await tx.schoolSubscription.update({
          where: { id: subscription.id },
          data: { status: "EXPIRED", startedAt: null, expiresAt: null },
        });
      }
    }
  });

  await recordAudit({ schoolId, actorUserId: admin.id, action: "APPROVE", entity: "SCHOOL_REQUEST", entityId: schoolRequest.id, details: { requestedRole: schoolRequest.requestedRole } });
  return NextResponse.json({ ok: true, status: "APPROVED" });
}
