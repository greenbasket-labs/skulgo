const TOKEN = process.env.TELEGRAM_VALIDATOR_BOT_TOKEN;

export async function sendValidatorTelegramMessage(chatId: string, text: string) {
  if (!TOKEN || !chatId) return false;
  const response = await fetch("https://api.telegram.org/bot" + TOKEN + "/sendMessage", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    cache: "no-store",
  });
  return response.ok;
}
