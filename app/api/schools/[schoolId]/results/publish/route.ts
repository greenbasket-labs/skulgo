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
  const publishScope = String(body?.publishScope ?? "").trim().toUpperCase();
  const classId = body?.classId ? String(body.classId) : null;
  const sectionId = body?.sectionId ? String(body.sectionId) : null;

  if (!["SCHOOL", "SECTION", "CLASS"].includes(publishScope)) {
    return NextResponse.json({ error: "Publish scope must be whole school, section, or class." }, { status: 400 });
  }
  if (publishScope === "SECTION" && !sectionId) {
    return NextResponse.json({ error: "Select a section to publish." }, { status: 400 });
  }
  if (publishScope === "CLASS" && !classId) {
    return NextResponse.json({ error: "Select a class to publish." }, { status: 400 });
  }

  if (!term) return NextResponse.json({ error: "term is required" }, { status: 400 });

  const students = await db.student.findMany({
    where: {
      schoolId,
      ...(publishScope === "CLASS" && classId ? { classId } : {}),
      ...(publishScope === "SECTION" && sectionId ? { class: { sectionId } } : {}),
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
      ...(publishScope === "CLASS" && classId ? { student: { classId } } : {}),
      ...(publishScope === "SECTION" && sectionId ? { student: { class: { sectionId } } } : {}),
    },
    data: { published: true },
  });

  await recordAudit({
    schoolId,
    actorUserId: user.id,
    action: "PUBLISH",
    entity: "RESULT",
    entityId: classId ?? sectionId ?? schoolId,
    details: { term, publishScope, classId, sectionId, count: result.count },
  });

  return NextResponse.json({ published: result.count });
}
