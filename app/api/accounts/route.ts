import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createOrReuseDevice, hashPassword, setSession } from "@/lib/auth";

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

  const user = await db.user.create({
    data: { name, email, passwordHash: hashPassword(password) },
  });

  const response = NextResponse.json(
    { id: user.id, name: user.name, email: user.email },
    { status: 201 }
  );
  const deviceId = await createOrReuseDevice(user.id, response);
  if (!deviceId) {
    return NextResponse.json({ error: "Maximum of 2 active devices reached." }, { status: 429 });
  }
  setSession(response, user, null, deviceId);
  return response;
}
