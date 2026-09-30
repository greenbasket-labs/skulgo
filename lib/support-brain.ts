import { SKULGO_VALIDATOR_KNOWLEDGE, answerValidatorGroupMessage } from "@/lib/validator-brain";

export type SupportReplyContext = {
  subject?: string;
  message: string;
  role?: string;
  schoolName?: string;
  verification?: { schoolName?: string; role?: string };
  history?: Array<{ senderType: "USER" | "BOT"; body: string }>;
};

export async function verifySupportContext(
  db: { school: { findUnique: Function } },
  schoolId: string,
  role: string,
  _message: string
) {
  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: { name: true },
  });

  if (!school) return null;

  return { schoolName: school.name, role };
}

const PRODUCT = [
  ...SKULGO_VALIDATOR_KNOWLEDGE.identity ? [SKULGO_VALIDATOR_KNOWLEDGE.identity] : [],
  "Motto: Transparent & Secure Records.",
  "Core model: Personal account -> School connection -> Duty -> School work.",
  "Core flow: People -> Classes -> Subjects -> Attendance -> Scores -> Results -> Fees.",
  "One personal account can connect to multiple schools. School membership controls the person's role and access.",
  "Admin manages school structure, applications, approved people, assignments, attendance overview, results and fees.",
  "Teacher sees only assigned work. A class teacher records whole-class attendance. Subject teachers record CA and Exam scores for assigned class/subject work.",
  "Student sees their own class, attendance, subjects, scores/results and fees/balance.",
  "Parent sees approved children and their connected attendance, fees/payments, results and announcements.",
  "Cashier works with fee records, payments, balances and school cash/teller/manual bank-transfer records.",
  "Sections are separate from classes. Standard sections are Nursery, Primary, Junior Secondary and Senior Secondary.",
  "Starter classes are Nursery 1-3, Primary 1-6, JSS 1-3 and SS 1-3.",
  "Subjects are selected per school/class and can be added, edited or removed when not already in use.",
  "Assign connects teachers to classes, subjects and class-master duties.",
  "Attendance is recorded by the assigned class teacher during the configured attendance window. Attendance and score entry support offline queueing and synchronization.",
  "Results are generated from saved assessments and published by Admin. Published results are visible to authorized students/parents.",
  "Fees follow Fee name -> amount -> scope -> student record -> payment -> balance. Online payment is optional.",
  "Important school actions have audit history.",
  "School-specific settings can control sections, classes, subjects, grading, report-card presentation, attendance windows, fees and result access settings.",
  "Result Unlock is a SkulGo-controlled mechanism. The documented default is ₦200 per result; a school may configure its own result-view/unlock amount.",
  "Teacher Resources are practical reusable resources available through the teacher's school assignment context.",
  "SkulGo is intentionally lightweight and is not a payroll, inventory, hostel, transport, library, biometric, complex accounting, CRM, marketplace, school website builder, AI tutor/grading or social-network system.",
  "There is currently no documented temporary Admin role, fixed-duration Admin appointment, or arbitrary time-limited task assignment. Do not tell a school that this exists.",
  "There is no documented general task-management system for assigning a duty to someone for a fixed duration.",
  "Do not invent pricing, features, permissions, workflows, integrations or future promises.",
] as const;

function has(lower: string, ...terms: string[]) {
  return terms.some(term => lower.includes(term));
}

export function answerSkulGoSupport(context: SupportReplyContext): string {
  const text = [context.subject ?? "", context.message].join(" ").trim();
  const verifiedRole = context.verification?.role ?? context.role;
  const verifiedSchool = context.verification?.schoolName ?? context.schoolName;
  void verifiedRole;
  void verifiedSchool;
  void context.history;
  const lower = text.toLowerCase();

  if (!text) return "Tell me what you are trying to do or what went wrong.";

  if (has(lower, "temporary admin", "temporary administrator", "temporary admin role", "fixed duration admin", "duration task", "fixed duration task", "temporary role")) {
    return "Not in the current SkulGo workflow. SkulGo currently has fixed school roles such as Admin, Teacher, Student, Parent and Cashier, with access controlled by the person's school membership. There is no documented temporary Admin role or fixed-duration task assignment. If you need someone to help the school temporarily, the current system does not provide a time-limited Admin/duty mechanism.";
  }

  if (has(lower, "overall student", "student overall", "overall result", "overall score", "overall average", "total result")) {
    return "Yes. For a student's overall result, SkulGo can use the subject results generated from that student's saved assessments. The overall total is the sum of the subject totals, the maximum is the number of result subjects multiplied by 100, the average is total divided by the number of result subjects, and the overall grade follows the school's configured grading bands. Results must first be generated from saved assessments and then published by Admin.";
  }

  if (has(lower, "attendance", "absent", "present", "mark attendance")) {
    return "Attendance is a class-teacher duty. The assigned class teacher records the whole class during the school's configured attendance window. Drafts can save automatically, and supported attendance entry can work offline and synchronize when connectivity returns. If something is wrong, tell me the class and the exact behavior.";
  }

  if (has(lower, "score", "scores", "ca", "exam", "assessment")) {
    return "Scores are entered by teachers through their assigned class and subject work. SkulGo supports CA and Exam records, and results are generated from those saved assessments. If a score is missing or wrong, tell me the class, subject, student and exact behavior.";
  }

  if (has(lower, "result", "report card", "publish")) {
    return "SkulGo generates results from saved assessments and Admin publishes them. Students and parents then see published results according to their authorized school connection. The school can configure grading bands and report-card presentation.";
  }

  if (has(lower, "fee", "fees", "payment", "balance", "cashier")) {
    return "Fees and payments stay connected: fee definition -> student fee record -> payment -> balance. Cash/teller and manual bank-transfer records are supported, while online payment is optional. Tell me the student's Admission ID and the exact payment issue if you need troubleshooting.";
  }

  if (has(lower, "teacher", "assignment", "assign")) {
    return "Teachers only see work assigned to them. Admin connects teachers to classes, subjects and class-master duties. If a teacher cannot see expected work, check the active school assignment first.";
  }

  if (has(lower, "parent", "child")) {
    return "Parents see only approved child connections and the child's authorized school records. The school must approve the parent/child relationship first.";
  }

  if (has(lower, "student", "admission id", "admission")) {
    return "After Admin approves a student admission, SkulGo creates the student's Admission ID and connects the student to the selected class. The student then sees their own authorized school records.";
  }

  if (has(lower, "offline", "internet", "sync", "connection")) {
    return "SkulGo is designed for poor or expensive connectivity. Supported attendance and score writes can be queued on the device while offline and synchronized when internet returns.";
  }

  if (has(lower, "class", "section", "subject")) {
    return "SkulGo keeps school structure simple: Sections -> Classes -> Subjects. Sections are saved separately, classes sit under the school's sections, and subjects are selected for the classes the school actually offers.";
  }

  if (has(lower, "account", "role", "membership", "access", "login")) {
    return "A personal SkulGo account is the person's identity. A school membership gives that person a role and authorized access to that school's records. The same personal account can connect to more than one school.";
  }

  if (has(lower, "result unlock", "unlock")) {
    return "Result Unlock is a SkulGo-controlled access mechanism. The documented default is ₦200 per result, while a school can configure its own result-view/unlock amount. I will not invent a different price.";
  }

  if (has(lower, "teacher resource", "lesson plan", "lesson note", "teaching aid")) {
    return "Teacher Resources are intended to provide practical, reusable teacher materials through the teacher's school assignment context. The current direction is to keep them useful and lightweight.";
  }

  if (has(lower, "what is skulgo", "how does skulgo work", "about skulgo")) {
    return "SkulGo is a lightweight connected school record book for Nigerian schools. Its core flow is People -> Classes -> Subjects -> Attendance -> Scores -> Results -> Fees. Each person works through a personal account and an authorized school duty. The principle is: enter the record once and let the right information reach the right person.";
  }

  if (has(lower, "bug", "error", "not working", "doesn't work", "cannot", "can't", "wrong", "missing", "problem")) {
    return "I can help narrow it down. Send your role, school/workspace, what you were trying to do, what you expected, and what actually happened or the exact error. I will use the current SkulGo workflow and will not invent a feature.";
  }

  const validatorAnswer = answerValidatorGroupMessage(text);
  if (validatorAnswer) return validatorAnswer;

  return "I understand the question, but the current SkulGo product knowledge does not establish that workflow yet. I do not want to guess. Tell me the exact school duty you are trying to perform and I will explain the closest current SkulGo workflow.";
}

export function supportKnowledgeSummary() {
  return PRODUCT.join(" ");
}
