import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { DEFAULT_SCHOOL_SETTINGS } from "@/lib/school-settings";
import { getAttendanceWindow, getAttendanceWindowState } from "@/lib/attendance-window";

function parseSchoolSettings(value: string | null) {
  if (!value) return { ...DEFAULT_SCHOOL_SETTINGS };
  try { return { ...DEFAULT_SCHOOL_SETTINGS, ...(JSON.parse(value) as Record<string, unknown>) }; }
  catch { return { ...DEFAULT_SCHOOL_SETTINGS }; }
}

async function expireSession(sessionId: string) {
  return db.attendanceSession.update({
    where: { id: sessionId },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });
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

  const school = await db.school.findUnique({ where: { id: schoolId }, select: { schoolSettings: true } });
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });
  const settings = parseSchoolSettings(school.schoolSettings);

  const classId = request.nextUrl.searchParams.get("classId");
  const date = request.nextUrl.searchParams.get("date");
  const requestedSession = request.nextUrl.searchParams.get("session");
  const session = requestedSession === "afternoon" ? "afternoon" : "morning";
  const attendanceWindow = getAttendanceWindow(settings, session);
  let allowedStudentIds: string[] | null = null;
  let allowedClassIds: string[] | null = null;

  if (user.membership.role === "TEACHER") {
    const teacher = await db.teacher.findUnique({
      where: { userId: user.id },
      select: { id: true, approved: true },
    });
    if (!teacher?.approved) return NextResponse.json({ error: "Teacher is not approved" }, { status: 403 });

    const classes = await db.classTeacher.findMany({
      where: { schoolId, teacherId: teacher.id },
      select: { classId: true },
    });
    allowedClassIds = classes.map(item => item.classId);
  } else if (user.membership.role === "STUDENT") {
    if (!user.student?.id) return NextResponse.json({ records: [], session: null });
    allowedStudentIds = [user.student.id];
  } else if (user.membership.role === "PARENT") {
    if (!user.parent?.id) return NextResponse.json({ records: [], session: null });
    const links = await db.parentStudent.findMany({
      where: { parentId: user.parent.id, approved: true, student: { schoolId } },
      select: { studentId: true },
    });
    allowedStudentIds = links.map(item => item.studentId);
  } else if (user.membership.role === "CASHIER") {
    return NextResponse.json({ records: [], session: null });
  }

  if (classId && allowedClassIds && !allowedClassIds.includes(classId)) {
    return NextResponse.json({ error: "You cannot view attendance for this class" }, { status: 403 });
  }

  let sessionRecord = null;
  if (classId && date) {
    sessionRecord = await db.attendanceSession.findUnique({
      where: { classId_date_session: { classId, date: new Date(date), session } },
    });
    if (sessionRecord?.status === "DRAFT" && new Date() >= sessionRecord.deadlineAt) {
      sessionRecord = await expireSession(sessionRecord.id);
    }
  }

  const records = await db.attendance.findMany({
    where: {
      schoolId,
      ...(classId ? { classId } : {}),
      ...(allowedClassIds ? { classId: { in: allowedClassIds } } : {}),
      ...(allowedStudentIds ? { studentId: { in: allowedStudentIds } } : {}),
      ...(date ? { date: new Date(date) } : {}),
      ...(classId && date ? { session } : {}),
    },
    include: {
      student: { select: { id: true, admissionId: true, firstName: true, lastName: true, gender: true } },
      class: { select: { id: true, name: true, arm: true } },
    },
    orderBy: [{ date: "desc" }, { student: { lastName: "asc" } }],
  });

  return NextResponse.json({ records, session: sessionRecord, attendanceWindow });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.schoolId !== schoolId || user.membership.role !== "TEACHER") {
    return NextResponse.json({ error: "Teacher access required" }, { status: 403 });
  }

  const school = await db.school.findUnique({ where: { id: schoolId }, select: { schoolSettings: true } });
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });
  const settings = parseSchoolSettings(school.schoolSettings);

  const teacher = await db.teacher.findUnique({
    where: { userId: user.id },
    select: { id: true, approved: true },
  });
  if (!teacher?.approved) return NextResponse.json({ error: "Teacher is not approved" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const studentId = String(body?.studentId ?? "");
  const classId = String(body?.classId ?? "");
  const session = String(body?.session ?? "morning").trim();
  const dateValue = String(body?.date ?? "");
  const present = body?.present;
  const action = String(body?.action ?? "save").toLowerCase();

  if (!classId || !dateValue || !session) {
    return NextResponse.json({ error: "classId, date and session are required" }, { status: 400 });
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  if (session === "afternoon" && settings.attendanceSessions !== "MORNING_AFTERNOON") {
    return NextResponse.json({ error: "Afternoon attendance is not enabled by the school" }, { status: 409 });
  }
  const attendanceWindow = getAttendanceWindow(settings, session);
  const windowState = getAttendanceWindowState(new Date(), date, attendanceWindow);
  if (!windowState.allowed) {
    return NextResponse.json({
      error: windowState.before
        ? `Attendance opens at ${attendanceWindow.startTime} (Nigeria time)`
        : `Attendance closed at ${attendanceWindow.endTime} (Nigeria time)`,
      attendanceWindow,
    }, { status: 409 });
  }

  const classTeacher = await db.classTeacher.findFirst({
    where: { schoolId, teacherId: teacher.id, classId },
    select: { id: true },
  });
  if (!classTeacher) return NextResponse.json({ error: "Only the assigned class teacher can record attendance" }, { status: 403 });

  let attendanceSession = await db.attendanceSession.findUnique({
    where: { classId_date_session: { classId, date, session } },
  });

  if (attendanceSession?.status === "DRAFT" && new Date() >= attendanceSession.deadlineAt) {
    attendanceSession = await expireSession(attendanceSession.id);
  }

  if (action === "submit") {
    if (!attendanceSession) {
      return NextResponse.json({ error: "Attendance has not been started yet" }, { status: 400 });
    }
    if (attendanceSession.status === "SUBMITTED") {
      return NextResponse.json({ session: attendanceSession, attendanceWindow });
    }

    attendanceSession = await db.attendanceSession.update({
      where: { id: attendanceSession.id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    });

    await recordAudit({
      schoolId,
      actorUserId: user.id,
      action: "SUBMIT",
      entity: "ATTENDANCE_SESSION",
      entityId: attendanceSession.id,
      details: { classId, date: dateValue, session },
    });

    return NextResponse.json({ session: attendanceSession });
  }

  if (!studentId || typeof present !== "boolean") {
    return NextResponse.json({ error: "studentId and present are required to save attendance" }, { status: 400 });
  }

  if (attendanceSession?.status === "SUBMITTED") {
    return NextResponse.json({ error: "Attendance is already submitted and locked", session: attendanceSession }, { status: 409 });
  }

  if (!attendanceSession) {
    const now = new Date();
    attendanceSession = await db.attendanceSession.upsert({
      where: { classId_date_session: { classId, date, session } },
      update: {},
      create: {
        schoolId,
        classId,
        teacherId: teacher.id,
        date,
        session,
        status: "DRAFT",
        startedAt: windowState.start,
        deadlineAt: windowState.end,
      },
    });
  }

  if (new Date() >= attendanceSession.deadlineAt) {
    attendanceSession = await expireSession(attendanceSession.id);
    return NextResponse.json({ error: `Attendance closed at ${attendanceWindow.endTime} (Nigeria time)`, session: attendanceSession, attendanceWindow }, { status: 409 });
  }

  const student = await db.student.findFirst({ where: { id: studentId, schoolId, classId } });
  if (!student) return NextResponse.json({ error: "Student does not belong to this school/class" }, { status: 404 });

  const recordedAt = new Date();
  const record = await db.attendance.upsert({
    where: { studentId_date_session: { studentId, date, session } },
    update: { present, recordedAt },
    create: { schoolId, studentId, classId, date, session, present, recordedAt },
  });

  await recordAudit({
    schoolId,
    actorUserId: user.id,
    action: "UPSERT",
    entity: "ATTENDANCE",
    entityId: record.id,
    details: { studentId, classId, date: dateValue, session, present },
  });

  return NextResponse.json({ record, session: attendanceSession, attendanceWindow }, { status: 201 });
}
