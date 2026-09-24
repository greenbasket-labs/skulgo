import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { createOtp, createRawToken, hashToken } from "@/lib/email-tokens";

export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "").trim();
  const confirmPassword = String(b?.confirmPassword ?? b?.passwordConfirmation ?? "").trim();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email and password are required" }, { status: 400 });
  }

  if (password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  if (await db.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const verificationToken = createRawToken();
  const verificationOtp = createOtp();

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      emailVerificationTokenHash: hashToken(verificationToken),
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      emailVerificationOtpHash: hashToken(verificationOtp),
      emailVerificationOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  try {
    await sendVerificationEmail(user.email, user.name, verificationToken, verificationOtp);
  } catch {
    await db.user.delete({ where: { id: user.id } }).catch(() => undefined);
    return NextResponse.json(
      { error: "Account could not be created because the verification email could not be sent." },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { id: user.id, name: user.name, email: user.email, verificationSent: true },
    { status: 201 }
  );
}
