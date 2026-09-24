import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const PROVIDERS = ["PAYSTACK", "FLUTTERWAVE", "MONIEPOINT"] as const;
type Provider = typeof PROVIDERS[number];

async function adminMember(userId: string, schoolId: string) {
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

  const member = await db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId: user.id } },
  });
  if (!member?.active) {
    return NextResponse.json({ error: "School access required" }, { status: 403 });
  }

  const rows = await db.paymentProvider.findMany({
    where: { schoolId },
    orderBy: { provider: "asc" },
  });

  return NextResponse.json(
    PROVIDERS.map(provider => rows.find(row => row.provider === provider) ?? {
      provider,
      enabled: false,
    })
  );
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const member = await adminMember(user.id, schoolId);
  if (!member?.active || member.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const provider = String(body?.provider ?? "") as Provider;
  const enabled = body?.enabled === true;
  const accountName = typeof body?.accountName === "string" ? body.accountName.trim() : "";
  const accountNumberLast4 = typeof body?.accountNumberLast4 === "string" ? body.accountNumberLast4.replace(/\D/g, "").slice(-4) : "";
  const merchantReference = typeof body?.merchantReference === "string" ? body.merchantReference.trim() : "";

  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Invalid payment provider" }, { status: 400 });
  }

  if (enabled) {
    const school = await db.school.findUnique({
      where: { id: schoolId },
      select: { name: true, email: true },
    });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    if (!accountName) {
      return NextResponse.json({ error: "Verify the provider account before enabling payments" }, { status: 400 });
    }

    const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedSchool = normalizeName(school.name);
    const normalizedAccount = normalizeName(accountName);
    const exactMatch = normalizedSchool === normalizedAccount;
    if (!exactMatch) {
      return NextResponse.json({ error: "Provider account name does not exactly match the school name" }, { status: 400 });
    }

    if (!accountNumberLast4 && !merchantReference) {
      return NextResponse.json({ error: "A verified account reference is required" }, { status: 400 });
    }
  }

  const row = await db.paymentProvider.upsert({
    where: { schoolId_provider: { schoolId, provider } },
    update: {
      enabled,
      ...(accountName ? {
        accountName,
        accountNumberLast4: accountNumberLast4 || null,
        merchantReference: merchantReference || null,
        status: "VERIFIED",
        verifiedAt: new Date(),
      } : {}),
      ...(enabled ? {} : { status: "DISABLED" }),
    },
    create: {
      schoolId,
      provider,
      enabled,
      accountName: accountName || null,
      accountNumberLast4: accountNumberLast4 || null,
      merchantReference: merchantReference || null,
      status: enabled ? "VERIFIED" : "DISABLED",
      verifiedAt: enabled ? new Date() : null,
    },
  });

  return NextResponse.json({
    id: row.id,
    provider: row.provider,
    enabled: row.enabled,
    status: row.status,
    accountName: row.accountName,
    accountNumberLast4: row.accountNumberLast4,
    merchantReference: row.merchantReference,
    verifiedAt: row.verifiedAt,
  });
}
