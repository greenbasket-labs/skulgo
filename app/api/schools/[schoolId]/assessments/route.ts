import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { percentage } from "@/lib/grading";
import { recordAudit } from "@/lib/audit";

const CORRECTION_WINDOW_MS = 24 * 60 * 60 * 1000;

function withinCorrectionWindow(savedAt: Date | null | undefined) {
  return Boolean(savedAt && Date.now() - savedAt.getTime() < CORRECTION_WINDOW_MS);
}

function remainingMs(savedAt: Date | null | undefined) {
  if (!savedAt) return null;
  return Math.max(0, savedAt.getTime() + CORRECTION_WINDOW_MS - Date.now());
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.schoolId !== schoolId) {
    return NextResponse.json({ error: "School access required" }, { status: 403 });
  }

  const classId = request.nextUrl.searchParams.get("classId");
  const subjectId = request.nextUrl.searchParams.get("subjectId");
  const term = request.nextUrl.searchParams.get("term");
  let studentIds: string[] | null = null;
  let assignmentPairs: { classId: string; subjectId: string }[] | null = null;

  if (user.membership.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({
      where: { userId: user.id },
      select: { id: true, approved: true },
    });
    if (!teacher?.approved) return NextResponse.json({ error: "Teacher is not approved" }, { status: 403 });

    assignmentPairs = await db.teacherAssignment.findMany({
      where: { schoolId, teacherId: teacher.id },
      select: { classId: true, subjectId: true },
    });

    if (classId && !assignmentPairs.some(item => item.classId === classId)) {
      return NextResponse.json({ error: "You are not assigned to this class" }, { status: 403 });
    }
    if (subjectId && !assignmentPairs.some(item => item.subjectId === subjectId)) {
      return NextResponse.json({ error: "You are not assigned to this subject" }, { status: 403 });
    }
  } else if (user.membership.role === "STUDENT") {
    if (!user.student?.id) return NextResponse.json([]);
    studentIds = [user.student.id];
  } else if (user.membership.role === "PARENT") {
    if (!user.parent?.id) return NextResponse.json([]);
    const links = await db.parentStudent.findMany({
      where: { parentId: user.parent.id, approved: true, student: { schoolId } },
      select: { studentId: true },
    });
    studentIds = links.map(item => item.studentId);
  } else if (user.membership.role === "CASHIER") {
    return NextResponse.json([]);
  }

  const assessments = await db.assessment.findMany({
    where: {
      schoolId,
      ...(classId ? { classId } : {}),
      ...(subjectId ? { subjectId } : {}),
      ...(term ? { term } : {}),
      ...(studentIds ? { studentId: { in: studentIds } } : {}),
      ...(assignmentPairs ? {
        OR: assignmentPairs.map(item => ({ classId: item.classId, subjectId: item.subjectId })),
      } : {}),
    },
    include: {
      student: { select: { id: true, admissionId: true, firstName: true, lastName: true } },
      subject: { select: { id: true, name: true } },
    },
    orderBy: { student: { lastName: "asc" } },
  });

  return NextResponse.json(assessments.map(item => ({
    ...item,
    caCorrectionRemainingMs: remainingMs(item.caSavedAt),
    examCorrectionRemainingMs: remainingMs(item.examSavedAt),
  })));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.schoolId !== schoolId || user.membership.role !== "TEACHER") {
    return NextResponse.json({ error: "Teacher workspace required" }, { status: 403 });
  }

  const teacher = await db.teacher.findUnique({
    where: { userId: user.id },
    select: { id: true, approved: true },
  });
  if (!teacher?.approved) return NextResponse.json({ error: "Teacher is not approved" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const studentId = String(body?.studentId ?? "");
  const classId = String(body?.classId ?? "");
  const subjectId = String(body?.subjectId ?? "");
  const term = String(body?.term ?? "").trim();
  const hasCa = body?.ca !== undefined && body?.ca !== null && String(body.ca).trim() !== "";
  const hasExam = body?.exam !== undefined && body?.exam !== null && String(body.exam).trim() !== "";
  const ca = hasCa ? Number(body.ca) : null;
  const exam = hasExam ? Number(body.exam) : null;

  if (!studentId || !classId || !subjectId || !term || (!hasCa && !hasExam)) {
    return NextResponse.json({ error: "Enter at least one CA or exam score before saving" }, { status: 400 });
  }
  if (hasCa && (!Number.isFinite(ca) || (ca as number) < 0 || (ca as number) > 30)) {
    return NextResponse.json({ error: "CA must be 0-30" }, { status: 400 });
  }
  if (hasExam && (!Number.isFinite(exam) || (exam as number) < 0 || (exam as number) > 70)) {
    return NextResponse.json({ error: "Exam must be 0-70" }, { status: 400 });
  }

  const [student, schoolClass, subject, assigned] = await Promise.all([
    db.student.findFirst({ where: { id: studentId, schoolId, classId } }),
    db.schoolClass.findFirst({ where: { id: classId, schoolId } }),
    db.subject.findFirst({ where: { id: subjectId, schoolId } }),
    db.teacherAssignment.findFirst({ where: { schoolId, teacherId: teacher.id, classId, subjectId } }),
  ]);

  if (!student) return NextResponse.json({ error: "Student does not belong to this school/class" }, { status: 404 });
  if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });
  if (!assigned) return NextResponse.json({ error: "You are not assigned to this class and subject" }, { status: 403 });

  const existing = await db.assessment.findUnique({
    where: { studentId_subjectId_term: { studentId, subjectId, term } },
  });

  const now = new Date();

  if (existing?.caSavedAt && hasCa && !withinCorrectionWindow(existing.caSavedAt)) {
    return NextResponse.json({ error: "CA correction window has expired for this student." }, { status: 409 });
  }
  if (existing?.examSavedAt && hasExam && !withinCorrectionWindow(existing.examSavedAt)) {
    return NextResponse.json({ error: "Exam correction window has expired for this student." }, { status: 409 });
  }

  const assessment = existing
    ? await db.assessment.update({
        where: { id: existing.id },
        data: {
          classId,
          ...(hasCa ? { ca, ...(existing.caSavedAt ? {} : { caSavedAt: now }) } : {}),
          ...(hasExam ? { exam, ...(existing.examSavedAt ? {} : { examSavedAt: now }) } : {}),
        },
      })
    : await db.assessment.create({
        data: {
          schoolId,
          studentId,
          classId,
          subjectId,
          term,
          ca,
          exam,
          caSavedAt: hasCa ? now : null,
          examSavedAt: hasExam ? now : null,
        },
      });

  await recordAudit({
    schoolId,
    actorUserId: user.id,
    action: existing ? "UPDATE" : "CREATE",
    entity: "ASSESSMENT",
    entityId: assessment.id,
    details: { studentId, classId, subjectId, term, ca: hasCa ? ca : undefined, exam: hasExam ? exam : undefined },
  });

  const total = assessment.ca !== null && assessment.exam !== null
    ? percentage(assessment.ca, assessment.exam)
    : null;

  return NextResponse.json({
    ...assessment,
    total,
    caCorrectionRemainingMs: remainingMs(assessment.caSavedAt),
    examCorrectionRemainingMs: remainingMs(assessment.examSavedAt),
  }, { status: existing ? 200 : 201 });
}
