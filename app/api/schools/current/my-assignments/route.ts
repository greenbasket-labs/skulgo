import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "TEACHER") {
    return NextResponse.json({ error: "Teacher workspace required" }, { status: 403 });
  }

  const teacher = await db.teacher.findUnique({
    where: { userId: user.id },
    select: { id: true, teacherCode: true, approved: true },
  });

  if (!teacher?.approved) {
    return NextResponse.json({ error: "Teacher is not approved" }, { status: 403 });
  }

  const assignments = await db.teacherAssignment.findMany({
    where: { schoolId: user.membership.schoolId, teacherId: teacher.id },
    include: {
      class: { include: { section: { select: { name: true } } } },
      subject: { select: { id: true, name: true } },
    },
    orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
  });

  return NextResponse.json({ teacher, assignments });
}
