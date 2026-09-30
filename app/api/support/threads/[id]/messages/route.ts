import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireOwner } from "@/lib/owner";
import { answerSkulGoSupport, verifySupportContext } from "@/lib/support-brain";

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
        data: { id: messageId, threadId: id, senderUserId: user.id, senderType: "USER", body: message },
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

  const verification = await verifySupportContext(db, user.membership.schoolId, user.membership.role, message);
  if (!verification) return NextResponse.json({ error: "Could not verify your school support context." }, { status: 409 });

  const messageId = randomUUID();
  const botReply = `🔎 Verified first\n\n${answerSkulGoSupport({ message })}\n\n${verification.checks.join(" ")}`;
  const botMessageId = randomUUID();

  await db.$transaction([
    db.supportMessage.create({
      data: { id: messageId, threadId: id, senderUserId: user.id, senderType: "USER", body: message },
    }),
    db.supportMessage.create({
      data: { id: botMessageId, threadId: id, senderUserId: null, senderType: "BOT", body: botReply },
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

  return NextResponse.json({ ok: true, botMessage: botReply });
}
