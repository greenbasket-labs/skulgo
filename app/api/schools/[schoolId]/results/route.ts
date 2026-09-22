import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { gradeFor, percentage } from "@/lib/grading";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.schoolId !== schoolId) {
    return NextResponse.json({ error: "School access required" }, { status: 403 });
  }

  const studentId = request.nextUrl.searchParams.get("studentId");
  const term = request.nextUrl.searchParams.get("term");
  const publishedOnly = request.nextUrl.searchParams.get("published") === "true";

  const results = await db.result.findMany({
    where: {
      schoolId,
      ...(studentId ? { studentId } : {}),
      ...(term ? { term } : {}),
      ...(publishedOnly ? { published: true } : {}),
    },
    include: {
      student: { select: { id: true, admissionId: true, firstName: true, lastName: true, classId: true } },
      subject: { select: { id: true, name: true } },
    },
    orderBy: [{ student: { lastName: "asc" } }, { subject: { name: "asc" } }],
  });

  return NextResponse.json(results);
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

  const body = await request.json().catch(() => null);
  const studentId = String(body?.studentId ?? "");
  const term = String(body?.term ?? "").trim();

  if (!studentId || !term) {
    return NextResponse.json({ error: "studentId and term are required" }, { status: 400 });
  }

  const student = await db.student.findFirst({
    where: { id: studentId, schoolId },
  });
  if (!student?.classId) return NextResponse.json({ error: "Student not found or has no class" }, { status: 404 });

  const assessments = await db.assessment.findMany({
    where: { schoolId, studentId, classId: student.classId, term },
  });

  if (!assessments.length) {
    return NextResponse.json({ error: "No assessments found for this student and term" }, { status: 404 });
  }

  const results = [];
  for (const assessment of assessments) {
    const total = percentage(assessment.ca, assessment.exam);
    const classmates = await db.assessment.findMany({
      where: {
        schoolId,
        classId: student.classId,
        subjectId: assessment.subjectId,
        term,
      },
      select: { ca: true, exam: true },
    });

    const scores = classmates
      .map((item) => percentage(item.ca, item.exam))
      .sort((a, b) => b - a);
    const position = scores.findIndex((score) => score === total) + 1;

    const result = await db.result.upsert({
      where: {
        studentId_subjectId_term: {
          studentId,
          subjectId: assessment.subjectId,
          term,
        },
      },
      update: {
        schoolId,
        total,
        percentage: total,
        grade: gradeFor(total),
        position,
      },
      create: {
        schoolId,
        studentId,
        subjectId: assessment.subjectId,
        term,
        total,
        percentage: total,
        grade: gradeFor(total),
        position,
      },
    });

    results.push(result);
  }

  return NextResponse.json(results, { status: 201 });
}
