import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

async function membership(userId: string, schoolId: string) {
  return db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId } },
  });
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const member = await membership(user.id, schoolId);
  if (!member?.active) return NextResponse.json({ error: "School access required" }, { status: 403 });

  return NextResponse.json(await db.section.findMany({
    where: { schoolId },
    include: { classes: true },
    orderBy: { name: "asc" },
  }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const member = await membership(user.id, schoolId);
  if (!member?.active || member.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Section name is required" }, { status: 400 });

  try {
    const section = await db.section.create({ data: { schoolId, name } });
    await recordAudit({ schoolId, actorUserId: user.id, action: "CREATE", entity: "SECTION", entityId: section.id, details: { name } });
    return NextResponse.json(section, { status: 201 });
  } catch {
    return NextResponse.json({ error: "This section already exists" }, { status: 409 });
  }
}
