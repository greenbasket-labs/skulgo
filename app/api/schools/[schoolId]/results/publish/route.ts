import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();

  if (!user?.membership || user.membership.schoolId !== schoolId || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const term = String(body?.term ?? "").trim();
  const studentId = body?.studentId ? String(body.studentId) : null;

  if (!term) return NextResponse.json({ error: "term is required" }, { status: 400 });

  const students = await db.student.findMany({
    where: {
      schoolId,
      ...(studentId ? { id: studentId } : {}),
      class: { section: { name: "Senior Secondary" } },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      assessments: {
        where: { term },
        select: { subjectId: true },
      },
      results: {
        where: { term },
        select: { subjectId: true },
      },
    },
  });

  for (const student of students) {
    const offeredSubjects = new Set(student.assessments.map(item => item.subjectId)).size;
    const generatedResults = new Set(student.results.map(item => item.subjectId)).size;

    if (offeredSubjects < 9) {
      return NextResponse.json(
        {
          error: `Senior Secondary students must offer at least 9 subjects. ${student.firstName} ${student.lastName} currently has ${offeredSubjects} subject(s) with assessment data for this term.`,
        },
        { status: 409 }
      );
    }

    if (generatedResults < 9) {
      return NextResponse.json(
        {
          error: `Results cannot be published for ${student.firstName} ${student.lastName} until at least 9 offered subjects have generated results.`,
        },
        { status: 409 }
      );
    }
  }

  const result = await db.result.updateMany({
    where: {
      schoolId,
      term,
      ...(studentId ? { studentId } : {}),
    },
    data: { published: true },
  });

  await recordAudit({
    schoolId,
    actorUserId: user.id,
    action: "PUBLISH",
    entity: "RESULT",
    entityId: studentId ?? term,
    details: { term, studentId, count: result.count },
  });

  return NextResponse.json({ published: result.count });
}
