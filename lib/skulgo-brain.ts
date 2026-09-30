/**
 * Shared SkulGo product knowledge.
 *
 * This is the common product brain used by Support and Validator workflows.
 * It describes the current product boundary and documented behavior; it is
 * deliberately not an invitation to invent features.
 */

export const SKULGO_KNOWLEDGE = {
  identity: "SkulGo is a lightweight connected school record book for Nigerian schools.",
  motto: "Transparent & Secure Records",
  model: "Personal account → School connection → Duty → School work",
  coreFlow: "People → Classes → Subjects → Attendance → Scores → Results → Fees",
  principle: "Enter the record once. Let the right information reach the right person.",

  roles: {
    ADMIN: "Manages school structure, applications, people, assignments, attendance overview, results, fees and school settings.",
    TEACHER: "Sees only assigned work. Class teachers record whole-class attendance; subject teachers record CA and Exam scores for assigned classes and subjects.",
    STUDENT: "Sees their own class, attendance, subjects, scores/results and fees/balance.",
    PARENT: "Sees approved children and their connected attendance, fees/payments, results and announcements.",
    CASHIER: "Works with fee records, balances, cash/teller records and optional manual bank-transfer records.",
  },

  structure: {
    sections: "Sections are saved independently from classes. Standard sections are Nursery, Primary, Junior Secondary and Senior Secondary.",
    classes: "Starter classes are Nursery 1–3, Primary 1–6, JSS 1–3 and SS 1–3. Arms such as A/B/C can be used.",
    subjects: "Subjects are school/class-specific and editable. SkulGo is not a curriculum engine.",
    assign: "Assign connects approved teachers to classes, subjects and class-master duties.",
  },

  records: {
    attendance: "The assigned class teacher records attendance during the school's configured attendance window. Attendance supports offline entry and synchronization when internet returns.",
    assessment: "Teachers enter CA and Exam scores for assigned class/subject work.",
    results: "Results are generated from saved assessments and published by Admin. Students and parents see published results according to their authorized connection.",
    fees: "Fees follow Fee name → amount → scope → student record → payment → balance. Online payment is optional.",
    audit: "Important school changes create audit history.",
  },

  identityAndAccess: {
    personalAccount: "A personal SkulGo account is the person's long-term identity.",
    membership: "A school membership connects the person to a school with a role and authorized access.",
    multiSchool: "One personal account can connect to more than one school.",
    isolation: "School records remain school-owned and APIs must enforce authenticated school membership and role.",
    history: "Ending a school relationship closes access while retaining the relationship history.",
  },

  productBoundary: [
    "SkulGo is not a full ERP.",
    "SkulGo is not a CRM.",
    "SkulGo is not a social network.",
    "Do not invent payroll, inventory, hostel, transport, library, biometrics, complex accounting, school websites, marketplaces, AI tutor, AI grading, advanced analytics or large notification infrastructure.",
    "Do not invent subscription prices or promise future features.",
  ],

  offline: "SkulGo is designed for poor or expensive connectivity. Supported offline writes queue locally and synchronize when internet returns.",
  communication: "Announcements and Support are lightweight communication tools, not a full social/chat platform.",
  teacherResources: "Teacher Resources provide practical reusable teacher materials through the teacher's school assignment context.",
  resultUnlock: "Result Unlock is controlled by SkulGo. The documented default is ₦200 per result, while a school can configure its own result-view/unlock amount.",
  configuration: "One SkulGo engine serves schools with school-owned configuration for sections, classes, subjects, fees, grading and result presentation.",
  developmentRule: "A feature is worth serious consideration when it saves school time, protects a school record, reduces a school mistake, makes an existing record useful to the right person, and can be delivered and maintained affordably for smaller schools.",
} as const;

export const SKULGO_KNOWLEDGE_TEXT = Object.entries(SKULGO_KNOWLEDGE)
  .map(([key, value]) => {
    if (Array.isArray(value)) return key + ": " + value.join(" ");
    if (typeof value === "object") return key + ": " + Object.entries(value).map(([k, v]) => k + " — " + v).join(" ");
    return key + ": " + value;
  })
  .join("\n");

export function skulgoBrainIntro() {
  return [
    SKULGO_KNOWLEDGE.identity,
    "Motto: " + SKULGO_KNOWLEDGE.motto + ".",
    "Core model: " + SKULGO_KNOWLEDGE.model + ".",
    "Core flow: " + SKULGO_KNOWLEDGE.coreFlow + ".",
    SKULGO_KNOWLEDGE.principle,
    "Use only documented current SkulGo behavior. If the evidence is insufficient, say so and ask for the exact situation instead of inventing a feature.",
  ].join(" ");
}
