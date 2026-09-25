import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createOrReuseDevice, setSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "").trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  const ownerEmail = process.env.SKULGO_OWNER_EMAIL?.trim().toLowerCase();
  if (ownerEmail && email === ownerEmail) {
    return NextResponse.json({ error: "Use the SkulGo Owner login at /owner/login." }, { status: 403 });
  }

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid login details" }, { status: 401 });
  }

  if (!user.emailVerifiedAt) {
    return NextResponse.json({
      error: "Please verify your email before signing in.",
      emailVerificationRequired: true,
      email: user.email,
    }, { status: 403 });
  }

  const memberships = await db.schoolMembership.findMany({
    where: { userId: user.id, active: true },
    include: { school: { select: { id: true, name: true, abbr: true } } },
    orderBy: { createdAt: "asc" },
  });

  const response = NextResponse.json({
    ok: true,
    name: user.name,
    pinConfigured: Boolean(user.pinHash),
    workspaces: memberships.map(m => ({
      membershipId: m.id,
      schoolId: m.schoolId,
      schoolName: m.school.name,
      schoolAbbr: m.school.abbr,
      role: m.role,
    })),
  });

  const deviceId = await createOrReuseDevice(user.id, response);
  if (!deviceId) {
    return NextResponse.json({ error: "Maximum of 2 active devices reached." }, { status: 429 });
  }
  setSession(response, { id: user.id }, null, deviceId);
  return response;
}
