import { SKULGO_KNOWLEDGE, SKULGO_KNOWLEDGE_TEXT } from "@/lib/skulgo-brain";

export type SupportReplyContext = {
  subject?: string;
  message: string;
};

const KNOWLEDGE = [
  "SkulGo is a lightweight connected school record book for Nigerian schools.",
  "Motto: Transparent & Secure Records.",
  "Core model: Personal account -> School connection -> Duty -> School work.",
  "Core record flow: People -> Classes -> Subjects -> Attendance -> Scores -> Results -> Fees.",
  "Principle: Enter the record once. Let the right information reach the right person.",
  "SkulGo is an internal school operating record tool, not a full ERP, CRM, accounting suite or social network.",
  "A person keeps one personal SkulGo account and can have different school connections and roles.",
  "School records belong to the school. Access is controlled by the person's active school membership and role.",
  "Admin manages school structure, applications, people, assignments, attendance overview, results and fees.",
  "Teacher sees only assigned work. A class teacher records attendance for the assigned class. Subject teachers record CA and Exam scores for assigned classes and subjects.",
  "Student sees their own class, attendance, subjects, scores/results and fees/balance.",
  "Parent sees approved children and their connected attendance, fees/payments, results and announcements.",
  "Cashier works with fee records, payments, balances, cash/teller records and optional manual bank transfers.",
  "Sections are kept separate from classes. Standard sections include Nursery, Primary, Junior Secondary and Senior Secondary.",
  "Starter classes are Nursery 1-3, Primary 1-6, JSS 1-3 and SS 1-3.",
  "Subjects are school/class-specific and editable; SkulGo is not a curriculum engine.",
  "Assign connects approved teachers to classes, subjects and class-master duties.",
  "Attendance is recorded by the assigned class teacher during the school's configured attendance window.",
  "Attendance supports offline entry and automatic synchronization when internet returns.",
  "Assessment supports CA and Exam score entry. Results are generated from saved assessments and published by Admin.",
  "Students and parents see published results according to their authorized access.",
  "Fees follow Fee name -> amount -> scope -> student record -> payment -> balance.",
  "Online payment is optional; schools can continue with cash/teller/manual bank-transfer records.",
  "Announcements and support are lightweight communication, not a full chat/social network.",
  "Important school changes have audit history.",
  "SkulGo uses one common engine with school-specific configuration for sections, classes, subjects, fees, grading and result presentation.",
  "School subscription is a paid service; pilot usefulness comes first. Exact pricing can change and should not be invented by the support bot.",
  "Result Unlock is a SkulGo-controlled mechanism. The school can configure its own result-view/unlock amount; the default documented amount is ₦200 per result.",
  "Teacher Resources currently provide reusable teacher formats/resources and are available through the teacher's school assignment context.",
  "SkulGo is intentionally offline-first for real Nigerian school conditions with poor or expensive connectivity.",
  "Do not promise features that are not documented. If the bot cannot establish an answer from current SkulGo knowledge, tell the user to send the exact issue to the SkulGo team rather than inventing an answer.",
] as const;

function includesAny(text: string, words: string[]) {
  return words.some(word => text.includes(word));
}

export type SupportConversationMessage = {
  senderType: "USER" | "BOT";
  body: string;
};

function lastUserMessage(history: SupportConversationMessage[]) {
  return [...history].reverse().find(item => item.senderType === "USER")?.body ?? "";
}

function referencedParty(text: string) {
  const lower = text.toLowerCase();
  if (/\bteacher\b|\bclass teacher\b|\bsubject teacher\b/.test(lower)) return "teacher";
  if (/\bstudent\b|\bpupil\b/.test(lower)) return "student";
  if (/\bparent\b|\bguardian\b/.test(lower)) return "parent";
  if (/\bcashier\b|\bbursar\b/.test(lower)) return "cashier";
  if (/\badmin\b|\bprincipal\b|\bproprietor\b|\bproprietress\b/.test(lower)) return "Admin";
  return null;
}

function naturalPrefix(history: SupportConversationMessage[], current: string) {
  const previous = lastUserMessage(history);
  const party = referencedParty(current) ?? referencedParty(previous);
  if (!previous) return "";
  if (party) return `You are asking about the ${party}. `;
  return "Continuing from your last message: ";
}

export function answerSkulGoSupport(context: SupportReplyContext & {
  history?: SupportConversationMessage[];
  verification?: SupportVerification | null;
}): string {
  const history = context.history ?? [];
  const previous = lastUserMessage(history);
  const text = [context.subject ?? "", previous, context.message].join(" ").trim();
  const lower = text.toLowerCase();
  const party = referencedParty(text);
  const prefix = naturalPrefix(history, context.message);

  if (/^(yes|yeah|yep|ok|okay|correct|exactly|no|not really|that is it|that's it)\\b/i.test(context.message.trim()) && previous) {
    if (party === "teacher") return "Yes — I’m following you. You’re talking about the teacher’s situation. Tell me what the teacher did or could not do, and I’ll keep that context.";
    if (party === "student") return "Yes — I’m following the student you mean. Tell me what happened next and I’ll keep the same context.";
    if (party === "parent") return "Yes — I’m following the parent/guardian situation. Continue from there.";
    return "Yes — I’m following the conversation. Continue from where you stopped.";
  }

  if (includesAny(lower, ["hello", "hi", "good morning", "good afternoon", "good evening"])) {
    return "Hello 👋 I’m the SkulGo Support Bot. We can talk normally here. You can ask about your school, your teacher, a student, parent, cashier or Admin, and I’ll keep the conversation context as we go.";
  }

  if (includesAny(lower, ["attendance", "absent", "present", "mark attendance"])) {
    const detail = party ? ` If you mean the ${party}, tell me what they were trying to do and I’ll follow that situation.` : "";
    return prefix + "For attendance, the assigned class teacher records the class during the school's configured attendance window. Drafts save automatically, and supported attendance entry can work offline and synchronize when internet returns." + detail;
  }

  if (includesAny(lower, ["overall", "total", "average"]) && includesAny(lower, ["student", "result", "performance", "come out", "score"])) {
    return prefix + "Yes. SkulGo can show a student's overall result from the subject results that exist for that term. Total is the sum of the subject totals; maximum is the number of result subjects × 100; average is total divided by the number of result subjects; and the overall grade follows the school's grading bands. Results must first be generated from the student's saved assessments and then published by Admin.";
  }

  if (includesAny(lower, ["score", "scores", "ca", "exam", "assessment"])) {
    return prefix + "Scores are entered by the teacher through the teacher's assigned class/subject work. SkulGo supports CA and Exam records, and results are generated from those saved assessments." + (party ? ` If you're talking about the ${party}, tell me what they are seeing or trying to do.` : "");
  }

  if (includesAny(lower, ["result", "report card", "publish"])) {
    return prefix + "SkulGo generates results from saved assessment records and Admin publishes them. Students and parents see published results according to their authorized school connection. The school can configure grading and report-card presentation.";
  }

  if (includesAny(lower, ["fee", "fees", "payment", "balance", "cashier"])) {
    return prefix + "SkulGo keeps fees and payments connected: fee definition, student fee record, payment and balance. Cash/teller and optional manual bank-transfer records are supported, while online payment is optional.";
  }

  if (includesAny(lower, ["teacher", "assignment", "assign"])) {
    return prefix + "Teachers only see work assigned to them. Admin connects teachers to classes, subjects and class-master duties. So if a teacher cannot see a class or subject, we first check the active school assignment rather than assuming a new feature is needed.";
  }

  if (includesAny(lower, ["parent", "child"])) {
    return prefix + "A parent sees only approved child connections and the child's connected school records. The school must approve the parent/child relationship before those records become available.";
  }

  if (includesAny(lower, ["student", "admission id", "admission"])) {
    return prefix + "After Admin approves a student admission, SkulGo creates the student's Admission ID and connects the student to the selected class. The student then sees only the school records allowed by that connection.";
  }

  if (includesAny(lower, ["offline", "internet", "sync", "connection"])) {
    return prefix + "SkulGo is designed for poor or expensive connectivity. Supported offline writes queue locally and synchronize when internet returns.";
  }

  if (includesAny(lower, ["class", "section", "subject"])) {
    return prefix + "SkulGo keeps school structure simple: Sections → Classes → Subjects. Sections are separate from classes, and subjects are selected for the classes the school actually offers.";
  }

  if (includesAny(lower, ["account", "role", "membership", "access", "login"])) {
    return prefix + "A personal SkulGo account is the person's identity. A school membership gives that person a role and authorized access to that school's records. One person can connect to more than one school.";
  }

  if (includesAny(lower, ["result unlock", "unlock", "200"])) {
    return prefix + "Result Unlock is controlled by SkulGo. The documented default is ₦200 per result, while a school can configure its own result-view/unlock amount.";
  }

  if (includesAny(lower, ["teacher resource", "lesson plan", "lesson note", "teaching aid"])) {
    return prefix + "Teacher Resources provide practical, reusable teacher materials through the teacher's school assignment context. The current direction is to keep them useful and lightweight.";
  }

  if (includesAny(lower, ["what is skulgo", "how does skulgo work", "about skulgo"])) {
    return "SkulGo is a lightweight connected school record book for Nigerian schools. It connects People → Classes → Subjects → Attendance → Scores → Results → Fees. Each person works through a personal account and an authorized school duty. The simple principle is: enter the record once and let the right information reach the right person.";
  }

  if (includesAny(lower, ["bug", "error", "not working", "doesn't work", "cannot", "can't", "wrong", "missing", "problem"])) {
    const schoolLine = context.verification?.checks?.[0] ? " I’ve also checked the current school context." : "";
    return prefix + "I understand this as a problem with the current SkulGo workflow." + schoolLine + " Tell me what the " + (party ?? "person") + " was trying to do, what you expected to happen, and what actually happened. We can work through it step by step.";
  }

  if (context.verification?.checks?.length) {
    return prefix + "I’m following the situation. " + context.verification.checks.join(" ") + " Tell me what happened next and we’ll continue from there.";
  }

  return prefix + "I’m following you. SkulGo's core flow is People → Classes → Subjects → Attendance → Scores → Results → Fees. Tell me what happened next, even if you are talking about another person in the school, and I’ll keep that context.";
}

export type SupportVerification = {
  schoolName: string;
  role: string;
  checks: string[];
};

export async function verifySupportContext(
  db: {
    school: {
      findUnique: (args: any) => Promise<any>;
    };
    schoolClass: { count: (args: any) => Promise<number> };
    classTeacher: { count: (args: any) => Promise<number> };
    teacherAssignment: { count: (args: any) => Promise<number> };
    assessment: { count: (args: any) => Promise<number> };
    result: { count: (args: any) => Promise<number> };
    feeDefinition: { count: (args: any) => Promise<number> };
    feeRecord: { count: (args: any) => Promise<number> };
  },
  schoolId: string,
  role: string,
  message: string,
): Promise<SupportVerification | null> {
  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: { name: true, abbr: true },
  });
  if (!school) return null;

  const lower = message.toLowerCase();
  const checks: string[] = [
    `Authenticated school: ${school.name} (${school.abbr})`,
    `Current school role: ${role}`,
  ];

  if (includesAny(lower, ["attendance", "absent", "present", "mark attendance"])) {
    const [classes, classTeachers] = await Promise.all([
      db.schoolClass.count({ where: { schoolId } }),
      db.classTeacher.count({ where: { schoolId } }),
    ]);
    checks.push(`Attendance structure verified: ${classes} class(es), ${classTeachers} class-teacher assignment(s).`);
  } else if (includesAny(lower, ["score", "scores", "ca", "exam", "assessment"])) {
    const [assignments, assessments] = await Promise.all([
      db.teacherAssignment.count({ where: { schoolId } }),
      db.assessment.count({ where: { schoolId } }),
    ]);
    checks.push(`Assessment workflow verified: ${assignments} teacher assignment(s), ${assessments} saved assessment record(s).`);
  } else if (includesAny(lower, ["result", "report card", "publish"])) {
    const results = await db.result.count({ where: { schoolId } });
    checks.push(`Result workflow verified: ${results} result record(s) exist in this school.`);
  } else if (includesAny(lower, ["fee", "fees", "payment", "balance", "cashier"])) {
    const [definitions, records] = await Promise.all([
      db.feeDefinition.count({ where: { schoolId } }),
      db.feeRecord.count({ where: { schoolId } }),
    ]);
    checks.push(`Fee workflow verified: ${definitions} fee definition(s), ${records} student fee record(s).`);
  } else {
    const [classes, assignments] = await Promise.all([
      db.schoolClass.count({ where: { schoolId } }),
      db.teacherAssignment.count({ where: { schoolId } }),
    ]);
    checks.push(`Current school structure verified: ${classes} class(es), ${assignments} teacher assignment(s).`);
  }

  return { schoolName: school.name, role, checks };
}

export function supportKnowledgeSummary() {
  return SKULGO_KNOWLEDGE_TEXT + "\n" + KNOWLEDGE.join(" ");
}
