import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireOwner } from "@/lib/owner";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const message = String(body?.message ?? "").trim();
  if (!message || message.length > 5000) {
    return NextResponse.json({ error: "A message is required." }, { status: 400 });
  }

  const owner = request.headers.get("x-skulgo-owner") === "1";
  if (owner) {
    const user = await requireOwner();
    const thread = await db.supportThread.findUnique({ where: { id } });
    if (!thread) return NextResponse.json({ error: "Support request not found." }, { status: 404 });
    await db.supportMessage.create({ data: { threadId: id, senderUserId: user.id, body: message } });
    await db.supportThread.update({ where: { id }, data: { status: "OPEN" } });
    return NextResponse.json({ ok: true });
  }

  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const thread = await db.supportThread.findFirst({ where: { id, schoolId: user.membership.schoolId } });
  if (!thread) return NextResponse.json({ error: "Support request not found." }, { status: 404 });

  await db.supportMessage.create({ data: { threadId: id, senderUserId: user.id, body: message } });
  await db.supportThread.update({ where: { id }, data: { status: "OPEN" } });
  return NextResponse.json({ ok: true });
}
