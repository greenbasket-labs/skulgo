import { SKULGO_KNOWLEDGE, SKULGO_KNOWLEDGE_TEXT } from "@/lib/skulgo-brain";
import type { PrismaClient } from "@prisma/client";

export type SupportReplyContext = {
  subject?: string;
  message: string;
};

function includesAny(text: string, words: string[]) {
  return words.some(word => text.includes(word));
}

function roleAnswer(lower: string) {
  if (includesAny(lower, ["admin", "principal", "proprietor", "proprietress"])) return SKULGO_KNOWLEDGE.roles.ADMIN;
  if (includesAny(lower, ["teacher", "teacher role"])) return SKULGO_KNOWLEDGE.roles.TEACHER;
  if (includesAny(lower, ["student", "student role"])) return SKULGO_KNOWLEDGE.roles.STUDENT;
  if (includesAny(lower, ["parent", "parent role"])) return SKULGO_KNOWLEDGE.roles.PARENT;
  if (includesAny(lower, ["cashier", "cashier role"])) return SKULGO_KNOWLEDGE.roles.CASHIER;
  return null;
}

export async function verifySupportContext(
  database: PrismaClient,
  schoolId: string,
  role: string,
  message: string,
): Promise<boolean> {
  if (!schoolId || !message.trim() || role !== "ADMIN") return false;

  const membership = await database.schoolMembership.findFirst({
    where: { schoolId, role: "ADMIN", active: true },
    select: { id: true },
  });

  return Boolean(membership);
}

export function answerSkulGoSupport(context: SupportReplyContext): string {
  const text = [context.subject ?? "", context.message].join(" ").trim();
  const lower = text.toLowerCase();

  if (!text) return "Please tell me what you are trying to do or what went wrong.";

  if (includesAny(lower, ["hello", "hi", "good morning", "good afternoon", "good evening"])) {
    return "Hello 👋 I’m the SkulGo Support Bot. I know the current SkulGo product, its school workflows, roles, records, offline behavior and documented boundaries. Tell me what you are trying to do or what went wrong.";
  }

  const role = roleAnswer(lower);
  if (role && includesAny(lower, ["what", "see", "do", "can", "role", "access"])) return role;

  if (includesAny(lower, ["what is skulgo", "how does skulgo work", "about skulgo"])) {
    return [
      SKULGO_KNOWLEDGE.identity,
      "It is a product of Green Basket Global Limited.",
      "Motto: " + SKULGO_KNOWLEDGE.motto + ".",
      "Model: " + SKULGO_KNOWLEDGE.model + ".",
      "Core flow: " + SKULGO_KNOWLEDGE.coreFlow + ".",
      SKULGO_KNOWLEDGE.principle,
      "It is intentionally lightweight rather than a full ERP, CRM or social platform.",
    ].join(" ");
  }

  if (includesAny(lower, ["attendance", "absent", "present", "mark attendance"])) {
    return SKULGO_KNOWLEDGE.records.attendance + " Drafts can save automatically, and supported attendance writes can continue offline and synchronize later. If you have a specific issue, tell me your role, class, what you expected and what actually happened.";
  }

  if (includesAny(lower, ["score", "scores", "ca", "exam", "assessment"])) {
    return SKULGO_KNOWLEDGE.records.assessment + " The documented scoring model is CA 0–30 and Exam 0–70. If a score is missing, wrong or cannot be saved, send the class, subject and exact behavior.";
  }

  if (includesAny(lower, ["result", "report card", "publish", "grade", "grading"])) {
    if (includesAny(lower, ["unlock", "pay", "payment", "locked"])) {
      return SKULGO_KNOWLEDGE.resultsAndReports.unlockStatus + " " + SKULGO_KNOWLEDGE.resultsAndReports.commercialBoundary + " If you are asking about a specific result that is not accessible, tell me the role and exact screen message.";
    }
    return SKULGO_KNOWLEDGE.records.results + " " + SKULGO_KNOWLEDGE.resultsAndReports.grading + " " + SKULGO_KNOWLEDGE.resultsAndReports.reportCard;
  }

  if (includesAny(lower, ["fee", "fees", "payment", "balance", "cashier", "teller"])) {
    return SKULGO_KNOWLEDGE.records.fees + " " + SKULGO_KNOWLEDGE.records.paymentMethods + " If you have a payment problem, tell me the role, student Admission ID and exact behavior.";
  }

  if (includesAny(lower, ["teacher assignment", "assignment", "assign teacher", "assign subject", "class teacher", "class master"])) {
    return SKULGO_KNOWLEDGE.structure.assign + " Teachers only see work assigned to them. If a teacher cannot see a class or subject, check that the correct school assignment is active.";
  }

  if (includesAny(lower, ["section", "class", "subject"])) return SKULGO_KNOWLEDGE.structure.sections + " " + SKULGO_KNOWLEDGE.structure.classes + " " + SKULGO_KNOWLEDGE.structure.subjects;

  if (includesAny(lower, ["admission", "admission id", "job application", "apply to school", "parent child"])) {
    return SKULGO_KNOWLEDGE.peopleAndAccess.approval + " " + SKULGO_KNOWLEDGE.peopleAndAccess.ids + " " + SKULGO_KNOWLEDGE.peopleAndAccess.schoolConnection;
  }

  if (includesAny(lower, ["account", "school connection", "membership", "access", "login", "multiple school"])) {
    return SKULGO_KNOWLEDGE.peopleAndAccess.account + " " + SKULGO_KNOWLEDGE.peopleAndAccess.membership + " " + SKULGO_KNOWLEDGE.peopleAndAccess.multipleSchools + " " + SKULGO_KNOWLEDGE.peopleAndAccess.history;
  }

  if (includesAny(lower, ["offline", "internet", "sync", "connection"])) {
    return SKULGO_KNOWLEDGE.offline.principle + " " + SKULGO_KNOWLEDGE.offline.supported + " " + SKULGO_KNOWLEDGE.offline.sync + " " + SKULGO_KNOWLEDGE.offline.limitation;
  }

  if (includesAny(lower, ["teacher resource", "lesson plan", "lesson note", "teaching aid", "activity pack", "assessment builder"])) {
    return SKULGO_KNOWLEDGE.teacherResources.purpose + " " + SKULGO_KNOWLEDGE.teacherResources.currentFormats + " " + SKULGO_KNOWLEDGE.teacherResources.principle;
  }

  if (includesAny(lower, ["referral", "introduced me", "account id", "referral id"])) {
    return SKULGO_KNOWLEDGE.referrals.accountId + " " + SKULGO_KNOWLEDGE.referrals.defaultRegistration + " " + SKULGO_KNOWLEDGE.referrals.levels;
  }

  if (includesAny(lower, ["validator", "validation", "community", "validator bot"])) {
    return SKULGO_KNOWLEDGE.validatorCommunity.purpose + " " + SKULGO_KNOWLEDGE.validatorCommunity.distinction + " " + SKULGO_KNOWLEDGE.validatorCommunity.findingRule;
  }

  if (includesAny(lower, ["subscription", "trial", "plan", "price", "cost", "afford"])) {
    return SKULGO_KNOWLEDGE.commercial.schoolService + " " + SKULGO_KNOWLEDGE.commercial.trial + " " + SKULGO_KNOWLEDGE.commercial.affordability + " I will not invent a current price or commercial promise.";
  }

  if (includesAny(lower, ["bug", "error", "not working", "doesn't work", "cannot", "can't", "wrong", "missing", "problem", "issue"])) {
    return "I can help narrow this down. Please send: 1) your role, 2) the school/workspace, 3) what you were trying to do, 4) what you expected, and 5) what actually happened or the exact error message. I will check it against the current SkulGo workflow rather than inventing a new one.";
  }

  if (includesAny(lower, ["feature", "add", "build", "request", "suggestion"])) {
    return SKULGO_KNOWLEDGE.validationRule + " Before asking for a new feature, tell me the real school problem, who is affected, how often it happens and the current workaround.";
  }

  return "I’m the SkulGo Support Bot and I use the current SkulGo project knowledge. The core flow is " + SKULGO_KNOWLEDGE.coreFlow + ". Tell me the exact task or problem and I’ll explain the documented current workflow. If the project evidence does not establish an answer, I will say so instead of guessing.";
}

export function supportKnowledgeSummary() {
  return SKULGO_KNOWLEDGE_TEXT;
}
