import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { percentage } from "@/lib/grading";
import { recordAudit } from "@/lib/audit";

const CORRECTION_WINDOW_MS = 24 * 60 * 60 * 1000;
const SCORE_FIELDS = ["ca1","ca2","ca3","ca4","exam"] as const;

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
      ...(user.membership.role !== "TEACHER" ? { submitted: true } : {}),
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
    ca1Max: item.ca1Max,
    ca2Max: item.ca2Max,
    ca3Max: item.ca3Max,
    ca4Max: item.ca4Max,
    ca1CorrectionRemainingMs: remainingMs(item.ca1SavedAt),
    ca2CorrectionRemainingMs: remainingMs(item.ca2SavedAt),
    ca3CorrectionRemainingMs: remainingMs(item.ca3SavedAt),
    ca4CorrectionRemainingMs: remainingMs(item.ca4SavedAt),
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
  const action = String(body?.action ?? "").trim();
  const studentId = String(body?.studentId ?? "");
  const classId = String(body?.classId ?? "");
  const subjectId = String(body?.subjectId ?? "");
  const term = String(body?.term ?? "").trim();
  const caMax = Number(body?.caMax);
  const examMax = Number(body?.examMax);
  const entered = ["ca", "exam"].filter(field => body?.[field] !== undefined && body?.[field] !== null && String(body[field]).trim() !== "");

  if (!studentId || !classId || !subjectId || !term) {
    return NextResponse.json({ error: "Class, subject, term and student are required." }, { status: 400 });
  }

  const assigned = await db.teacherAssignment.findFirst({
    where: { schoolId, teacherId: teacher.id, classId, subjectId },
    select: { id: true },
  });
  if (!assigned) return NextResponse.json({ error: "You are not assigned to this class and subject" }, { status: 403 });

  if (action === "submit") {
    if (![10, 20, 30, 40].includes(caMax) || examMax !== 100 - caMax) {
      return NextResponse.json({ error: "CA and Exam maximums must add up to 100." }, { status: 400 });
    }

    const now = new Date();
    const result = await db.assessment.updateMany({
      where: { schoolId, classId, subjectId, term, submitted: false },
      data: { caMax, examMax, submitted: true, submittedAt: now, submittedById: teacher.id },
    });

    await recordAudit({
      schoolId,
      actorUserId: user.id,
      action: "SUBMIT",
      entity: "ASSESSMENT",
      entityId: classId + ":" + subjectId + ":" + term,
      details: { classId, subjectId, term, caMax, examMax, count: result.count },
    });

    return NextResponse.json({ submitted: true, count: result.count, caMax, examMax, submittedAt: now });
  }

  if (!entered.length) {
    return NextResponse.json({ error: "Enter a CA or exam score before saving." }, { status: 400 });
  }
  if (![10, 20, 30, 40].includes(caMax) || examMax !== 100 - caMax) {
    return NextResponse.json({ error: "CA and Exam maximums must add up to 100." }, { status: 400 });
  }

  const student = await db.student.findFirst({ where: { id: studentId, schoolId, classId } });
  if (!student) return NextResponse.json({ error: "Student does not belong to this school/class" }, { status: 404 });

  const existing = await db.assessment.findUnique({
    where: { studentId_subjectId_term: { studentId, subjectId, term } },
  });

  if (existing?.submitted) {
    return NextResponse.json({ error: "These scores have already been submitted and locked." }, { status: 409 });
  }

  const now = new Date();
  const saveTimes = { ca: "ca1SavedAt", exam: "examSavedAt" } as const;

  for (const field of entered) {
    const savedAt = existing?.[saveTimes[field as keyof typeof saveTimes] as keyof typeof existing] as Date | null | undefined;
    if (savedAt && !withinCorrectionWindow(savedAt)) {
      return NextResponse.json({ error: field.toUpperCase() + " correction window has expired for this student." }, { status: 409 });
    }

    const value = Number(body[field]);
    const max = field === "ca" ? caMax : examMax;
    if (!Number.isFinite(value) || value < 0 || value > max) {
      return NextResponse.json({ error: field.toUpperCase() + " must be between 0 and " + max + "." }, { status: 400 });
    }
  }

  const currentCa = body.ca === undefined ? existing?.ca ?? null : Number(body.ca);
  const currentExam = body.exam === undefined ? existing?.exam ?? null : Number(body.exam);

  const data = {
    classId,
    ca: currentCa,
    caMax,
    examMax,
    exam: currentExam,
    ...Object.fromEntries(
      entered.map((field) => {
        const key = saveTimes[field as keyof typeof saveTimes];
        const existingSavedAt = existing?.[key as keyof typeof existing] as Date | null | undefined;
        return [key, existingSavedAt ?? now];
      }),
    ),
  };

  const assessment = existing
    ? await db.assessment.update({ where: { id: existing.id }, data })
    : await db.assessment.create({ data: { schoolId, studentId, subjectId, term, ...data } });

  await recordAudit({
    schoolId,
    actorUserId: user.id,
    action: existing ? "UPDATE" : "CREATE",
    entity: "ASSESSMENT",
    entityId: assessment.id,
    details: { studentId, classId, subjectId, term, caMax, examMax, entered: Object.fromEntries(entered.map(field => [field, Number(body[field])])) },
  });

  const total = assessment.ca !== null && assessment.exam !== null
    ? percentage(assessment.ca, assessment.exam)
    : null;

  return NextResponse.json({
    ...assessment,
    total,
    ca1CorrectionRemainingMs: remainingMs(assessment.ca1SavedAt),
    ca2CorrectionRemainingMs: remainingMs(assessment.ca2SavedAt),
    ca3CorrectionRemainingMs: remainingMs(assessment.ca3SavedAt),
    ca4CorrectionRemainingMs: remainingMs(assessment.ca4SavedAt),
    examCorrectionRemainingMs: remainingMs(assessment.examSavedAt),
  }, { status: existing ? 200 : 201 });
}
