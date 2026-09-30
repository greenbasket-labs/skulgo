import { NextResponse } from "next/server";
import { answerSkulGoSupport } from "@/lib/support-brain";

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

async function send(chatId: string, text: string) {
  await telegram("sendMessage", { chat_id: chatId, text });
}

export async function POST(request: Request) {
  if (SECRET && request.headers.get("x-telegram-bot-api-secret-token") !== SECRET) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  const update = await request.json().catch(() => null);
  const message = update?.message;
  const chatId = message?.chat?.id?.toString();
  const text = typeof message?.text === "string" ? message.text.trim() : "";

  if (!chatId || !text) return NextResponse.json({ ok: true });

  const cleanText = text
    .replace(/@skulgovalidatorbot\b/ig, "")
    .trim();

  if (cleanText === "/start" || cleanText === "/help") {
    await send(
      chatId,
      "🤖 SkulGo Support Bot\n\n" +
      "I am the SkulGo Support Bot. Ask me about the current SkulGo product, school workflows, roles, attendance, scores, results, fees, payments, offline work, accounts, assignments and settings.\n\n" +
      "I will use the current SkulGo product rules and will not invent features."
    );
    return NextResponse.json({ ok: true });
  }

  if (cleanText.startsWith("/")) {
    await send(chatId, "🤖 SkulGo Support Bot\n\nUse /help or simply ask your SkulGo question.");
    return NextResponse.json({ ok: true });
  }

  const answer = answerSkulGoSupport({ message: cleanText });
  await send(chatId, answer);

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: Boolean(TOKEN),
    purpose: "SkulGo Support Bot",
  });
}
