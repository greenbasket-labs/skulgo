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

  // Publishing is a batch visibility action. A teacher's "done" submission
  // locks the records they entered, but incomplete student records must not
  // block the rest of the class/school from being published.


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
