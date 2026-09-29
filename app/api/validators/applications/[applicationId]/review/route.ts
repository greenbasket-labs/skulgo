import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getValidationSchoolId } from "@/lib/validators";
import { recordAudit } from "@/lib/audit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const reviewer = await getCurrentUser();
  const schoolId = getValidationSchoolId();
  const { applicationId } = await params;

  if (!reviewer?.membership || reviewer.membership.schoolId !== schoolId || reviewer.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Validation school admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const decision = typeof body?.decision === "string" ? body.decision.toUpperCase() : "";
  if (decision !== "APPROVE" && decision !== "REJECT") {
    return NextResponse.json({ error: "Decision must be APPROVE or REJECT." }, { status: 400 });
  }

  const application = await db.validatorApplication.findUnique({ where: { id: applicationId } });
  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });
  if (application.status !== "PENDING") return NextResponse.json({ error: "This application has already been reviewed." }, { status: 409 });

  if (decision === "REJECT") {
    await db.validatorApplication.update({
      where: { id: application.id },
      data: { status: "REJECTED", reviewedById: reviewer.id, reviewedAt: new Date() },
    });
    await recordAudit({
      schoolId,
      actorUserId: reviewer.id,
      action: "REJECT",
      entity: "VALIDATOR_APPLICATION",
      entityId: application.id,
      details: { requestedRole: application.requestedRole },
    });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  const result = await db.$transaction(async tx => {
    const existingProfile = await tx.validatorProfile.findUnique({ where: { userId: application.userId } });
    if (existingProfile) throw new Error("This user is already a validator.");

    const latest = await tx.validatorProfile.findFirst({
      orderBy: { createdAt: "desc" },
      select: { validatorId: true },
    });
    const match = latest?.validatorId.match(/^V-(\d+)$/);
    const nextNumber = match ? Number(match[1]) + 1 : 1;
    const validatorId = "V-" + String(nextNumber).padStart(3, "0");

    const profile = await tx.validatorProfile.create({
      data: { userId: application.userId, validatorId, role: application.requestedRole },
    });

    await tx.schoolMembership.upsert({
      where: { schoolId_userId: { schoolId, userId: application.userId } },
      update: { active: true, role: application.requestedRole, endedAt: null, endReason: null },
      create: { schoolId, userId: application.userId, role: application.requestedRole },
    });

    await tx.validatorApplication.update({
      where: { id: application.id },
      data: { status: "APPROVED", reviewedById: reviewer.id, reviewedAt: new Date(), profileId: profile.id },
    });

    return { validatorId, role: application.requestedRole };
  });

  await recordAudit({
    schoolId,
    actorUserId: reviewer.id,
    action: "APPROVE",
    entity: "VALIDATOR_APPLICATION",
    entityId: application.id,
    details: { validatorId: result.validatorId, role: result.role, applicantUserId: application.userId },
  });

  return NextResponse.json({ ok: true, status: "APPROVED", ...result });
}
