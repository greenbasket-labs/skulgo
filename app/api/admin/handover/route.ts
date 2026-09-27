import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const REASONS = [
  "Resignation",
  "Transfer",
  "Retirement",
  "Change of role",
  "End of appointment",
  "Administrative restructuring",
  "Other",
];

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const current = await getCurrentUser();
  const schoolId = current?.membership?.schoolId;

  if (!current || !current.membership || current.membership.role !== "ADMIN" || !schoolId) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const reason = clean(body?.reason);
  const referralId = clean(body?.referralId);
  const note = clean(body?.note);

  if (!REASONS.includes(reason)) {
    return NextResponse.json({ error: "Choose a valid handover reason" }, { status: 400 });
  }
  if (!referralId) {
    return NextResponse.json({ error: "New Admin Referral ID is required" }, { status: 400 });
  }

  const target = await db.user.findUnique({
    where: { referralCode: referralId },
    select: { id: true, name: true, referralCode: true },
  });

  if (!target) {
    return NextResponse.json({ error: "SkulGo Referral ID not found" }, { status: 404 });
  }
  if (target.id === current.id) {
    return NextResponse.json({ error: "The new Admin must be a different person" }, { status: 400 });
  }

  const existingTargetMembership = await db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId: target.id } },
    select: { id: true, active: true, role: true },
  });

  const previousMembership = await db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId: current.id } },
    select: { id: true, active: true, role: true },
  });

  if (!previousMembership?.active || previousMembership.role !== "ADMIN") {
    return NextResponse.json({ error: "Current Admin membership is no longer active" }, { status: 403 });
  }

  await db.$transaction(async tx => {
    if (existingTargetMembership) {
      await tx.schoolMembership.update({
        where: { id: existingTargetMembership.id },
        data: { active: true, role: "ADMIN", endedAt: null, endReason: null },
      });
    } else {
      await tx.schoolMembership.create({
        data: { schoolId, userId: target.id, role: "ADMIN" },
      });
    }

    await tx.schoolMembership.update({
      where: { id: previousMembership.id },
      data: {
        active: false,
        endedAt: new Date(),
        endReason: "Admin handover",
      },
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        actorUserId: current.id,
        action: "ADMIN_HANDOVER",
        entity: "SchoolMembership",
        entityId: previousMembership.id,
        details: JSON.stringify({
          previousAdminId: current.id,
          newAdminId: target.id,
          newAdminMembershipId: existingTargetMembership?.id ?? null,
          reason,
          note: note || null,
        }),
      },
    });
  });

  return NextResponse.json({
    ok: true,
    newAdminName: target.name,
  });
}
