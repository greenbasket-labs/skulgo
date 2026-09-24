import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/email-tokens";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = String(body?.token ?? "").trim();

  if (!token) return NextResponse.json({ error: "Verification token is required." }, { status: 400 });

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
    },
  });

  return NextResponse.json({ ok: true });
}
