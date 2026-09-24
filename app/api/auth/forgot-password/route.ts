import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { createRawToken, hashToken } from "@/lib/email-tokens";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

  const generic = { ok: true, message: "If that email exists, a password reset link has been sent." };
  const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, email: true } });
  if (!user) return NextResponse.json(generic);

  const token = createRawToken();
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  try {
    await sendPasswordResetEmail(user.email, user.name, token);
  } catch {
    await db.user.update({
      where: { id: user.id },
      data: { passwordResetTokenHash: null, passwordResetExpiresAt: null },
    });
  }

  return NextResponse.json(generic);
}
