import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { starterSubjects } from "@/lib/subject-catalog";

async function access(userId: string, schoolId: string) {
  return db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId } },
    select: { role: true, active: true },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const member = await access(user.id, schoolId);
  if (!member?.active) return NextResponse.json({ error: "School access required" }, { status: 403 });

  const classId = new URL(request.url).searchParams.get("classId");
  if (!classId) return NextResponse.json({ error: "classId is required" }, { status: 400 });

  const schoolClass = await db.schoolClass.findFirst({
    where: { id: classId, schoolId },
    select: { id: true },
  });
  if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  return NextResponse.json(await db.classSubject.findMany({
    where: { schoolId, classId },
    include: { subject: true },
    orderBy: { subject: { name: "asc" } },
  }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const member = await access(user.id, schoolId);
  if (!member?.active || member.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const classId = typeof body?.classId === "string" ? body.classId : "";
  const subjectId = typeof body?.subjectId === "string" ? body.subjectId : "";
  const seed = body?.seed === true;

  const schoolClass = await db.schoolClass.findFirst({
    where: { id: classId, schoolId },
    include: { section: true },
  });
  if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  if (seed) {
    const names = starterSubjects(schoolClass.section.name);
    const created = [];

    for (const name of names) {
      const subject = await db.subject.upsert({
        where: { schoolId_name: { schoolId, name } },
        update: {},
        create: { schoolId, name },
      });

      const link = await db.classSubject.upsert({
        where: { classId_subjectId: { classId, subjectId: subject.id } },
        update: {},
        create: { schoolId, classId, subjectId: subject.id },
      });

      created.push(link);
    }

    await recordAudit({
      schoolId,
      actorUserId: user.id,
      action: "SEED",
      entity: "CLASS_SUBJECTS",
      entityId: classId,
      details: { section: schoolClass.section.name, count: created.length },
    });

    return NextResponse.json(
      await db.classSubject.findMany({
        where: { schoolId, classId },
        include: { subject: true },
        orderBy: { subject: { name: "asc" } },
      }),
      { status: 201 }
    );
  }

  if (!subjectId) return NextResponse.json({ error: "subjectId is required" }, { status: 400 });

  const subject = await db.subject.findFirst({ where: { id: subjectId, schoolId } });
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  try {
    const link = await db.classSubject.create({ data: { schoolId, classId, subjectId } });
    await recordAudit({
      schoolId,
      actorUserId: user.id,
      action: "CREATE",
      entity: "CLASS_SUBJECT",
      entityId: link.id,
      details: { classId, subjectId },
    });
    return NextResponse.json(link, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Subject is already connected to this class" }, { status: 409 });
  }
}


export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const member = await access(user.id, schoolId);
  if (!member?.active || member.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const classSubjectId = typeof body?.classSubjectId === "string" ? body.classSubjectId : "";
  if (!classSubjectId) {
    return NextResponse.json({ error: "classSubjectId is required" }, { status: 400 });
  }

  const link = await db.classSubject.findFirst({
    where: { id: classSubjectId, schoolId },
    select: { id: true, classId: true, subjectId: true, subject: { select: { name: true } } },
  });
  if (!link) return NextResponse.json({ error: "Saved subject not found" }, { status: 404 });

  const [assignmentCount, assessmentCount, resultCount] = await Promise.all([
    db.teacherAssignment.count({ where: { schoolId, classId: link.classId, subjectId: link.subjectId } }),
    db.assessment.count({ where: { schoolId, classId: link.classId, subjectId: link.subjectId } }),
    db.result.count({ where: { schoolId, student: { classId: link.classId }, subjectId: link.subjectId } }),
  ]);

  if (assignmentCount || assessmentCount || resultCount) {
    return NextResponse.json(
      { error: "This subject is already in use for this class and cannot be removed." },
      { status: 409 }
    );
  }

  await db.classSubject.delete({ where: { id: link.id } });
  await recordAudit({
    schoolId,
    actorUserId: user.id,
    action: "DELETE",
    entity: "CLASS_SUBJECT",
    entityId: link.id,
    details: { classId: link.classId, subjectId: link.subjectId, subjectName: link.subject.name },
  });

  return NextResponse.json({ ok: true });
}
