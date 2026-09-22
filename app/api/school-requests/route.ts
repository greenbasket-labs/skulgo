import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const schoolId = new URL(request.url).searchParams.get("schoolId");
  return NextResponse.json(await db.schoolRequest.findMany({
    where: schoolId ? { schoolId, userId: user.id } : { userId: user.id },
    include: { school: { select: { id: true, name: true, abbr: true } } },
    orderBy: { createdAt: "desc" },
  }));
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const schoolId = String(body?.schoolId ?? "");
  const type = String(body?.type ?? "");
  const requestedRole = String(body?.requestedRole ?? "");
  const classId = String(body?.classId ?? "") || null;
  const studentAdmissionId = String(body?.studentAdmissionId ?? "").trim() || null;

  const allowed =
    (type === "JOB" && requestedRole === "TEACHER") ||
    (type === "ADMISSION" && requestedRole === "STUDENT") ||
    (type === "ADMISSION" && requestedRole === "PARENT");

  if (!schoolId || !allowed) {
    return NextResponse.json({ error: "school, request type and role are required" }, { status: 400 });
  }

  const school = await db.school.findUnique({ where: { id: schoolId }, select: { id: true } });
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const membership = await db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId: user.id } },
  });
  if (membership) {
    return NextResponse.json({ error: "You are already connected to this school" }, { status: 409 });
  }

  if (type === "ADMISSION" && requestedRole === "STUDENT") {
    if (!classId) return NextResponse.json({ error: "Choose a class for admission" }, { status: 400 });
    const valid = await db.schoolClass.findFirst({ where: { id: classId, schoolId }, select: { id: true } });
    if (!valid) return NextResponse.json({ error: "Class does not belong to this school" }, { status: 400 });
  }

  if (type === "ADMISSION" && requestedRole === "PARENT") {
    if (!studentAdmissionId) {
      return NextResponse.json({ error: "Child Admission ID is required" }, { status: 400 });
    }

    const student = await db.student.findFirst({
      where: { schoolId, admissionId: studentAdmissionId },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found with that Admission ID" }, { status: 404 });
    }
  }

  try {
    const requestRecord = await db.schoolRequest.create({
      data: {
        schoolId,
        userId: user.id,
        type: type as "JOB" | "ADMISSION",
        requestedRole: requestedRole as "TEACHER" | "STUDENT" | "PARENT",
        classId,
        studentAdmissionId,
      },
    });
    return NextResponse.json(requestRecord, { status: 201 });
  } catch {
    return NextResponse.json({ error: "You already sent this type of request to this school" }, { status: 409 });
  }
}
