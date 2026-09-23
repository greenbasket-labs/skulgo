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

  const member = await adminMember(user.id, schoolId);
  if (!member?.active || member.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
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

  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Invalid payment provider" }, { status: 400 });
  }

  const row = await db.paymentProvider.upsert({
    where: { schoolId_provider: { schoolId, provider } },
    update: { enabled },
    create: { schoolId, provider, enabled },
  });

  return NextResponse.json(row);
}
