import type { GradingBand } from "@/lib/grading";

export type SchoolSettings = {
  manualPaymentsEnabled: boolean;
  attendanceSessions: "MORNING" | "MORNING_AFTERNOON";
  resultHeading: string;
  firstTermLabel: string;
  secondTermLabel: string;
  thirdTermLabel: string;
  digitalResultEnabled: boolean;
  showPosition: boolean;
  showAttendance: boolean;
  showTeacherRemark: boolean;
  showPrincipalRemark: boolean;
  showSubjectBreakdown: boolean;
  showTotal: boolean;
  showGrade: boolean;
  showPercentage: boolean;
  showStudentName: boolean;
  showAdmissionId: boolean;
  showClass: boolean;
  teacherRemarks: Record<string, string>;
  principalRemarks: Record<string, string>;
  teacherRemarkLabel: string;
  principalRemarkLabel: string;
};

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  manualPaymentsEnabled: true,
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
    A: "Excellent performance. Keep it up.",
    B: "Very good performance. Continue working hard.",
    C: "Good effort. More consistent study will improve performance.",
    D: "Performance is below average. More effort is required.",
    E: "Performance needs improvement. More focus and regular study are required.",
    F: "Performance is very low. Immediate improvement is required.",
  },
  principalRemarks: {
    A: "Excellent performance. Keep up the good work.",
    B: "Very good performance. Continue to improve.",
    C: "Satisfactory performance. Encourage more consistent effort.",
    D: "Performance needs improvement. Closer attention is advised.",
    E: "More effort and support are required.",
    F: "Significant improvement is required. Close support is advised.",
  },
  teacherRemarkLabel: "Teacher Remark",
  principalRemarkLabel: "Principal Remark",
};

export const DEFAULT_GRADING_BANDS: GradingBand[] = [
  { min: 70, grade: "A" },
  { min: 60, grade: "B" },
  { min: 50, grade: "C" },
  { min: 45, grade: "D" },
  { min: 40, grade: "E" },
  { min: 0, grade: "F" },
];
