import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const END_REASONS = [
  "Resigned",
  "Contract ended",
  "Terminated",
  "Dismissed",
  "Transferred",
  "Other",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ schoolId: string; membershipId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId, membershipId } = await params;

  if (!user?.membership || user.membership.schoolId !== schoolId || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const reason = String(body?.endReason ?? "").trim();

  if (!END_REASONS.includes(reason)) {
    return NextResponse.json({ error: "Choose a valid leaving reason" }, { status: 400 });
  }

  const membership = await db.schoolMembership.findFirst({
    where: { id: membershipId, schoolId, active: true },
    select: { id: true, userId: true, role: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Active school relationship not found" }, { status: 404 });
  }

  if (membership.userId === user.id) {
    return NextResponse.json({ error: "You cannot end your own school access here" }, { status: 400 });
  }

  const endedAt = new Date();

  await db.schoolMembership.update({
    where: { id: membership.id },
    data: { active: false, endedAt, endReason: reason },
  });

  await db.auditLog.create({
    data: {
      schoolId,
      actorUserId: user.id,
      action: "END_SCHOOL_RELATIONSHIP",
      entity: "SchoolMembership",
      entityId: membership.id,
      details: JSON.stringify({ userId: membership.userId, role: membership.role, endReason: reason }),
    },
  });

  return NextResponse.json({ ok: true, endedAt, endReason: reason });
}
