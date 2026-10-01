import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

const DEFAULT_SETTINGS = {
  attendanceSessions: "MORNING",
  morningAttendanceStart: "07:30",
  morningAttendanceEnd: "09:00",
  afternoonAttendanceStart: "13:00",
  afternoonAttendanceEnd: "14:00",
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

const DEFAULT_ASSESSMENT_SETUP = {
  "First Term": {
    components: [
      { key: "ca1", name: "CA", maxScore: 40, enabled: true, type: "CA", sortOrder: 1 },
      { key: "ca2", name: "CA 2", maxScore: 0, enabled: false, type: "CA", sortOrder: 2 },
      { key: "ca3", name: "CA 3", maxScore: 0, enabled: false, type: "CA", sortOrder: 3 },
      { key: "ca4", name: "CA 4", maxScore: 0, enabled: false, type: "CA", sortOrder: 4 },
      { key: "exam", name: "Exam", maxScore: 60, enabled: true, type: "EXAM", sortOrder: 5 },
    ],
  },
  "Second Term": {
    components: [
      { key: "ca1", name: "CA", maxScore: 40, enabled: true, type: "CA", sortOrder: 1 },
      { key: "ca2", name: "CA 2", maxScore: 0, enabled: false, type: "CA", sortOrder: 2 },
      { key: "ca3", name: "CA 3", maxScore: 0, enabled: false, type: "CA", sortOrder: 3 },
      { key: "ca4", name: "CA 4", maxScore: 0, enabled: false, type: "CA", sortOrder: 4 },
      { key: "exam", name: "Exam", maxScore: 60, enabled: true, type: "EXAM", sortOrder: 5 },
    ],
  },
  "Third Term": {
    components: [
      { key: "ca1", name: "CA", maxScore: 40, enabled: true, type: "CA", sortOrder: 1 },
      { key: "ca2", name: "CA 2", maxScore: 0, enabled: false, type: "CA", sortOrder: 2 },
      { key: "ca3", name: "CA 3", maxScore: 0, enabled: false, type: "CA", sortOrder: 3 },
      { key: "ca4", name: "CA 4", maxScore: 0, enabled: false, type: "CA", sortOrder: 4 },
      { key: "exam", name: "Exam", maxScore: 60, enabled: true, type: "EXAM", sortOrder: 5 },
    ],
  },
} as const;

function parseSettings(value: string | null) {
  if (!value) return { ...DEFAULT_SETTINGS };
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(value) as Record<string, unknown>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function parseAssessmentSetup(value: unknown) {
  if (!value || typeof value !== "object") return JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_SETUP));
  const raw = value as Record<string, unknown>;
  const setup: Record<string, { components: unknown[] }> = {};
  for (const term of ["First Term", "Second Term", "Third Term"]) {
    const item = raw[term];
    setup[term] = item && typeof item === "object" && Array.isArray((item as any).components)
      ? { components: (item as any).components }
      : { components: JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_SETUP[term as keyof typeof DEFAULT_ASSESSMENT_SETUP].components)) };
  }
  return setup;
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

  const parsedSettings = parseSettings(school.schoolSettings) as Record<string, unknown>;
  return NextResponse.json({
    settings: parsedSettings,
    assessmentSetup: parseAssessmentSetup(parsedSettings.assessmentSetup),
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

  for (const field of ["morningAttendanceStart", "morningAttendanceEnd", "afternoonAttendanceStart", "afternoonAttendanceEnd"] as const) {
    if (body?.settings?.[field] !== undefined) {
      const value = String(body.settings[field]).trim();
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NextResponse.json({ error: "Invalid attendance time" }, { status: 400 });
      nextSettings[field] = value;
    }
  }

  for (const [startField, endField] of [["morningAttendanceStart", "morningAttendanceEnd"], ["afternoonAttendanceStart", "afternoonAttendanceEnd"]] as const) {
    if (nextSettings[startField] >= nextSettings[endField]) {
      return NextResponse.json({ error: "Attendance opening time must be before closing time" }, { status: 400 });
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
      const next = { ...nextSettings[field] };
      for (const grade of ["A", "B", "C", "D", "E", "F"] as const) {
        if (value[grade] !== undefined) {
          const remark = String(value[grade]).trim();
          if (!remark) return NextResponse.json({ error: field + " " + grade + " cannot be empty" }, { status: 400 });
          next[grade] = remark;
        }
      }
      nextSettings[field] = next;
    }
  }

  let nextAssessmentSetup = parseAssessmentSetup(currentSettings.assessmentSetup);

  if (body?.assessmentSetup !== undefined) {
    nextAssessmentSetup = parseAssessmentSetup(body.assessmentSetup);

    for (const termName of ["First Term", "Second Term", "Third Term"]) {
      const components = (nextAssessmentSetup as any)[termName].components
        .map((item: any, index: number) => ({
          key: String(item.key ?? ""),
          name: String(item.name ?? "").trim(),
          maxScore: Number(item.maxScore),
          enabled: Boolean(item.enabled),
          type: String(item.type ?? ""),
          sortOrder: Number(item.sortOrder ?? index + 1),
        }))
        .filter((item: any) => ["ca1", "ca2", "ca3", "ca4", "exam"].includes(item.key));

      if (components.length !== 5) {
        return NextResponse.json({ error: "Each term must contain CA1-CA4 and Exam setup." }, { status: 400 });
      }

      const enabled = components.filter((item: any) => item.enabled);
      const exam = components.find((item: any) => item.key === "exam");
      const ca = components.filter((item: any) => item.key !== "exam" && item.enabled);
      if (!exam?.enabled || exam.maxScore <= 0) {
        return NextResponse.json({ error: termName + ": Exam must be enabled with a maximum score." }, { status: 400 });
      }
      if (ca.length === 0) {
        return NextResponse.json({ error: termName + ": At least one CA box must be enabled." }, { status: 400 });
      }
      if (enabled.some((item: any) => item.maxScore <= 0 || item.maxScore > 100 || !item.name)) {
        return NextResponse.json({ error: termName + ": every enabled box needs a name and maximum score between 1 and 100." }, { status: 400 });
      }
      const total = enabled.reduce((sum: number, item: any) => sum + item.maxScore, 0);
      if (total !== 100) {
        return NextResponse.json({ error: termName + ": enabled CA and Exam maximums must total exactly 100." }, { status: 400 });
      }

      const existingCount = await db.assessment.count({ where: { schoolId, term: termName } });
      const old = parseAssessmentSetup(currentSettings.assessmentSetup) as any;
      if (existingCount > 0 && JSON.stringify(old[termName]) !== JSON.stringify((nextAssessmentSetup as any)[termName])) {
        return NextResponse.json({ error: termName + ": assessment setup is locked because scores already exist." }, { status: 409 });
      }

      (nextAssessmentSetup as any)[termName] = {
        components: components.sort((a: any, b: any) => a.sortOrder - b.sortOrder),
      };
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
      schoolSettings: JSON.stringify({ ...nextSettings, assessmentSetup: nextAssessmentSetup }),
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
      settings: { ...nextSettings, assessmentSetup: nextAssessmentSetup },
      assessmentSetup: nextAssessmentSetup,
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
