import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getValidationSchoolId, isValidatorRole } from "@/lib/validators";

export async function GET() {
  const user = await getCurrentUser();
  const schoolId = getValidationSchoolId();
  if (!user?.membership || user.membership.schoolId !== schoolId || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Validation school admin access required" }, { status: 403 });
  }

  const applications = await db.validatorApplication.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { id: true, name: true, email: true, referralCode: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(applications);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  if (!getValidationSchoolId()) return NextResponse.json({ error: "Validation school is not configured." }, { status: 503 });

  const body = await request.json().catch(() => null);
  const requestedRole = typeof body?.requestedRole === "string" ? body.requestedRole.toUpperCase() : "";
  const schoolExperience = typeof body?.schoolExperience === "string" ? body.schoolExperience.trim() : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  if (!isValidatorRole(requestedRole)) return NextResponse.json({ error: "Choose a valid validator role." }, { status: 400 });
  if (!schoolExperience) return NextResponse.json({ error: "Tell us about your real school experience or relationship." }, { status: 400 });
  if (!reason) return NextResponse.json({ error: "Tell us why you want to validate SkulGo." }, { status: 400 });

  const existing = await db.validatorProfile.findUnique({ where: { userId: user.id } });
  if (existing) return NextResponse.json({ error: "You are already a SkulGo Validator." }, { status: 409 });

  const pending = await db.validatorApplication.findFirst({ where: { userId: user.id, status: "PENDING" } });
  if (pending) return NextResponse.json({ error: "You already have a validator application under review." }, { status: 409 });

  const application = await db.validatorApplication.create({
    data: { userId: user.id, requestedRole, schoolExperience, reason },
  });
  return NextResponse.json({ ok: true, applicationId: application.id, status: application.status }, { status: 201 });
}
