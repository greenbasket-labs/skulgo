/**
 * Shared SkulGo project brain.
 *
 * This is a source of truth for product-facing support/validation guidance.
 * It describes documented current behavior and clearly separates unfinished
 * or internal areas so the bot does not invent capabilities.
 */

export const SKULGO_KNOWLEDGE = {
  identity: "SkulGo is a lightweight connected school record book for Nigerian schools.",
  company: "SkulGo is a product of Green Basket Global Limited. It is not represented as a separate incorporated company.",
  motto: "Transparent & Secure Records",
  trustIdea: "Connected + Transparent records create trust.",
  model: "Personal account → School connection → Duty → School work",
  coreFlow: "People → Classes → Subjects → Attendance → Scores → Results → Fees",
  principle: "Enter the record once. Let the right information reach the right person.",

  roles: {
    ADMIN: "School proprietor/proprietress or responsible school administrator. Manages structure, applications, people, assignments, attendance overview, results, fees, settings, announcements and support.",
    TEACHER: "Sees only assigned work. A class teacher records whole-class attendance; subject teachers record CA and Exam scores for assigned classes and subjects.",
    STUDENT: "Sees their own class, attendance, subjects, scores/results and fees/balance.",
    PARENT: "Sees approved children and their connected attendance, fees/payments, results and announcements.",
    CASHIER: "Works with fee records, balances, cash/teller records and optional manual bank-transfer records.",
  },

  structure: {
    sections: "Sections are saved independently from classes. Standard sections are Nursery, Primary, Junior Secondary and Senior Secondary; Custom sections are supported.",
    classes: "Starter classes are Nursery 1–3, Primary 1–6, JSS 1–3 and SS 1–3. Optional arms such as A/B/C are supported.",
    subjects: "Subjects are school/class-specific and editable. Starter Nigerian subjects are provided; SkulGo is not a curriculum engine.",
    assign: "Assign connects approved teachers to classes, subjects and class-master duties.",
  },

  peopleAndAccess: {
    account: "One personal SkulGo account is the person's long-term identity.",
    schoolConnection: "A SchoolMembership connects that person to a particular school and role.",
    multipleSchools: "One personal account can connect to more than one school.",
    approval: "Student admissions, teacher/staff applications, cashier applications and parent/child links require the appropriate school approval.",
    ids: "Approved students receive a Student Admission ID; teachers receive a Teacher ID; non-academic staff can receive a staff ID.",
    history: "Ending school access closes the active relationship but retains school-membership history.",
    isolation: "School records are school-owned. APIs must authenticate the user, verify the active school membership and role, and verify the target record.",
  },

  records: {
    attendance: "The assigned class teacher records attendance during the school's configured attendance window. The current default window is 07:30–09:00 Nigeria time for morning attendance; schools can configure the supported windows.",
    assessment: "Teachers enter CA and Exam scores for their exact assigned class and subject. The documented scoring model is CA 0–30 and Exam 0–70, total CA + Exam.",
    results: "Results are generated from saved assessments and start unpublished. Admin publishes them. Student/Parent access is restricted to authorized published results.",
    seniorSecondary: "For SS1–SS3, a student does not need to offer every class subject. A subject is treated as offered when an assessment exists for that student/subject/term, and the current result rule requires at least 9 offered subjects.",
    fees: "Fees follow Fee name → amount → scope → student record → payment → balance. Payments are shared records, not separate ledgers per role.",
    paymentMethods: "Cash/teller and optional manual bank-transfer records are supported. Online payment is optional.",
    announcements: "Admin can publish lightweight school announcements to the relevant school community.",
    support: "Support is a school-to-SkulGo communication thread; the Support Bot can answer using this project brain and the conversation remains stored.",
    audit: "Important school actions, including support messages, use audit history.",
  },

  offline: {
    principle: "Offline is a product-wide behavior, not a separate module.",
    supported: "Attendance, scores and payment writes have offline queue support, with cached workspace/read records for supported pilot views.",
    sync: "Offline writes are scoped to the personal account plus school membership and are rechecked by the server when replayed.",
    limitation: "Offline navigation/recovery across every possible route is still an engineering hardening area; do not claim every screen is fully offline.",
  },

  resultsAndReports: {
    grading: "Default grading bands are A 70, B 60, C 50, D 45, E 40, F 0. Schools can configure their grading bands.",
    reportCard: "Report-card settings include heading, term labels, selected fields, attendance, remarks, subject breakdown, totals, grade, percentage, student name, Admission ID and class.",
    unlockStatus: "The complete SkulGo Result Unlock payment-gated access flow is not finished. Do not tell a school that the full payment-to-unlock workflow is currently complete.",
    commercialBoundary: "Result-access commercial pricing belongs to SkulGo terms and conditions. Do not present a fixed ₦200 price as a school requirement.",
  },

  teacherResources: {
    purpose: "Teacher Resources provide practical reusable teacher materials through the teacher's school assignment context.",
    currentFormats: "Current resources include reusable Lesson Plan, Lesson Note, Classroom Activity Pack and Quick Assessment Builder formats.",
    principle: "Resources are intended to be original, practical and reusable rather than copied from paid or third-party materials.",
  },

  accountAndSecurity: {
    deviceRule: "The current account/device architecture limits active devices to two and treats inactive devices as stale after the configured inactivity period; the owner has a separate seven-day inactivity rule.",
    workspace: "The selected school membership determines the active school workspace.",
    pin: "SkulGo uses a personal PIN capability for supported protected access flows.",
    owner: "The SkulGo Owner area is a separate private desktop-only control area and is not the school workspace.",
  },

  commercial: {
    schoolService: "SkulGo is intended as a paid school service with monthly, term and yearly plans, while the pilot focuses on usefulness first.",
    trial: "The product has a school trial/plan flow. The school-facing plan visibility can be delayed during the trial according to the current implementation.",
    affordability: "Cost is part of product validation: a feature should not make SkulGo unnecessarily expensive to extend, operate or maintain for smaller schools.",
    boundary: "Do not invent current subscription prices, discounts, payment-provider behavior or revenue claims when the user has not supplied current evidence.",
  },

  validatorCommunity: {
    purpose: "The Validator Community is for real-world school validation: people can join the community, discuss, test workflows, report real problems and contribute evidence.",
    distinction: "Joining the community does not automatically make someone an approved Validator.",
    bot: "The Validator Bot handles onboarding and formal validation actions; the Validator group can receive useful product guidance.",
    findingRule: "A useful validation finding should describe a real school problem, who is affected, impact/frequency, current workaround and evidence. Feature ideas alone are not equivalent to validated pain.",
    contribution: "Contribution should be based on useful verified work rather than spam or raw submissions. Do not promise money, employment, ownership or fixed rewards unless officially established.",
  },

  referrals: {
    accountId: "SkulGo Account IDs are used for referral/introduction tracking.",
    defaultRegistration: "The current registration form uses SKGA6UBY5 as the default introducer Account ID when no referral link supplies another ID; an explicit ?ref= value overrides the default.",
    levels: "The documented referral levels are Member 0–9, Connector 10–19, Builder 20–49, Ambassador 50–99 and Champion 100+.",
  },

  boundaries: [
    "SkulGo is not a full ERP.",
    "SkulGo is not a CRM.",
    "SkulGo is not a social network.",
    "Do not invent payroll, salary management, inventory, hostel, transport, library, biometrics, complex accounting, school websites, marketplaces, AI tutor, AI grading, advanced analytics, timetable engine, exam-hall management, large notification infrastructure or a large subscription billing engine.",
    "Do not create duplicate attendance, score, result, fee or payment ledgers for different roles.",
    "Do not promise an unfinished feature as completed.",
  ],

  validationRule: "A feature is worth serious consideration when it saves school time, protects a school record, reduces a school mistake, makes an existing record useful to the right person, and can be delivered and maintained affordably for smaller schools.",

  projectStatus: {
    coreMvp: "The core connected school record flow is implemented across personal accounts, school membership, people/approvals, structure, assignments, attendance, assessments, results, fees/payments, announcements/support and focused offline workflows.",
    currentDirection: "The immediate direction is real-school pilot hardening: observe real use, repair failures, wire existing records to the right roles and add only evidence-backed small capabilities.",
    unfinishedAreas: [
      "full Result Unlock payment-gated access flow",
      "complete report-card production verification",
      "full offline navigation/recovery hardening across pilot routes",
      "production backup/restore verification",
      "complete production security/tenant-isolation review",
      "commercial subscription/payment operations beyond the current lightweight layer",
    ],
  },
} as const;

function flatten(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flatten).join(" ");
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => key + ": " + flatten(item))
      .join(" ");
  }
  return "";
}

export const SKULGO_KNOWLEDGE_TEXT = flatten(SKULGO_KNOWLEDGE);

export function skulgoBrainIntro() {
  return [
    SKULGO_KNOWLEDGE.identity,
    "Motto: " + SKULGO_KNOWLEDGE.motto + ".",
    "Core model: " + SKULGO_KNOWLEDGE.model + ".",
    "Core flow: " + SKULGO_KNOWLEDGE.coreFlow + ".",
    SKULGO_KNOWLEDGE.principle,
    "Use documented current SkulGo behavior. Never invent a feature or promise an unfinished capability.",
  ].join(" ");
}
