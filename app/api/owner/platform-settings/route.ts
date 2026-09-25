import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/owner";

const defaults = {
  monthlyEnabled: "true",
  monthlyPrice: "0",
  termEnabled: "true",
  termPrice: "0",
  yearlyEnabled: "true",
  yearlyPrice: "0",
  trialEnabled: "true",
  trialDays: "14",
  resultUnlockEnabled: "true",
  resultUnlockFee: "200",
};

export async function GET() {
  await requireOwner();
  const rows = await db.platformSetting.findMany();
  const settings = { ...defaults, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) };
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  await requireOwner();
  const body = await request.json().catch(() => null);

  const booleanKeys = ["monthlyEnabled","termEnabled","yearlyEnabled","trialEnabled","resultUnlockEnabled"] as const;
  const numberKeys = ["monthlyPrice","termPrice","yearlyPrice","trialDays","resultUnlockFee"] as const;

  for (const key of booleanKeys) {
    if (typeof body?.[key] !== "boolean") {
      return NextResponse.json({ error: \`Invalid \${key}.\` }, { status: 400 });
    }
  }

  for (const key of numberKeys) {
    const value = Number(body?.[key]);
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      return NextResponse.json({ error: \`Invalid \${key}.\` }, { status: 400 });
    }
  }

  const values = {
    monthlyEnabled: String(body.monthlyEnabled),
    monthlyPrice: String(body.monthlyPrice),
    termEnabled: String(body.termEnabled),
    termPrice: String(body.termPrice),
    yearlyEnabled: String(body.yearlyEnabled),
    yearlyPrice: String(body.yearlyPrice),
    trialEnabled: String(body.trialEnabled),
    trialDays: String(body.trialDays),
    resultUnlockEnabled: String(body.resultUnlockEnabled),
    resultUnlockFee: String(body.resultUnlockFee),
  };

  await db.$transaction(
    Object.entries(values).map(([key, value]) =>
      db.platformSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  return NextResponse.json({ ok: true, settings: values });
}
