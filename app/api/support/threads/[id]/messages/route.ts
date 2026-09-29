import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
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

    const messageId = randomUUID();
    await db.$transaction([
      db.supportMessage.create({
        data: { id: messageId, threadId: id, senderUserId: user.id, body: message },
      }),
      db.supportThread.update({ where: { id }, data: { status: "OPEN" } }),
      db.auditLog.create({
        data: {
          schoolId: thread.schoolId,
          actorUserId: user.id,
          action: "CREATE",
          entity: "SUPPORT_MESSAGE",
          entityId: messageId,
          details: "Owner support reply",
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  }

  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const thread = await db.supportThread.findFirst({ where: { id, schoolId: user.membership.schoolId } });
  if (!thread) return NextResponse.json({ error: "Support request not found." }, { status: 404 });

  const messageId = randomUUID();
  await db.$transaction([
    db.supportMessage.create({
      data: { id: messageId, threadId: id, senderUserId: user.id, body: message },
    }),
    db.supportThread.update({ where: { id }, data: { status: "OPEN" } }),
    db.auditLog.create({
      data: {
        schoolId: thread.schoolId,
        actorUserId: user.id,
        action: "CREATE",
        entity: "SUPPORT_MESSAGE",
        entityId: messageId,
        details: "School support reply",
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
