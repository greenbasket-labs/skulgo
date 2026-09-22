import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { setSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const b = await request.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "").trim();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid login details" }, { status: 401 });
  }

  const memberships = await db.schoolMembership.findMany({
    where: { userId: user.id, active: true },
    include: { school: { select: { id: true, name: true, abbr: true } } },
    orderBy: { createdAt: "asc" },
  });

  const response = NextResponse.json({
    ok: true,
    name: user.name,
    workspaces: memberships.map(m => ({
      membershipId: m.id,
      schoolId: m.schoolId,
      schoolName: m.school.name,
      schoolAbbr: m.school.abbr,
      role: m.role,
    })),
  });

  // Keep the session at the personal-account level until a school workspace is chosen.
  setSession(response, { id: user.id }, null);
  return response;
}
