import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { percentage } from "@/lib/grading";
import { recordAudit } from "@/lib/audit";

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

  return NextResponse.json(assessments);
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
  const studentId = String(body?.studentId ?? "");
  const classId = String(body?.classId ?? "");
  const subjectId = String(body?.subjectId ?? "");
  const term = String(body?.term ?? "").trim();
  const ca = Number(body?.ca);
  const exam = Number(body?.exam);

  if (!studentId || !classId || !subjectId || !term || !Number.isFinite(ca) || !Number.isFinite(exam)) {
    return NextResponse.json({ error: "studentId, classId, subjectId, term, ca and exam are required" }, { status: 400 });
  }
  if (ca < 0 || ca > 30 || exam < 0 || exam > 70) {
    return NextResponse.json({ error: "CA must be 0-30 and exam must be 0-70" }, { status: 400 });
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

  const assessment = await db.assessment.upsert({
    where: { studentId_subjectId_term: { studentId, subjectId, term } },
    update: { classId, ca, exam },
    create: { schoolId, studentId, classId, subjectId, term, ca, exam },
  });

  await recordAudit({ schoolId, actorUserId: user.id, action: "UPSERT", entity: "ASSESSMENT", entityId: assessment.id, details: { studentId, classId, subjectId, term, ca, exam } });

  return NextResponse.json({ ...assessment, total: percentage(ca, exam) }, { status: 201 });
}
