import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { percentage } from "@/lib/grading";
import { recordAudit } from "@/lib/audit";

const CORRECTION_WINDOW_MS = 24 * 60 * 60 * 1000;
const SCORE_FIELDS = ["ca1", "ca2", "ca3", "ca4", "exam"] as const;
type ScoreField = typeof SCORE_FIELDS[number];

type AssessmentComponent = {
  key: ScoreField;
  name: string;
  maxScore: number;
  enabled: boolean;
  type: "CA" | "EXAM";
  sortOrder: number;
};

const DEFAULT_SETUP: Record<string, { components: AssessmentComponent[] }> = {
  "First Term": { components: [
    { key: "ca1", name: "CA", maxScore: 40, enabled: true, type: "CA", sortOrder: 1 },
    { key: "ca2", name: "CA 2", maxScore: 0, enabled: false, type: "CA", sortOrder: 2 },
    { key: "ca3", name: "CA 3", maxScore: 0, enabled: false, type: "CA", sortOrder: 3 },
    { key: "ca4", name: "CA 4", maxScore: 0, enabled: false, type: "CA", sortOrder: 4 },
    { key: "exam", name: "Exam", maxScore: 60, enabled: true, type: "EXAM", sortOrder: 5 },
  ]},
  "Second Term": { components: [
    { key: "ca1", name: "CA", maxScore: 40, enabled: true, type: "CA", sortOrder: 1 },
    { key: "ca2", name: "CA 2", maxScore: 0, enabled: false, type: "CA", sortOrder: 2 },
    { key: "ca3", name: "CA 3", maxScore: 0, enabled: false, type: "CA", sortOrder: 3 },
    { key: "ca4", name: "CA 4", maxScore: 0, enabled: false, type: "CA", sortOrder: 4 },
    { key: "exam", name: "Exam", maxScore: 60, enabled: true, type: "EXAM", sortOrder: 5 },
  ]},
  "Third Term": { components: [
    { key: "ca1", name: "CA", maxScore: 40, enabled: true, type: "CA", sortOrder: 1 },
    { key: "ca2", name: "CA 2", maxScore: 0, enabled: false, type: "CA", sortOrder: 2 },
    { key: "ca3", name: "CA 3", maxScore: 0, enabled: false, type: "CA", sortOrder: 3 },
    { key: "ca4", name: "CA 4", maxScore: 0, enabled: false, type: "CA", sortOrder: 4 },
    { key: "exam", name: "Exam", maxScore: 60, enabled: true, type: "EXAM", sortOrder: 5 },
  ]},
};

function withinCorrectionWindow(savedAt: Date | null | undefined) {
  return Boolean(savedAt && Date.now() - savedAt.getTime() < CORRECTION_WINDOW_MS);
}

function remainingMs(savedAt: Date | null | undefined) {
  if (!savedAt) return null;
  return Math.max(0, savedAt.getTime() + CORRECTION_WINDOW_MS - Date.now());
}

function parseSetup(value: string | null, term: string) {
  let raw: any = null;
  if (value) {
    try { raw = JSON.parse(value); } catch {}
  }
  const candidate = raw?.assessmentSetup?.[term];
  if (candidate?.components && Array.isArray(candidate.components)) {
    return candidate as { components: AssessmentComponent[] };
  }
  return DEFAULT_SETUP[term] ?? DEFAULT_SETUP["First Term"];
}

function componentFor(setup: { components: AssessmentComponent[] }, key: string) {
  return setup.components.find(item => item.key === key && item.enabled);
}

function caTotalFromRecord(item: { ca1: number | null; ca2: number | null; ca3: number | null; ca4: number | null }) {
  return [item.ca1, item.ca2, item.ca3, item.ca4].reduce((sum, value) => sum + (value ?? 0), 0);
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
    const teacher = await db.teacher.findUnique({ where: { userId: user.id }, select: { id: true, approved: true } });
    if (!teacher?.approved) return NextResponse.json({ error: "Teacher is not approved" }, { status: 403 });
    assignmentPairs = await db.teacherAssignment.findMany({ where: { schoolId, teacherId: teacher.id }, select: { classId: true, subjectId: true } });
    if (classId && !assignmentPairs.some(item => item.classId === classId)) return NextResponse.json({ error: "You are not assigned to this class" }, { status: 403 });
    if (subjectId && !assignmentPairs.some(item => item.subjectId === subjectId)) return NextResponse.json({ error: "You are not assigned to this subject" }, { status: 403 });
  } else if (user.membership.role === "STUDENT") {
    if (!user.student?.id) return NextResponse.json([]);
    studentIds = [user.student.id];
  } else if (user.membership.role === "PARENT") {
    if (!user.parent?.id) return NextResponse.json([]);
    const links = await db.parentStudent.findMany({ where: { parentId: user.parent.id, approved: true, student: { schoolId } }, select: { studentId: true } });
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
      ...(assignmentPairs ? { OR: assignmentPairs.map(item => ({ classId: item.classId, subjectId: item.subjectId })) } : {}),
    },
    include: {
      student: { select: { id: true, admissionId: true, firstName: true, lastName: true } },
      subject: { select: { id: true, name: true } },
    },
    orderBy: { student: { lastName: "asc" } },
  });

  const school = await db.school.findUnique({ where: { id: schoolId }, select: { schoolSettings: true } });
  const requestedSetup = request.nextUrl.searchParams.get("setup") === "true";
  if (requestedSetup) {
    const setupTerm = term ?? "First Term";
    return NextResponse.json({
      assessments: assessments.map(item => item),
      assessmentSetup: parseSetup(school?.schoolSettings ?? null, setupTerm),
    });
  }
  return NextResponse.json(assessments.map(item => {
    const setup = parseSetup(school?.schoolSettings ?? null, item.term);
    const enabledCa = setup.components.filter(component => component.type === "CA" && component.enabled);
    const legacyCa1 = item.ca1 ?? (enabledCa.length === 1 && enabledCa[0].key === "ca1" ? item.ca : null);
    return {
      ...item,
      ca1: legacyCa1,
      assessmentSetup: setup,
      ca1CorrectionRemainingMs: remainingMs(item.ca1SavedAt),
      ca2CorrectionRemainingMs: remainingMs(item.ca2SavedAt),
      ca3CorrectionRemainingMs: remainingMs(item.ca3SavedAt),
      ca4CorrectionRemainingMs: remainingMs(item.ca4SavedAt),
      examCorrectionRemainingMs: remainingMs(item.examSavedAt),
    };
  }));
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

  const teacher = await db.teacher.findUnique({ where: { userId: user.id }, select: { id: true, approved: true } });
  if (!teacher?.approved) return NextResponse.json({ error: "Teacher is not approved" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const action = String(body?.action ?? "").trim();
  const studentId = String(body?.studentId ?? "");
  const classId = String(body?.classId ?? "");
  const subjectId = String(body?.subjectId ?? "");
  const term = String(body?.term ?? "").trim();
  const clientMutationAt = Number(body?.clientMutationAt);
  const entered = SCORE_FIELDS.filter(field => body?.[field] !== undefined && body?.[field] !== null && String(body[field]).trim() !== "");

  if (!classId || !subjectId || !term) {
    return NextResponse.json({ error: "Class, subject and term are required." }, { status: 400 });
  }

  const assigned = await db.teacherAssignment.findFirst({
    where: { schoolId, teacherId: teacher.id, classId, subjectId },
    select: { id: true },
  });
  if (!assigned) return NextResponse.json({ error: "You are not assigned to this class and subject" }, { status: 403 });

  const school = await db.school.findUnique({ where: { id: schoolId }, select: { schoolSettings: true } });
  const setup = parseSetup(school?.schoolSettings ?? null, term);

  if (action === "submit") {
    const result = await db.assessment.updateMany({
      where: { schoolId, classId, subjectId, term, submitted: false },
      data: { submitted: true, submittedAt: new Date(), submittedById: teacher.id },
    });
    await recordAudit({
      schoolId,
      actorUserId: user.id,
      action: "SUBMIT",
      entity: "ASSESSMENT",
      entityId: classId + ":" + subjectId + ":" + term,
      details: { classId, subjectId, term, setup, count: result.count },
    });
    return NextResponse.json({ submitted: true, count: result.count, assessmentSetup: setup });
  }

  if (!studentId) return NextResponse.json({ error: "Student is required." }, { status: 400 });
  if (!entered.length) return NextResponse.json({ error: "Enter a score before saving." }, { status: 400 });

  const student = await db.student.findFirst({ where: { id: studentId, schoolId, classId } });
  if (!student) return NextResponse.json({ error: "Student does not belong to this school/class" }, { status: 404 });

  const existing = await db.assessment.findUnique({
    where: { studentId_subjectId_term: { studentId, subjectId, term } },
  });

  if (existing?.submitted) return NextResponse.json({ error: "These scores have already been submitted and locked." }, { status: 409 });

  if (existing?.updatedAt && Number.isFinite(clientMutationAt) && existing.updatedAt.getTime() > clientMutationAt) {
    return NextResponse.json({ error: "This draft is older than the saved score. The older change was not applied." }, { status: 409 });
  }

  const now = new Date();
  const saveTimes: Record<ScoreField, keyof typeof existing> = {
    ca1: "ca1SavedAt",
    ca2: "ca2SavedAt",
    ca3: "ca3SavedAt",
    ca4: "ca4SavedAt",
    exam: "examSavedAt",
  };

  for (const field of entered) {
    const component = componentFor(setup, field);
    if (!component) return NextResponse.json({ error: field.toUpperCase() + " is not enabled for " + term + "." }, { status: 400 });
    const savedAt = existing?.[saveTimes[field] as keyof typeof existing] as Date | null | undefined;
    if (savedAt && !withinCorrectionWindow(savedAt)) {
      return NextResponse.json({ error: component.name + " correction window has expired for this student." }, { status: 409 });
    }
    const value = Number(body[field]);
    if (!Number.isFinite(value) || value < 0 || value > component.maxScore) {
      return NextResponse.json({ error: component.name + " must be between 0 and " + component.maxScore + "." }, { status: 400 });
    }
  }

  const currentCa1 = body.ca1 === undefined ? existing?.ca1 ?? (setup.components.filter(c => c.type === "CA" && c.enabled).length === 1 ? existing?.ca ?? null : null) : Number(body.ca1);
  const currentCa2 = body.ca2 === undefined ? existing?.ca2 ?? null : Number(body.ca2);
  const currentCa3 = body.ca3 === undefined ? existing?.ca3 ?? null : Number(body.ca3);
  const currentCa4 = body.ca4 === undefined ? existing?.ca4 ?? null : Number(body.ca4);
  const currentExam = body.exam === undefined ? existing?.exam ?? null : Number(body.exam);
  const caTotal = currentCa1 !== null || currentCa2 !== null || currentCa3 !== null || currentCa4 !== null
    ? [currentCa1, currentCa2, currentCa3, currentCa4].reduce((sum, value) => sum + (value ?? 0), 0)
    : null;

  const data = {
    classId,
    ca: caTotal,
    caMax: setup.components.filter(c => c.type === "CA" && c.enabled).reduce((sum, c) => sum + c.maxScore, 0),
    examMax: setup.components.find(c => c.key === "exam")?.maxScore ?? 60,
    ca1: currentCa1,
    ca1Max: setup.components.find(c => c.key === "ca1")?.maxScore ?? 10,
    ca2: currentCa2,
    ca2Max: setup.components.find(c => c.key === "ca2")?.maxScore ?? 10,
    ca3: currentCa3,
    ca3Max: setup.components.find(c => c.key === "ca3")?.maxScore ?? 10,
    ca4: currentCa4,
    ca4Max: setup.components.find(c => c.key === "ca4")?.maxScore ?? 10,
    exam: currentExam,
    ...Object.fromEntries(entered.map(field => [saveTimes[field], existing?.[saveTimes[field]] ?? now])),
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
    details: {
      studentId,
      classId,
      subjectId,
      term,
      entered: Object.fromEntries(entered.map(field => [field, Number(body[field])])),
      assessmentSetup: setup,
    },
  });

  const total = percentage(assessment.ca ?? 0, assessment.exam ?? 0);
  return NextResponse.json({
    ...assessment,
    total,
    assessmentSetup: setup,
    ca1CorrectionRemainingMs: remainingMs(assessment.ca1SavedAt),
    ca2CorrectionRemainingMs: remainingMs(assessment.ca2SavedAt),
    ca3CorrectionRemainingMs: remainingMs(assessment.ca3SavedAt),
    ca4CorrectionRemainingMs: remainingMs(assessment.ca4SavedAt),
    examCorrectionRemainingMs: remainingMs(assessment.examSavedAt),
  }, { status: existing ? 200 : 201 });
}
