import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getValidationSchoolId, isValidatorRole } from "@/lib/validators";
import { classifyValidatorFinding, validatorBrainIntro, answerValidatorGroupMessage } from "@/lib/validator-brain";

const TOKEN = process.env.TELEGRAM_VALIDATOR_BOT_TOKEN;
const SECRET = process.env.TELEGRAM_VALIDATOR_WEBHOOK_SECRET;

async function telegram(method: string, body: Record<string, unknown>) {
  if (!TOKEN) throw new Error("TELEGRAM_VALIDATOR_BOT_TOKEN is not configured");
  const response = await fetch("https://api.telegram.org/bot" + TOKEN + "/" + method, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Telegram API error: " + response.status);
  return response.json();
}

async function send(chatId: string, text: string, replyMarkup?: Record<string, unknown>) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export async function POST(request: Request) {
  if (SECRET && request.headers.get("x-telegram-bot-api-secret-token") !== SECRET) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  const update = await request.json().catch(() => null);
  const callback = update?.callback_query;
  const message = update?.message;
  const chatId = (callback?.message?.chat?.id ?? message?.chat?.id)?.toString();
  const text = typeof message?.text === "string" ? message.text.trim() : "";

  if (!chatId) return NextResponse.json({ ok: true });

  let session = await db.validatorBotSession.findUnique({ where: { telegramChatId: chatId } });
  if (!session) {
    session = await db.validatorBotSession.create({
      data: { telegramChatId: chatId, state: "IDLE" },
    });
  }


  const chatType = message?.chat?.type;
  const isGroup = chatType === "group" || chatType === "supergroup";

  if (isGroup && text.startsWith("/")) {
    if (text === "/apply" || text === "/start" || text === "/pain" || text === "/help") {
      await send(chatId, "Please open a private chat with the SkulGo Validator Bot to use " + text + ".");
    }
    return NextResponse.json({ ok: true });
  }

  if (isGroup && !callback) {
    const addressedToBot =
      /@skulgovalidatorbot\b/i.test(text) ||
      /^(how|what|why|can|does|is|where|help|problem|pain|bug)\b/i.test(text);

    if (addressedToBot) {
      const groupAnswer = answerValidatorGroupMessage(
        text.replace(/@skulgovalidatorbot\b/ig, "").trim()
      );
      if (groupAnswer) await send(chatId, "🤖 " + groupAnswer);
    }

    return NextResponse.json({ ok: true });
  }

  if (callback?.data?.startsWith("role:")) {
    const requestedRole = callback.data.slice(5).toUpperCase();
    if (!isValidatorRole(requestedRole)) return NextResponse.json({ ok: true });

    const data = session.data ? JSON.parse(session.data) : null;
    if (!data?.userId) {
      await send(chatId, "Please restart your application with /apply.");
      return NextResponse.json({ ok: true });
    }

    await db.validatorBotSession.update({
      where: { id: session.id },
      data: {
        state: "EXPERIENCE",
        data: JSON.stringify({ ...data, requestedRole }),
      },
    });

    await telegram("answerCallbackQuery", {
      callback_query_id: callback.id,
      text: "Role selected",
    });

    await send(
      chatId,
      "Role selected: " + requestedRole + "\n\nTell us about your real school experience or relationship."
    );
    return NextResponse.json({ ok: true });
  }

  if (text === "/start" || text === "/apply") {
    await db.validatorBotSession.update({
      where: { id: session.id },
      data: { state: "ACCOUNT_ID", data: null },
    });
    await send(
      chatId,
      "🧪 Welcome to SkulGo Validators.\n\nYou do not need to own a school. You apply for a real-world validation role, and if approved, you test that role inside the SkulGo Validation School.\n\nFirst, enter your SkulGo Account ID."
    );
    return NextResponse.json({ ok: true });
  }

  if (text === "/pain") {
    const profile = await db.validatorProfile.findUnique({
      where: { telegramChatId: chatId },
      select: { id: true, validatorId: true },
    });

    if (!profile) {
      await send(chatId, "You must be an approved SkulGo Validator before submitting a validation finding.");
      return NextResponse.json({ ok: true });
    }

    await db.validatorBotSession.update({
      where: { id: session.id },
      data: {
        state: "PAIN_PROBLEM",
        data: JSON.stringify({ validatorProfileId: profile.id, validatorId: profile.validatorId }),
      },
    });

    await send(
      chatId,
      "🔎 Validation finding\n\n" +
        "Do not start with a feature idea. Tell me the real school problem you observed.\n\n" +
        "Example: “The class teacher records attendance on paper first, then enters it again later, so names are sometimes missed.”"
    );
    return NextResponse.json({ ok: true });
  }

  if (text === "/help") {
    await send(
      chatId,
      validatorBrainIntro() + "\n\n/apply — start an application\n/pain — report a real validation finding\n/help — show this guidance\n\nYour SkulGo Account ID identifies your SkulGo account. Your validator role should match your real-world school experience."
    );
    return NextResponse.json({ ok: true });
  }

  if (session.state === "PAIN_PROBLEM") {
    const data = session.data ? JSON.parse(session.data) : null;
    if (!data?.validatorProfileId) {
      await send(chatId, "Please restart a validation finding with /pain.");
      return NextResponse.json({ ok: true });
    }
    if (!text) {
      await send(chatId, "Please describe the real school problem you observed.");
      return NextResponse.json({ ok: true });
    }

    await db.validatorBotSession.update({
      where: { id: session.id },
      data: {
        state: "PAIN_IMPACT",
        data: JSON.stringify({ ...data, problem: text }),
      },
    });

    await send(
      chatId,
      "Who is affected, and what happens because of the problem? Include frequency if you know it."
    );
    return NextResponse.json({ ok: true });
  }

  if (session.state === "PAIN_IMPACT") {
    const data = session.data ? JSON.parse(session.data) : null;
    if (!data?.validatorProfileId || !data?.problem) {
      await send(chatId, "Please restart a validation finding with /pain.");
      return NextResponse.json({ ok: true });
    }
    if (!text) {
      await send(chatId, "Please describe the impact, who is affected, and how often it happens.");
      return NextResponse.json({ ok: true });
    }

    await db.validatorBotSession.update({
      where: { id: session.id },
      data: {
        state: "PAIN_SOLUTION",
        data: JSON.stringify({ ...data, impact: text }),
      },
    });

    await send(
      chatId,
      "What do you think SkulGo should do? This is only your observation/request; do not worry about deciding whether it will be built."
    );
    return NextResponse.json({ ok: true });
  }

  if (session.state === "PAIN_SOLUTION") {
    const data = session.data ? JSON.parse(session.data) : null;
    if (!data?.validatorProfileId || !data?.problem || !data?.impact) {
      await send(chatId, "Please restart a validation finding with /pain.");
      return NextResponse.json({ ok: true });
    }
    if (!text) {
      await send(chatId, "Please describe what you think SkulGo should do, or type NONE if you do not know.");
      return NextResponse.json({ ok: true });
    }

    const requestedSolution = text.toUpperCase() === "NONE" ? null : text;
    const classification = classifyValidatorFinding({
      problem: data.problem,
      impact: data.impact,
      requestedSolution: requestedSolution || undefined,
    });

    await db.$executeRaw`
      INSERT INTO "ValidatorFinding"
        ("id", "validatorProfileId", "problem", "impact", "requestedSolution", "severity", "disposition", "rationale", "createdAt")
      VALUES
        (${crypto.randomUUID()}, ${data.validatorProfileId}, ${data.problem}, ${data.impact}, ${requestedSolution}, ${classification.severity}, ${classification.disposition}, ${classification.rationale}, CURRENT_TIMESTAMP)
    `;

    await db.validatorBotSession.update({
      where: { id: session.id },
      data: { state: "IDLE", data: null },
    });

    await send(
      chatId,
      "✅ Finding recorded.\n\n" +
        "Urgency: " + classification.severity + "\n" +
        "Direction: " + classification.disposition + "\n\n" +
        classification.rationale +
        "\n\nThis is a validation signal, not an automatic promise to build. Real repeated evidence can strengthen the case."
    );
    return NextResponse.json({ ok: true });
  }

  if (session.state === "ACCOUNT_ID") {
    const accountId = text.toUpperCase();
    const user = await db.user.findUnique({
      where: { referralCode: accountId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      await send(chatId, "❌ SkulGo Account ID not found. Please check it and send it again.");
      return NextResponse.json({ ok: true });
    }

    const existing = await db.validatorProfile.findUnique({ where: { userId: user.id } });
    if (existing) {
      await send(chatId, "You are already a SkulGo Validator.\n\nValidator ID: " + existing.validatorId + "\nRole: " + existing.role);
      return NextResponse.json({ ok: true });
    }

    await db.validatorBotSession.update({
      where: { id: session.id },
      data: {
        state: "ROLE",
        data: JSON.stringify({ userId: user.id, accountId, name: user.name }),
      },
    });

    await send(chatId, "Account found: " + user.name + "\n\nChoose the role you genuinely understand and want to validate.", {
      inline_keyboard: [
        [
          { text: "🏫 Admin", callback_data: "role:ADMIN" },
          { text: "👨‍🏫 Teacher", callback_data: "role:TEACHER" },
        ],
        [
          { text: "👨‍👩‍👧 Parent", callback_data: "role:PARENT" },
          { text: "🎓 Student", callback_data: "role:STUDENT" },
        ],
        [{ text: "💰 Cashier", callback_data: "role:CASHIER" }],
      ],
    });
    return NextResponse.json({ ok: true });
  }

  if (session.state === "EXPERIENCE") {
    const data = session.data ? JSON.parse(session.data) : null;
    if (!data?.userId || !data?.requestedRole) {
      await send(chatId, "Please restart with /apply.");
      return NextResponse.json({ ok: true });
    }

    if (!text) {
      await send(chatId, "Please tell us about your real school experience or relationship.");
      return NextResponse.json({ ok: true });
    }

    await db.validatorBotSession.update({
      where: { id: session.id },
      data: {
        state: "REASON",
        data: JSON.stringify({ ...data, schoolExperience: text }),
      },
    });
    await send(chatId, "Why do you want to help validate SkulGo? Please answer briefly.");
    return NextResponse.json({ ok: true });
  }

  if (session.state === "REASON") {
    const data = session.data ? JSON.parse(session.data) : null;
    if (!data?.userId || !data?.requestedRole) {
      await send(chatId, "Please restart with /apply.");
      return NextResponse.json({ ok: true });
    }

    if (!text) {
      await send(chatId, "Please tell us why you want to help validate SkulGo.");
      return NextResponse.json({ ok: true });
    }

    await db.validatorBotSession.update({
      where: { id: session.id },
      data: {
        state: "INTRODUCER",
        data: JSON.stringify({ ...data, reason: text }),
      },
    });

    await send(
      chatId,
      "Who introduced you to SkulGo Validation?\n\nSend their SkulGo Account ID, or type NONE if nobody introduced you."
    );
    return NextResponse.json({ ok: true });
  }

  if (session.state === "INTRODUCER") {
    const data = session.data ? JSON.parse(session.data) : null;
    if (!data?.userId || !data?.requestedRole || !data?.reason) {
      await send(chatId, "Please restart with /apply.");
      return NextResponse.json({ ok: true });
    }

    const introducerInput = text.toUpperCase();
    let introducedByAccountId: string | null = null;

    if (introducerInput !== "NONE") {
      const introducer = await db.user.findUnique({
        where: { referralCode: introducerInput },
        select: { referralCode: true },
      });

      if (!introducer) {
        await send(chatId, "❌ Introducer SkulGo Account ID not found. Please check it, or type NONE.");
        return NextResponse.json({ ok: true });
      }

      if (introducerInput === data.accountId) {
        await send(chatId, "Please enter the SkulGo Account ID of the person who introduced you, or type NONE.");
        return NextResponse.json({ ok: true });
      }

      introducedByAccountId = introducer.referralCode;
    }

    const pending = await db.validatorApplication.findFirst({
      where: { userId: data.userId, status: "PENDING" },
    });

    if (pending) {
      await send(chatId, "📨 Your validator application is already under review.");
      return NextResponse.json({ ok: true });
    }

    const application = await db.validatorApplication.create({
      data: {
        userId: data.userId,
        requestedRole: data.requestedRole,
        schoolExperience: data.schoolExperience,
        reason: data.reason,
        introducedByAccountId,
        telegramChatId: chatId,
      },
    });

    await db.validatorBotSession.update({
      where: { id: session.id },
      data: { state: "IDLE", data: null },
    });

    await send(
      chatId,
      "📨 Application received.\n\nRole: " +
        application.requestedRole +
        "\nIntroduced by: " +
        (introducedByAccountId || "Nobody / self") +
        "\nStatus: PENDING\n\nA Validation School Admin will review it. You will be informed after a decision."
    );
    return NextResponse.json({ ok: true });
  }

  await send(chatId, "Use /apply to apply as a SkulGo Validator, or /help for guidance.");
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: Boolean(TOKEN && getValidationSchoolId()),
  });
}
