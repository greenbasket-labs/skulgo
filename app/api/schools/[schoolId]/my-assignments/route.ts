import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;

  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const membership = await db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId: user.id } },
  });

  if (!membership?.active || membership.role !== "TEACHER") {
    return NextResponse.json({ error: "Teacher access required" }, { status: 403 });
  }

  const teacher = await db.teacher.findUnique({
    where: { userId: user.id },
    select: { id: true, teacherCode: true, approved: true },
  });

  if (!teacher?.approved) {
    return NextResponse.json({ error: "Teacher is not approved" }, { status: 403 });
  }

  const assignments = await db.teacherAssignment.findMany({
    where: { schoolId, teacherId: teacher.id },
    include: {
      class: { include: { section: { select: { name: true } } } },
      subject: { select: { id: true, name: true } },
    },
    orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
  });

  return NextResponse.json({
    teacher,
    assignments,
  });
}
