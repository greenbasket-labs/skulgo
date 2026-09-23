import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";

async function schoolMembership(userId: string, schoolId: string) {
  return db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId } },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;

  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const member = await schoolMembership(user.id, schoolId);
  if (!member?.active) return NextResponse.json({ error: "School access required" }, { status: 403 });

  const assignments = await db.teacherAssignment.findMany({
    where: { schoolId },
    include: {
      teacher: { include: { user: { select: { name: true, email: true } } } },
      class: { include: { section: { select: { name: true } } } },
      subject: true,
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;

  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const member = await schoolMembership(user.id, schoolId);
  if (!member?.active || member.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const teacherId = String(body?.teacherId ?? "");
  const classId = String(body?.classId ?? "");
  const subjectId = String(body?.subjectId ?? "");

  if (!teacherId || !classId || !subjectId) {
    return NextResponse.json({ error: "teacherId, classId and subjectId are required" }, { status: 400 });
  }

  const [teacher, schoolClass, subject] = await Promise.all([
    db.teacher.findFirst({
      where: {
        id: teacherId,
        approved: true,
        user: {
          memberships: { some: { schoolId, active: true, role: "TEACHER" } },
        },
      },
    }),
    db.schoolClass.findFirst({ where: { id: classId, schoolId } }),
    db.subject.findFirst({ where: { id: subjectId, schoolId } }),
  ]);

  if (!teacher) return NextResponse.json({ error: "Approved teacher not found" }, { status: 404 });
  if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  try {
    const assignment = await db.teacherAssignment.create({
      data: { schoolId, teacherId, classId, subjectId },
    });
    await recordAudit({ schoolId, actorUserId: user.id, action: "CREATE", entity: "TEACHER_ASSIGNMENT", entityId: assignment.id, details: { teacherId, classId, subjectId } });
    return NextResponse.json(assignment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "This teacher is already assigned to this class and subject" }, { status: 409 });
  }
}
