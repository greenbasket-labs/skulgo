import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { createOtp, createRawToken, hashToken } from "@/lib/email-tokens";
import { createReferralCode } from "@/lib/referrals";

export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "").trim();
  const confirmPassword = String(b?.confirmPassword ?? b?.passwordConfirmation ?? "").trim();
  const referralCode = String(b?.referralCode ?? "").trim().toUpperCase();

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

  let referredById: string | null = null;
  if (referralCode) {
    const referrer = await db.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });

    if (!referrer) {
      return NextResponse.json({ error: "Referral ID is not valid" }, { status: 400 });
    }

    referredById = referrer.id;
  }

  const verificationToken = createRawToken();
  const verificationOtp = createOtp();

  const user = await db.$transaction(async tx => {
    const foundingCount = await tx.user.count({
      where: { foundingNumber: { not: null } },
    });
    const foundingNumber = foundingCount < 100 ? foundingCount + 1 : null;

    let generatedReferralCode = createReferralCode();
    {
      while (await tx.user.findUnique({ where: { referralCode: generatedReferralCode }, select: { id: true } })) {
        generatedReferralCode = createReferralCode(null);
      }
    }

    return tx.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        referralCode: generatedReferralCode,
        foundingNumber,
        referredById,
        emailVerificationTokenHash: hashToken(verificationToken),
        emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        emailVerificationOtpHash: hashToken(verificationOtp),
        emailVerificationOtpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
      select: {
        id: true,
        name: true,
        email: true,
        referralCode: true,
        foundingNumber: true,
      },
    });
  });

  try {
    await sendVerificationEmail(user.email, user.name, verificationToken, verificationOtp);
  } catch (error) {
    await db.user.delete({ where: { id: user.id } }).catch(() => undefined);
    const detail = error instanceof Error ? error.message : "";
    const safeDetail = /RESEND_API_KEY|domain|sender|from|recipient|email/i.test(detail) ? detail : "";
    return NextResponse.json(
      { error: safeDetail ? "Verification email could not be sent: " + safeDetail : "Account could not be created because the verification email could not be sent." },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      referralCode: user.referralCode,
      foundingNumber: user.foundingNumber,
      verificationSent: true,
    },
    { status: 201 }
  );
}
