import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

async function schoolAccess(userId: string, schoolId: string) {
  return db.schoolMembership.findFirst({
    where: { userId, schoolId, active: true },
    select: { role: true },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ schoolId: string; classId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId, classId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const membership = await schoolAccess(user.id, schoolId);
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const arm = typeof body?.arm === "string" && body.arm.trim() ? body.arm.trim() : null;
  const existing = await db.schoolClass.findFirst({ where: { id: classId, schoolId } });
  if (!existing) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  try {
    const schoolClass = await db.schoolClass.update({
      where: { id: existing.id },
      data: { arm },
    });
    await recordAudit({
      schoolId,
      actorUserId: user.id,
      action: "UPDATE",
      entity: "CLASS",
      entityId: schoolClass.id,
      details: { name: schoolClass.name, arm },
    });
    return NextResponse.json(schoolClass);
  } catch {
    return NextResponse.json({ error: "This class and arm already exists" }, { status: 409 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ schoolId: string; classId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId, classId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const membership = await schoolAccess(user.id, schoolId);
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const schoolClass = await db.schoolClass.findFirst({
    where: { id: classId, schoolId },
    include: {
      _count: { select: { students: true, assignments: true, classTeacherAssignments: true } },
    },
  });

  if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  if (schoolClass._count.assignments > 0 || schoolClass._count.classTeacherAssignments > 0) {
    return NextResponse.json(
      { error: "This class cannot be removed because a teacher is assigned to it." },
      { status: 409 }
    );
  }

  if (schoolClass._count.students > 0) {
    return NextResponse.json(
      { error: "This class cannot be removed because students are saved under it." },
      { status: 409 }
    );
  }

  await db.schoolClass.delete({ where: { id: schoolClass.id } });
  await recordAudit({
    schoolId,
    actorUserId: user.id,
    action: "DELETE",
    entity: "CLASS",
    entityId: schoolClass.id,
    details: { name: schoolClass.name, arm: schoolClass.arm },
  });

  return NextResponse.json({ ok: true });
}