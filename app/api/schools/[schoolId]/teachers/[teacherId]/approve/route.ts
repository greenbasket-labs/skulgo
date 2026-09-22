import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ schoolId: string; teacherId: string }> }
) {
  const { schoolId, teacherId } = await params;

  const teacher = await db.teacher.findFirst({
    where: { id: teacherId, user: { memberships: { some: { schoolId, active: true, role: "TEACHER" } } } },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!teacher) return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  const updated = await db.teacher.update({
    where: { id: teacherId },
    data: { approved: true },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return NextResponse.json(updated);
}
