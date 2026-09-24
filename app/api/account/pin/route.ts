import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, hashPin } from "@/lib/auth";

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const pin = String(body?.pin ?? "").trim();
  const confirmPin = String(body?.confirmPin ?? "").trim();

  if (!/^[0-9]{4,6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must contain 4 to 6 digits." }, { status: 400 });
  }
  if (pin !== confirmPin) {
    return NextResponse.json({ error: "PINs do not match." }, { status: 400 });
  }

  await db.user.update({
    where: { id: user.id },
    data: { pinHash: hashPin(pin), pinFailedAttempts: 0, pinLockedUntil: null },
  });

  return NextResponse.json({ ok: true });
}
