import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { requireOwner } from "@/lib/owner";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = request.headers.get("x-skulgo-owner") === "1";

  if (owner) {
    await requireOwner();
    const thread = await db.supportThread.findUnique({
      where: { id },
      include: {
        school: { select: { name: true, abbr: true } },
        createdBy: { select: { name: true, email: true } },
        messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } },
      },
    });
    if (!thread) return NextResponse.json({ error: "Support request not found." }, { status: 404 });
    return NextResponse.json({ thread });
  }

  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const thread = await db.supportThread.findFirst({
    where: { id, schoolId: user.membership.schoolId },
    include: { messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } } },
  });
  if (!thread) return NextResponse.json({ error: "Support request not found." }, { status: 404 });
  return NextResponse.json({ thread });
}
