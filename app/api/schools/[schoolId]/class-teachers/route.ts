import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;

  if (!user?.membership || user.membership.schoolId !== schoolId) {
    return NextResponse.json({ error: "School access required" }, { status: 403 });
  }

  return NextResponse.json(await db.classTeacher.findMany({
    where: { schoolId },
    include: {
      teacher: { include: { user: { select: { name: true, email: true } } } },
      class: { include: { section: true } },
    },
  }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;

  if (!user?.membership || user.membership.schoolId !== schoolId || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const teacherId = typeof body?.teacherId === "string" ? body.teacherId : "";
  const classId = typeof body?.classId === "string" ? body.classId : "";

  if (!teacherId || !classId) {
    return NextResponse.json({ error: "teacherId and classId are required" }, { status: 400 });
  }

  const [teacher, schoolClass] = await Promise.all([
    db.teacher.findFirst({
      where: {
        id: teacherId,
        approved: true,
        user: { memberships: { some: { schoolId, active: true, role: "TEACHER" } } },
      },
    }),
    db.schoolClass.findFirst({ where: { id: classId, schoolId } }),
  ]);

  if (!teacher) return NextResponse.json({ error: "Approved teacher not found" }, { status: 404 });
  if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const assignment = await db.classTeacher.upsert({
    where: { classId },
    update: { teacherId },
    create: { schoolId, classId, teacherId },
  });

  await recordAudit({
    schoolId,
    actorUserId: user.id,
    action: "UPSERT",
    entity: "CLASS_TEACHER",
    entityId: assignment.id,
    details: { teacherId, classId },
  });

  return NextResponse.json(assignment, { status: 201 });
}
