import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const DEFAULT_SETTINGS = {
  attendanceSessions: "MORNING",
  resultHeading: "Student Report Card",
  firstTermLabel: "First Term",
  secondTermLabel: "Second Term",
  thirdTermLabel: "Third Term",
  digitalResultEnabled: true,
  showPosition: true,
  showAttendance: true,
  showTeacherRemark: true,
  showPrincipalRemark: true,
  showSubjectBreakdown: true,
  showTotal: true,
  showGrade: true,
  showPercentage: true,
  showStudentName: true,
  showAdmissionId: true,
  showClass: true,
  teacherRemarks: {
    A: "Excellent performance. Keep it up.", B: "Very good performance. Continue working hard.", C: "Good effort. More consistent study will improve performance.",
    D: "Performance is below average. More effort is required.", E: "Performance needs improvement. More focus and regular study are required.", F: "Performance is very low. Immediate improvement is required.",
  },
  principalRemarks: {
    A: "Excellent performance. Keep up the good work.", B: "Very good performance. Continue to improve.", C: "Satisfactory performance. Encourage more consistent effort.",
    D: "Performance needs improvement. Closer attention is advised.", E: "More effort and support are required.", F: "Significant improvement is required. Close support is advised.",
  },
  teacherRemarkLabel: "Teacher Remark",
  principalRemarkLabel: "Principal Remark",
};

const DEFAULT_GRADING_BANDS = [
  { min: 70, grade: "A" },
  { min: 60, grade: "B" },
  { min: 50, grade: "C" },
  { min: 45, grade: "D" },
  { min: 40, grade: "E" },
  { min: 0, grade: "F" },
];

function parseSettings(value: string | null) {
  if (!value) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(value) as Record<string, unknown>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function parseBands(value: string | null) {
  if (!value) return DEFAULT_GRADING_BANDS;
  try {
    const bands = JSON.parse(value) as unknown;
    return Array.isArray(bands) ? bands : DEFAULT_GRADING_BANDS;
  } catch {
    return DEFAULT_GRADING_BANDS;
  }
}

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();

  if (!user?.membership || user.membership.schoolId !== schoolId || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: { id: true, schoolSettings: true, gradingBands: true },
  });

  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  return NextResponse.json({
    settings: parseSettings(school.schoolSettings),
    gradingBands: parseBands(school.gradingBands),
    resultUnlockManagedBy: "SKULGO",
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();

  if (!user?.membership || user.membership.schoolId !== schoolId || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const current = await db.school.findUnique({
    where: { id: schoolId },
    select: { schoolSettings: true, gradingBands: true },
  });
  if (!current) return NextResponse.json({ error: "School not found" }, { status: 404 });

  const currentSettings = parseSettings(current.schoolSettings);
  const nextSettings = { ...currentSettings };

  const editableStringFields = [
    "resultHeading",
    "firstTermLabel",
    "secondTermLabel",
    "thirdTermLabel",
    "teacherRemarkLabel",
    "principalRemarkLabel",
  ] as const;

  for (const field of editableStringFields) {
    if (body?.settings?.[field] !== undefined) {
      const value = String(body.settings[field]).trim();
      if (!value) return NextResponse.json({ error: field + " cannot be empty" }, { status: 400 });
      nextSettings[field] = value;
    }
  }

  if (body?.settings?.attendanceSessions !== undefined) {
    const value = String(body.settings.attendanceSessions);
    if (value !== "MORNING" && value !== "MORNING_AFTERNOON") {
      return NextResponse.json({ error: "Invalid attendance session setting" }, { status: 400 });
    }
    nextSettings.attendanceSessions = value;
  }

  for (const field of [
    "digitalResultEnabled",
    "showPosition",
    "showAttendance",
    "showTeacherRemark",
    "showPrincipalRemark",
    "showSubjectBreakdown",
    "showTotal",
    "showGrade",
    "showPercentage",
    "showStudentName",
    "showAdmissionId",
    "showClass",
  ] as const) {
    if (body?.settings?.[field] !== undefined) nextSettings[field] = Boolean(body.settings[field]);
  }

  for (const field of ["teacherRemarks", "principalRemarks"] as const) {
    if (body?.settings?.[field] !== undefined) {
      const value = body.settings[field];
      if (!value || typeof value !== "object") return NextResponse.json({ error: "Invalid " + field }, { status: 400 });
      const next: Record<string, string> = { ...nextSettings[field] };
      for (const grade of ["A", "B", "C", "D", "E", "F"]) {
        if (value[grade] !== undefined) {
          const remark = String(value[grade]).trim();
          if (!remark) return NextResponse.json({ error: field + " " + grade + " cannot be empty" }, { status: 400 });
          next[grade] = remark;
        }
      }
      nextSettings[field] = next;
    }
  }

  let nextBands = parseBands(current.gradingBands);
  if (body?.gradingBands !== undefined) {
    if (!Array.isArray(body.gradingBands) || body.gradingBands.length < 1) {
      return NextResponse.json({ error: "At least one grading band is required" }, { status: 400 });
    }

    const parsed = body.gradingBands.map((band: unknown) => {
      const item = band as { min?: unknown; grade?: unknown };
      return { min: Number(item.min), grade: String(item.grade ?? "").trim().toUpperCase() };
    });

    if (
      parsed.some((band: { min: number; grade: string }) =>
        !Number.isFinite(band.min) || band.min < 0 || band.min > 100 || !band.grade
      )
    ) {
      return NextResponse.json({ error: "Invalid grading band" }, { status: 400 });
    }

    parsed.sort((a: { min: number }, b: { min: number }) => b.min - a.min);
    if (parsed[parsed.length - 1].min !== 0) {
      return NextResponse.json({ error: "The lowest grading band must start at 0" }, { status: 400 });
    }
    nextBands = parsed;
  }

  const saved = await db.school.update({
    where: { id: schoolId },
    data: {
      schoolSettings: JSON.stringify(nextSettings),
      gradingBands: JSON.stringify(nextBands),
    },
    select: { schoolSettings: true, gradingBands: true },
  });

  await recordAudit({
    schoolId,
    actorUserId: user.id,
    action: "UPDATE",
    entity: "SCHOOL_SETTINGS",
    entityId: schoolId,
    details: {
      settings: nextSettings,
      gradingBands: nextBands,
      resultUnlockManagedBy: "SKULGO",
    },
  });

  return NextResponse.json({
    settings: parseSettings(saved.schoolSettings),
    gradingBands: parseBands(saved.gradingBands),
    resultUnlockManagedBy: "SKULGO",
  });
}
