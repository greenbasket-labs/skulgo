import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireOwner } from "@/lib/owner";

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

  const thread = await db.supportThread.create({
    data: {
      schoolId: user.membership.schoolId,
      createdById: user.id,
      subject,
      messages: { create: { senderUserId: user.id, body: message } },
    },
  });

  return NextResponse.json({ ok: true, threadId: thread.id });
}
