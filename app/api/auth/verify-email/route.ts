import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/email-tokens";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const otp = String(body?.otp ?? "").trim();

  if (!token && (!email || !otp)) {
    return NextResponse.json({ error: "Verification link or email OTP is required." }, { status: 400 });
  }

  if (token) {
    const user = await db.user.findFirst({
      where: {
        emailVerificationTokenHash: hashToken(token),
        emailVerificationExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "This verification link is invalid or expired." }, { status: 400 });
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationTokenHash: null,
        emailVerificationExpiresAt: null,
        emailVerificationOtpHash: null,
        emailVerificationOtpExpiresAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (!/^\d{6}$/.test(otp)) {
    return NextResponse.json({ error: "Enter the 6-digit OTP from your email." }, { status: 400 });
  }

  const user = await db.user.findFirst({
    where: {
      email,
      emailVerificationOtpHash: hashToken(otp),
      emailVerificationOtpExpiresAt: { gt: new Date() },
    },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "This OTP is invalid or expired." }, { status: 400 });
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
      emailVerificationOtpHash: null,
      emailVerificationOtpExpiresAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
