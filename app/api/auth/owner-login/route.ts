import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createOrReuseDevice, setOwnerSession, setSession, verifyPassword } from "@/lib/auth";

function isMobile(request: Request) {
  const userAgent = request.headers.get("user-agent")?.toLowerCase() ?? "";
  return /android|iphone|ipad|ipod|mobile|windows phone|opera mini|blackberry/.test(userAgent);
}

export async function POST(request: Request) {
  if (isMobile(request)) {
    return NextResponse.json({ error: "SkulGo Owner is available on desktop only." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "").trim();
  const ownerEmail = process.env.SKULGO_OWNER_EMAIL?.trim().toLowerCase();

  if (!ownerEmail || !email || email !== ownerEmail || !password) {
    return NextResponse.json({ error: "Invalid owner login details." }, { status: 401 });
  }

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Invalid owner login details." }, { status: 401 });
  }

  if (!user.emailVerifiedAt) {
    return NextResponse.json({ error: "Owner email must be verified before signing in." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  const deviceId = await createOrReuseDevice(user.id, response, 2, 7);

  if (!deviceId) {
    return NextResponse.json(
      { error: "The SkulGo Owner account already has 2 active devices." },
      { status: 429 }
    );
  }

  const ownerSessionMaxAge = 60 * 60 * 24 * 30;
  setSession(response, { id: user.id }, null, deviceId, ownerSessionMaxAge);
  setOwnerSession(response, { id: user.id }, deviceId);

  return response;
}
