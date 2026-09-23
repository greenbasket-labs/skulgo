import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

async function schoolAccess(userId: string, schoolId: string) {
  return db.schoolMembership.findFirst({
    where: { userId, schoolId, active: true },
    select: { role: true },
  });
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const membership = await schoolAccess(user.id, schoolId);
  if (!membership) {
    return NextResponse.json({ error: "School access required" }, { status: 403 });
  }

  return NextResponse.json(await db.schoolClass.findMany({
    where: { schoolId },
    include: { section: true, students: true },
    orderBy: [{ name: "asc" }, { arm: "asc" }],
  }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const membership = await schoolAccess(user.id, schoolId);
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const sectionId = String(body?.sectionId ?? "");
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const arm = typeof body?.arm === "string" && body.arm.trim() ? body.arm.trim() : null;

  if (!sectionId || !name) {
    return NextResponse.json({ error: "sectionId and name are required" }, { status: 400 });
  }

  const section = await db.section.findFirst({ where: { id: sectionId, schoolId } });
  if (!section) return NextResponse.json({ error: "Section not found in this school" }, { status: 404 });

  try {
    const schoolClass = await db.schoolClass.create({ data: { schoolId, sectionId, name, arm } });
    await recordAudit({ schoolId, actorUserId: user.id, action: "CREATE", entity: "CLASS", entityId: schoolClass.id, details: { sectionId, name, arm } });
    return NextResponse.json(schoolClass, { status: 201 });
  } catch {
    return NextResponse.json({ error: "This class already exists" }, { status: 409 });
  }
}
