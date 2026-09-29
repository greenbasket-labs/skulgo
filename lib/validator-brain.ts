export type ValidatorSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ValidatorDisposition =
  | "PAIN_KILLER"
  | "INTENDED"
  | "PLANNED"
  | "NOT_ENOUGH_EVIDENCE";

export const SKULGO_VALIDATOR_KNOWLEDGE = {
  identity: "SkulGo is a lightweight connected school record book for Nigerian schools.",
  motto: "Transparent & Secure Records",
  model: "Personal account → School connection → Duty → School work",
  coreFlow: "People → Classes → Subjects → Attendance → Scores → Results → Fees",
  principle: "Enter the record once. Let the right information reach the right person.",
  painKillers: [
    "save a school time",
    "protect a school record",
    "reduce a school mistake",
    "make an existing record useful to the right person",
  ],
  currentMvp: [
    "student admission and approval",
    "parent-child approval",
    "teacher approval and assignment",
    "cashier approval",
    "attendance",
    "CA and Exam score entry",
    "offline attendance and score entry with sync",
    "result generation and publishing",
    "fees and payments",
    "announcements and support",
    "audit history",
  ],
  boundaries: [
    "payroll",
    "inventory",
    "hostel",
    "transport",
    "library",
    "biometrics",
    "complex accounting",
    "CRM",
    "school website builder",
    "marketplace",
    "AI tutor or AI grading",
    "advanced analytics",
  ],
} as const;

const INTENDED_PATTERNS = [
  /offline/i,
  /sync/i,
  /attendance/i,
  /score/i,
  /result/i,
  /fee/i,
  /payment/i,
  /admission/i,
  /parent/i,
  /teacher/i,
  /cashier/i,
  /assign/i,
  /class/i,
  /subject/i,
  /audit/i,
  /announcement/i,
];

const PLANNED_PATTERNS = [
  /result (unlock|access|payment)/i,
  /subscription/i,
  /personal profile/i,
  /school history/i,
];

const CRITICAL_PATTERNS = [
  /data (loss|lost|deleted|disappeared|corrupt)/i,
  /wrong (result|score|fee|payment)/i,
  /unauthori[sz]ed/i,
  /privacy/i,
  /security/i,
  /cannot (record|save|submit|publish)/i,
  /everyone.*(cannot|blocked)/i,
];

const HIGH_PATTERNS = [
  /blocked/i,
  /stuck/i,
  /doesn't work/i,
  /not working/i,
  /keeps failing/i,
  /duplicate/i,
  /mistake/i,
  /manual/i,
  /takes (too long|hours)/i,
  /missing/i,
];

const PAIN_PATTERNS = [
  /every day/i,
  /every time/i,
  /often/i,
  /always/i,
  /takes/i,
  /waste/i,
  /delay/i,
  /mistake/i,
  /error/i,
  /duplicate/i,
  /manual/i,
  /lost/i,
  /difficult/i,
  /hard/i,
  /confus/i,
  /cannot/i,
  /can't/i,
  /don't have/i,
  /need to/i,
];

const FUTURE_WORDS = [
  /would be nice/i,
  /it would be good/i,
  /maybe/i,
  /could you add/i,
  /should add/i,
  /feature request/i,
  /idea/i,
  /wish/i,
];

function matches(patterns: RegExp[], text: string) {
  return patterns.some((pattern) => pattern.test(text));
}

export function classifyValidatorFinding(input: {
  problem: string;
  impact?: string;
  requestedSolution?: string;
}) {
  const combined = [input.problem, input.impact, input.requestedSolution]
    .filter(Boolean)
    .join("\n");

  let severity: ValidatorSeverity = "LOW";

  if (matches(CRITICAL_PATTERNS, combined)) severity = "CRITICAL";
  else if (matches(HIGH_PATTERNS, combined)) severity = "HIGH";
  else if (matches(PAIN_PATTERNS, combined)) severity = "MEDIUM";

  let disposition: ValidatorDisposition = "NOT_ENOUGH_EVIDENCE";

  if (matches(PLANNED_PATTERNS, combined)) disposition = "PLANNED";
  else if (matches(INTENDED_PATTERNS, combined)) disposition = "INTENDED";

  const hasObservedPain = matches(PAIN_PATTERNS, combined);
  const isFutureIdea = matches(FUTURE_WORDS, combined);
  const fitsPainKiller = [
    /save|time|faster|delay/i.test(combined),
    /protect|record|history|secure|lost/i.test(combined),
    /mistake|error|wrong|duplicate/i.test(combined),
    /see|use|share|reach|access/i.test(combined),
  ].some(Boolean);

  if (hasObservedPain && fitsPainKiller && !isFutureIdea && disposition === "NOT_ENOUGH_EVIDENCE") {
    disposition = "PAIN_KILLER";
  }

  const rationale =
    disposition === "PAIN_KILLER"
      ? "Observed school pain appears connected to SkulGo's core record flow and at least one pain-killer test."
      : disposition === "INTENDED"
        ? "This is already within SkulGo's stated/current product direction; validate the existing behavior before adding a new feature."
        : disposition === "PLANNED"
          ? "This matches a documented future/planned area; record the real problem first rather than building from the idea alone."
          : "The report does not yet prove a recurring real-world problem. Ask for a concrete example, affected role, frequency and current workaround.";

  return { severity, disposition, rationale };
}

export function answerValidatorGroupMessage(message: string) {
  const text = message.trim();
  const lower = text.toLowerCase();
  if (!text) return null;

  if (/how.*(attendance|mark attendance|record attendance)|attendance.*how/i.test(lower))
    return "SkulGo attendance follows the class-teacher workflow. The teacher records attendance for the assigned class during the configured attendance window. If you are testing it, check whether the real school duty is completed without duplicate entry or record risk.";

  if (/how.*(result|score)|result.*(work|generate|publish)|score.*(enter|record)/i.test(lower))
    return "SkulGo connects assessment records to results. Teachers enter CA/Exam scores for their assigned work, results are generated from those records, and published results are then available to the roles allowed to see them. If you are validating a problem, describe what happens in the real school before suggesting a new feature.";

  if (/how.*(fee|payment)|fee.*(work|record)|payment.*(record|work)/i.test(lower))
    return "SkulGo keeps fees and payments as connected school records: fee definition, student fee record, payment and balance. Test the real school duty and record rather than assuming a larger accounting system is needed.";

  if (/what.*(skulgo|validation)|what is skulgo|how does skulgo/i.test(lower))
    return "SkulGo is a lightweight connected school record book for Nigerian schools. Its core flow is People → Classes → Subjects → Attendance → Scores → Results → Fees. Validation is about finding real school problems and testing evidence, not collecting feature ideas.";

  if (/feature|add|build|can skulgo/i.test(lower))
    return "Before proposing a new feature, describe the real school problem: who is affected, how often it happens, what the current workaround is, and what goes wrong. Then we can check whether an existing SkulGo record or workflow can solve it first.";

  if (/problem|pain|bug|error|not working|doesn't work|mistake|manual|difficult|hard|delay|duplicate/i.test(lower))
    return "That may be useful validation evidence. Give a concrete example, who is affected, how often it happens, and what the school currently does instead. If you are an approved Validator, use /pain to record it formally.";

  return null;
}

export function validatorBrainIntro() {
  return [
    "You are helping validate SkulGo, a lightweight connected school record book for Nigerian schools.",
    "Do not treat every suggestion as a feature request.",
    "Look for a real school pain first.",
    "A useful implementation should save time, protect a record, reduce a mistake, or make an existing record useful to the right person.",
    "Classify urgency as CRITICAL, HIGH, MEDIUM or LOW.",
    "Classify direction as PAIN_KILLER, INTENDED, PLANNED or NOT_ENOUGH_EVIDENCE.",
    "Never invent a SkulGo feature. If unsure, ask for evidence.",
  ].join(" ");
}
