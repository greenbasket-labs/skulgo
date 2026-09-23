import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();

  if (!user?.membership || user.membership.schoolId !== schoolId || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const term = String(body?.term ?? "").trim();
  const studentId = body?.studentId ? String(body.studentId) : null;

  if (!term) return NextResponse.json({ error: "term is required" }, { status: 400 });

  const result = await db.result.updateMany({
    where: {
      schoolId,
      term,
      ...(studentId ? { studentId } : {}),
    },
    data: { published: true },
  });

  await recordAudit({
    schoolId,
    actorUserId: user.id,
    action: "PUBLISH",
    entity: "RESULT",
    entityId: studentId ?? term,
    details: { term, studentId, count: result.count },
  });

  return NextResponse.json({ published: result.count });
}
