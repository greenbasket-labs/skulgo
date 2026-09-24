import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, setSession, verifyPin } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const membershipId = String(body?.membershipId ?? "");
  if (!membershipId) return NextResponse.json({ error: "membershipId is required" }, { status: 400 });

  const membership = await db.schoolMembership.findFirst({
    where: { id: membershipId, userId: user.id, active: true },
    select: { id: true, schoolId: true, role: true },
  });

  if (!membership) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const response = NextResponse.json({ ok: true, schoolId: membership.schoolId, role: membership.role });
  setSession(response, { id: user.id }, membership.id, user.session.deviceId);
  return response;
}
