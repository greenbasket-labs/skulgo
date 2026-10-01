import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptProviderSecret } from "@/lib/payment-provider-secrets";
import { getCurrentUser } from "@/lib/auth";

const PROVIDERS = ["PAYSTACK", "FLUTTERWAVE", "MONIEPOINT"] as const;
type Provider = typeof PROVIDERS[number];

async function adminMember(userId: string, schoolId: string) {
  return db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId } },
  });
}

function publicProvider(row: any) {
  return {
    id: row.id,
    provider: row.provider,
    enabled: row.enabled,
    status: row.status,
    accountName: row.accountName,
    accountNumberLast4: row.accountNumberLast4,
    merchantReference: row.merchantReference,
    verifiedAt: row.verifiedAt,
    credentialsConfigured: Boolean(row.secretKeyEncrypted || row.apiKeyEncrypted || row.contractCodeEncrypted),
  };
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
  if (!member?.active) return NextResponse.json({ error: "School access required" }, { status: 403 });

  const rows = await db.paymentProvider.findMany({ where: { schoolId }, orderBy: { provider: "asc" } });
  return NextResponse.json(PROVIDERS.map(provider => publicProvider(
    rows.find(row => row.provider === provider) ?? { provider, enabled: false }
  )));
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
  const accountNumberLast4 = typeof body?.accountNumberLast4 === "string"
    ? body.accountNumberLast4.replace(/\D/g, "").slice(-4)
    : "";
  const merchantReference = typeof body?.merchantReference === "string" ? body.merchantReference.trim() : "";

  const secretKey = typeof body?.secretKey === "string" ? body.secretKey.trim() : "";
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  const contractCode = typeof body?.contractCode === "string" ? body.contractCode.trim() : "";
  const webhookSecret = typeof body?.webhookSecret === "string" ? body.webhookSecret.trim() : "";

  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Invalid payment provider" }, { status: 400 });
  }

  const school = await db.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

  if (enabled) {
    if (!accountName) return NextResponse.json({ error: "Enter the payment account name." }, { status: 400 });

    const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalizeName(school.name) !== normalizeName(accountName)) {
      return NextResponse.json({ error: "Payment account name must match the school name." }, { status: 400 });
    }

    if (!accountNumberLast4 && !merchantReference) {
      return NextResponse.json({ error: "Enter an account number last 4 digits or merchant reference." }, { status: 400 });
    }
  }

  const existing = await db.paymentProvider.findUnique({
    where: { schoolId_provider: { schoolId, provider } },
  });

  const secretChanged = Boolean(secretKey);
  const apiKeyChanged = Boolean(apiKey);
  const contractChanged = Boolean(contractCode);
  const webhookChanged = Boolean(webhookSecret);

  const credentialsRequired =
    provider === "PAYSTACK" ? !secretKey && !existing?.secretKeyEncrypted :
    provider === "FLUTTERWAVE" ? !secretKey && !existing?.secretKeyEncrypted :
    (!apiKey && !existing?.apiKeyEncrypted) || (!secretKey && !existing?.secretKeyEncrypted) || (!contractCode && !existing?.contractCodeEncrypted);

  if (enabled && credentialsRequired) {
    return NextResponse.json({
      error: provider === "MONIEPOINT"
        ? "Enter the school's Moniepoint/Monnify API key, secret key and contract code."
        : `Enter the school's ${provider === "PAYSTACK" ? "Paystack" : "Flutterwave"} secret key.`,
    }, { status: 400 });
  }

  const row = await db.paymentProvider.upsert({
    where: { schoolId_provider: { schoolId, provider } },
    update: {
      enabled,
      ...(accountName ? { accountName } : {}),
      ...(accountNumberLast4 || merchantReference ? {
        accountNumberLast4: accountNumberLast4 || null,
        merchantReference: merchantReference || null,
      } : {}),
      ...(secretChanged ? { secretKeyEncrypted: encryptProviderSecret(secretKey) } : {}),
      ...(apiKeyChanged ? { apiKeyEncrypted: encryptProviderSecret(apiKey) } : {}),
      ...(contractChanged ? { contractCodeEncrypted: encryptProviderSecret(contractCode) } : {}),
      ...(webhookChanged ? { webhookSecretEncrypted: encryptProviderSecret(webhookSecret) } : {}),
      status: enabled ? "VERIFIED" : "DISABLED",
      verifiedAt: enabled ? new Date() : null,
    },
    create: {
      schoolId,
      provider,
      enabled,
      accountName: accountName || null,
      accountNumberLast4: accountNumberLast4 || null,
      merchantReference: merchantReference || null,
      secretKeyEncrypted: secretKey ? encryptProviderSecret(secretKey) : null,
      apiKeyEncrypted: apiKey ? encryptProviderSecret(apiKey) : null,
      contractCodeEncrypted: contractCode ? encryptProviderSecret(contractCode) : null,
      webhookSecretEncrypted: webhookSecret ? encryptProviderSecret(webhookSecret) : null,
      status: enabled ? "VERIFIED" : "DISABLED",
      verifiedAt: enabled ? new Date() : null,
    },
  });

  return NextResponse.json(publicProvider(row));
}
