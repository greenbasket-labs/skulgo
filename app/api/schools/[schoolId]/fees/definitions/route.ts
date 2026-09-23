import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

type TargetType = "SCHOOL" | "SECTION" | "CLASS";

async function membership(userId: string, schoolId: string) {
  return db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId } },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const member = await membership(user.id, schoolId);
  if (!member?.active || member.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const definitions = await db.feeDefinition.findMany({
    where: { schoolId },
    include: {
      section: { select: { name: true } },
      class: {
        select: {
          name: true,
          arm: true,
          section: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(definitions);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const member = await membership(user.id, schoolId);
  if (!member?.active || member.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const description = typeof body?.body === "string" ? body.body.trim() : "";
  const amount = Number(body?.amount);
  const targetType = String(body?.targetType ?? "") as TargetType;
  const sectionId = typeof body?.sectionId === "string" && body.sectionId ? body.sectionId : null;
  const classId = typeof body?.classId === "string" && body.classId ? body.classId : null;

  if (!title || !Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Title and a valid amount are required" }, { status: 400 });
  }

  if (!["SCHOOL", "SECTION", "CLASS"].includes(targetType)) {
    return NextResponse.json({ error: "Invalid fee target" }, { status: 400 });
  }

  if (targetType === "SECTION" && !sectionId) {
    return NextResponse.json({ error: "Choose a section" }, { status: 400 });
  }

  if (targetType === "CLASS" && !classId) {
    return NextResponse.json({ error: "Choose a class" }, { status: 400 });
  }

  if (sectionId) {
    const section = await db.section.findFirst({
      where: { id: sectionId, schoolId },
      select: { id: true },
    });
    if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  if (classId) {
    const schoolClass = await db.schoolClass.findFirst({
      where: { id: classId, schoolId },
      select: { id: true },
    });
    if (!schoolClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });
  }

  try {
    const definition = await db.feeDefinition.create({
      data: {
        schoolId,
        title,
        body: description || null,
        amount,
        targetType,
        sectionId: targetType === "SECTION" ? sectionId : null,
        classId: targetType === "CLASS" ? classId : null,
        status: "DRAFT",
        createdById: user.id,
      },
    });

    await recordAudit({
      schoolId,
      actorUserId: user.id,
      action: "CREATE",
      entity: "FEE_DEFINITION",
      entityId: definition.id,
      details: { title, amount, targetType, sectionId, classId },
    });

    return NextResponse.json(definition, { status: 201 });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
    console.error("FEE_DEFINITION_CREATE_FAILED", { code, error });
    const message = code === "P2021"
      ? "Fee definitions are not available in the production database yet. Run the production schema sync and try again."
      : "Unable to create fee right now. Please try again."; 
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const member = await membership(user.id, schoolId);
  if (!member?.active || member.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const action = typeof body?.action === "string" ? body.action : "";

  if (!id || action !== "APPROVE") {
    return NextResponse.json({ error: "id and APPROVE action are required" }, { status: 400 });
  }

  const draft = await db.feeDefinition.findFirst({
    where: { id, schoolId, status: "DRAFT" },
  });

  if (!draft) {
    return NextResponse.json({ error: "Draft fee not found" }, { status: 404 });
  }

  const updated = await db.feeDefinition.update({
    where: { id: draft.id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  await recordAudit({
    schoolId,
    actorUserId: user.id,
    action: "APPROVE",
    entity: "FEE_DEFINITION",
    entityId: updated.id,
    details: { title: updated.title, targetType: updated.targetType },
  });

  return NextResponse.json(updated);
}
