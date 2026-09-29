import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getValidationSchoolId, isValidatorRole } from "@/lib/validators";

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

  if (text === "/help") {
    await send(
      chatId,
      "SkulGo Validators test SkulGo through real school roles.\n\n/apply — start an application\n\nYour SkulGo Account ID identifies your SkulGo account. Your validator role should match your real-world school experience."
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
