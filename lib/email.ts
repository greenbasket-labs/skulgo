import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured.");
  }
  return new Resend(key);
}

function appUrl() {
  return (process.env.APP_URL || "https://skulgo.com").replace(/\/$/, "");
}

function fromAddress() {
  return process.env.RESEND_FROM?.trim() || "SkulGo <onboarding@resend.dev>";
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string,
  otp: string
) {
  const resend = getResend();
  const url = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: email,
    subject: "Verify your SkulGo email",
    html: `
      <p>Hello ${escapeHtml(name)},</p>
      <p>Please verify your SkulGo email address to activate your account.</p>
      <p>Your 6-digit verification code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;"><strong>${escapeHtml(otp)}</strong></p>
      <p>This code expires in 10 minutes.</p>
      <p>You can also use the verification link below:</p>
      <p><a href="${url}">Verify my email</a></p>
      <p>The verification link expires in 24 hours.</p>
    `,
  });
  if (error) throw new Error(error.message);
}

export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const resend = getResend();
  const url = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: email,
    subject: "Reset your SkulGo password",
    html: `
      <p>Hello ${escapeHtml(name)},</p>
      <p>Use the link below to reset your SkulGo password.</p>
      <p><a href="${url}">Reset my password</a></p>
      <p>This link expires in 1 hour.</p>
    `,
  });
  if (error) throw new Error(error.message);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[ch] || ch));
}
