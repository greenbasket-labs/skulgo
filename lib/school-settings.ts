export type SchoolSettings = {
  manualPaymentsEnabled: boolean;
  resultHeading: string;
  firstTermLabel: string;
  secondTermLabel: string;
  thirdTermLabel: string;
  resultUnlockPrice: number;
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
};

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  manualPaymentsEnabled: true,
  resultHeading: "Student Report Card",
  firstTermLabel: "First Term",
  secondTermLabel: "Second Term",
  thirdTermLabel: "Third Term",
  resultUnlockPrice: 200,
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
};
