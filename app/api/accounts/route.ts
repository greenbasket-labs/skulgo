import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createOrReuseDevice, hashPassword, setSession } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { createRawToken, hashToken } from "@/lib/email-tokens";

export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "").trim();
  const confirmPassword = String(b?.confirmPassword ?? b?.passwordConfirmation ?? "").trim();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email and password are required" }, { status: 400 });
  }

  if (confirmPassword && password !== confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
  }

  if (await db.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const verificationToken = createRawToken();
  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      emailVerificationTokenHash: hashToken(verificationToken),
      emailVerificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const response = NextResponse.json(
    { id: user.id, name: user.name, email: user.email },
    { status: 201 }
  );
  const deviceId = await createOrReuseDevice(user.id, response);
  if (!deviceId) {
    return NextResponse.json({ error: "Maximum of 2 active devices reached." }, { status: 429 });
  }
  await sendVerificationEmail(user.email, user.name, verificationToken);
  setSession(response, user, null, deviceId);
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, verificationSent: true }, { status: 201, headers: response.headers });
}
