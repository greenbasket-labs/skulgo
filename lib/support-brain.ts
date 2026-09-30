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

export function answerSkulGoSupport(context: SupportReplyContext): string {
  const text = [context.subject ?? "", context.message].join(" ").trim();
  const lower = text.toLowerCase();
  const verified = verification ? `\n\nVerified before answering: ${verification.checks.join(" ")}` : "";

  if (includesAny(lower, ["hello", "hi", "good morning", "good afternoon", "good evening"])) {
    return "Hello 👋 I’m the SkulGo Support Bot. I can help explain how the current SkulGo school workflows work, including people, classes, subjects, attendance, scores, results, fees, roles, offline work and school settings. Tell me what you are trying to do or what went wrong.";
  }

  if (includesAny(lower, ["attendance", "absent", "present", "mark attendance"])) {
    return "For attendance, the class teacher records the assigned class during the school's configured attendance window. Drafts save automatically, and attendance can be entered offline and synchronized when internet returns. If you are seeing a specific problem, tell me the class, what you expected, and what actually happened.";
  }

  if (includesAny(lower, ["score", "scores", "ca", "exam", "assessment"])) {
    return "Scores are entered by the teacher through the teacher's assigned class/subject work. SkulGo supports CA and Exam records, and results are generated from those saved assessments. If a score is missing, wrong or cannot be saved, tell me the class, subject and exact behavior.";
  }

  if (includesAny(lower, ["result", "report card", "publish"])) {
    return "SkulGo generates results from saved assessment records and Admin publishes them. Students and parents see published results according to their authorized school connection. School result presentation and grading settings can be configured by the school.";
  }

  if (includesAny(lower, ["fee", "fees", "payment", "balance", "cashier"])) {
    return "SkulGo keeps fees and payments connected: fee definition, student fee record, payment and balance. Cash/teller and optional manual bank-transfer records are supported, while online payment is optional. Tell me the student's Admission ID and the exact fee/payment problem if you need help troubleshooting.";
  }

  if (includesAny(lower, ["teacher", "assignment", "assign"])) {
    return "Teachers only see work assigned to them. Admin connects teachers to classes, subjects and class-master duties. If a teacher cannot see a class or subject, the first thing to check is whether the correct school assignment is active.";
  }

  if (includesAny(lower, ["parent", "child"])) {
    return "A parent sees only approved child connections and the child's connected school records. The school must approve the parent/child relationship before those records become available.";
  }

  if (includesAny(lower, ["student", "admission id", "admission"])) {
    return "Student admission is a school connection workflow. After Admin approval, SkulGo creates the student's Admission ID and connects the student to the selected class. Students then see their own authorized school records.";
  }

  if (includesAny(lower, ["offline", "internet", "sync", "connection"])) {
    return "SkulGo is designed for poor or expensive connectivity. The app caches relevant records locally and queues supported writes such as attendance and score entry when offline, then synchronizes when internet returns.";
  }

  if (includesAny(lower, ["class", "section", "subject"])) {
    return "SkulGo keeps school structure simple: Sections -> Classes -> Subjects. Sections are saved separately, classes are configured under those sections, and subjects are selected for the classes the school actually offers.";
  }

  if (includesAny(lower, ["account", "role", "membership", "access", "login"])) {
    return "A personal SkulGo account is the person's identity. A school membership gives that person a role and authorized access to that school's records. The same personal account can connect to more than one school.";
  }

  if (includesAny(lower, ["result unlock", "unlock", "200"])) {
    return "Result Unlock is a SkulGo-controlled access mechanism. The documented default is ₦200 per result, while the school can configure its own result-view/unlock amount. The support bot should not invent a different price.";
  }

  if (includesAny(lower, ["teacher resource", "lesson plan", "lesson note", "teaching aid"])) {
    return "Teacher Resources are intended to provide practical, reusable teacher materials through the teacher's school assignment context. The current direction is to keep them useful and lightweight rather than build a separate content platform.";
  }

  if (includesAny(lower, ["what is skulgo", "how does skulgo work", "about skulgo"])) {
    return "SkulGo is a lightweight connected school record book for Nigerian schools. It connects People -> Classes -> Subjects -> Attendance -> Scores -> Results -> Fees, while each person works through their own account and authorized school duty. The goal is simple: enter the record once and let the right information reach the right person.";
  }

  if (includesAny(lower, ["bug", "error", "not working", "doesn't work", "cannot", "can't", "wrong", "missing", "problem"])) {
    return "I can help narrow this down. Please send: 1) your role, 2) the school/workspace, 3) what you were trying to do, 4) what you expected, and 5) what actually happened or the exact error message. I will use the current SkulGo workflow rather than inventing a new one.";
  }

  return "I’m here to help with the current SkulGo product and school workflows. " +
    "SkulGo's core flow is People -> Classes -> Subjects -> Attendance -> Scores -> Results -> Fees. " +
    "Tell me the exact task or problem you are facing, and I’ll explain the relevant current workflow. " +
    "If the issue is not covered by the current product knowledge, I’ll tell you instead of guessing.";
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
  return KNOWLEDGE.join(" ");
}
