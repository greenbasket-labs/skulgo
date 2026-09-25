import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ schoolId: string; sectionId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId, sectionId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const member = await db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId: user.id } },
  });
  if (!member?.active || member.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const section = await db.section.findFirst({
    where: { id: sectionId, schoolId },
    include: { _count: { select: { classes: true } } },
  });

  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  if (section._count.classes > 0) {
    return NextResponse.json(
      { error: "This section cannot be removed because it has saved classes." },
      { status: 409 }
    );
  }

  await db.section.delete({ where: { id: section.id } });
  await recordAudit({
    schoolId,
    actorUserId: user.id,
    action: "DELETE",
    entity: "SECTION",
    entityId: section.id,
    details: { name: section.name },
  });

  return NextResponse.json({ ok: true });
}