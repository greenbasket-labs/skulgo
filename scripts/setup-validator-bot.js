const token = process.env.TELEGRAM_VALIDATOR_BOT_TOKEN;
const appUrl = process.env.APP_URL;
const secret = process.env.TELEGRAM_VALIDATOR_WEBHOOK_SECRET;

if (!token || !appUrl) {
  throw new Error("Set TELEGRAM_VALIDATOR_BOT_TOKEN and APP_URL first.");
}

const webhookUrl = new URL("/api/telegram/validator", appUrl).toString();
const commands = [
  { command: "start", description: "Start SkulGo Validator" },
  { command: "apply", description: "Apply to become a validator" },
  { command: "help", description: "How SkulGo validation works" },
];

const webhookResponse = await fetch("https://api.telegram.org/bot" + token + "/setWebhook", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: webhookUrl,
    ...(secret ? { secret_token: secret } : {}),
    allowed_updates: ["message", "callback_query"],
  }),
});
if (!webhookResponse.ok) throw new Error(await webhookResponse.text());

const commandsResponse = await fetch("https://api.telegram.org/bot" + token + "/setMyCommands", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ commands }),
});
if (!commandsResponse.ok) throw new Error(await commandsResponse.text());

console.log(JSON.stringify({ ok: true, webhookUrl }, null, 2));
