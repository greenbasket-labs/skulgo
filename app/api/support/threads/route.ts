import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireOwner } from "@/lib/owner";
import { answerSkulGoSupport, verifySupportContext } from "@/lib/support-brain";

export async function GET(request: Request) {
  const owner = request.headers.get("x-skulgo-owner") === "1";
  if (owner) {
    await requireOwner();
    const threads = await db.supportThread.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        school: { select: { name: true, abbr: true } },
        createdBy: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { name: true } } } },
      },
    });
    return NextResponse.json({ threads });
  }

  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const threads = await db.supportThread.findMany({
    where: { schoolId: user.membership.schoolId },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } },
    },
  });
  return NextResponse.json({ threads });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const subject = String(body?.subject ?? "").trim();
  const message = String(body?.message ?? "").trim();

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
  }
  if (subject.length > 160 || message.length > 5000) {
    return NextResponse.json({ error: "Message is too long." }, { status: 400 });
  }

  const threadId = randomUUID();
  const messageId = randomUUID();

  const verification = await verifySupportContext(db, user.membership.schoolId, user.membership.role, `${subject} ${message}`);
  if (!verification) return NextResponse.json({ error: "Could not verify your school support context." }, { status: 409 });
  const botReply = `🔎 Verified first\n\n${answerSkulGoSupport({ subject, message })}\n\n${verification.checks.join(" ")}`;
  const botMessageId = randomUUID();

  await db.$transaction([
    db.supportThread.create({
      data: {
        id: threadId,
        schoolId: user.membership.schoolId,
        createdById: user.id,
        subject,
        messages: { create: { id: messageId, senderUserId: user.id, senderType: "USER", body: message } },
      },
    }),
    db.supportMessage.create({
      data: { id: botMessageId, threadId, senderUserId: null, senderType: "BOT", body: botReply },
    }),
    db.auditLog.create({
      data: {
        schoolId: user.membership.schoolId,
        actorUserId: user.id,
        action: "CREATE",
        entity: "SUPPORT_MESSAGE",
        entityId: messageId,
        details: `Support request: ${subject}`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, threadId, botMessage: botReply });
}
