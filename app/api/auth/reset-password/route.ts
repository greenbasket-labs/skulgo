import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { hashToken } from "@/lib/email-tokens";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  const password = String(body?.password ?? "").trim();
  const confirmPassword = String(body?.confirmPassword ?? "").trim();

  if (!token || !password || !confirmPassword) {
    return NextResponse.json({ error: "Token, password and confirmation are required." }, { status: 400 });
  }
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  if (password !== confirmPassword) return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });

  const user = await db.user.findFirst({
    where: {
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: hashPassword(password),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      pinFailedAttempts: 0,
      pinLockedUntil: null,
    },
  });

  return NextResponse.json({ ok: true });
}
