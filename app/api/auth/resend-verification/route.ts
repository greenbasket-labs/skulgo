import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { createOtp, createRawToken, hashToken } from "@/lib/email-tokens";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ ok: true });
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const verificationToken = createRawToken();
  const verificationOtp = createOtp();

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerificationTokenHash: hashToken(verificationToken),
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      emailVerificationOtpHash: hashToken(verificationOtp),
      emailVerificationOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  try {
    await sendVerificationEmail(user.email, user.name, verificationToken, verificationOtp);
  } catch {
    return NextResponse.json({ error: "Verification email could not be sent. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
