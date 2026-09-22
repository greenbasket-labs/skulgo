import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { makeStudentId, makeTeacherId } from "@/lib/ids";

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
          },
        });
      }
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
      data: { status: "APPROVED", reviewedAt: new Date() },
    });
  });

  return NextResponse.json({ ok: true, status: "APPROVED" });
}
