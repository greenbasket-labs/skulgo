import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, setSession, verifyPin } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const membershipId = String(body?.membershipId ?? "");
  const pin = String(body?.pin ?? "");
  if (!membershipId) return NextResponse.json({ error: "membershipId is required" }, { status: 400 });
  if (!/^\d{4,6}$/.test(pin)) return NextResponse.json({ error: "A 4-6 digit workspace PIN is required" }, { status: 400 });

  if (user.pinLockedUntil && user.pinLockedUntil > new Date()) {
    return NextResponse.json({ error: "Workspace PIN is temporarily locked" }, { status: 423 });
  }

  if (!user.pinHash || !verifyPin(pin, user.pinHash)) {
    const attempts = user.pinFailedAttempts + 1;
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await db.user.update({
      where: { id: user.id },
      data: { pinFailedAttempts: attempts, pinLockedUntil: lockedUntil },
    });
    return NextResponse.json(
      { error: lockedUntil ? "Too many PIN attempts. Try again later." : "Invalid workspace PIN" },
      { status: 401 }
    );
  }

  if (user.pinFailedAttempts || user.pinLockedUntil) {
    await db.user.update({
      where: { id: user.id },
      data: { pinFailedAttempts: 0, pinLockedUntil: null },
    });
  }

  const membership = await db.schoolMembership.findFirst({
    where: { id: membershipId, userId: user.id, active: true },
    select: { id: true, schoolId: true, role: true },
  });

  if (!membership) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const response = NextResponse.json({ ok: true, schoolId: membership.schoolId, role: membership.role });
  setSession(response, { id: user.id }, membership.id, user.session.deviceId);
  return response;
}
