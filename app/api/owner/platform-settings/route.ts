import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/owner";

const defaults = {
  basicEnabled: "true",
  basicPrice: "5000",
  starterEnabled: "true",
  starterPrice: "10000",
  proEnabled: "true",
  proPrice: "20000",
  premiumEnabled: "true",
  premiumPrice: "28000",
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

  const booleanKeys = ["basicEnabled","starterEnabled","proEnabled","premiumEnabled","trialEnabled","resultUnlockEnabled"] as const;
  const numberKeys = ["basicPrice","starterPrice","proPrice","premiumPrice","trialDays","resultUnlockFee"] as const;

  for (const key of booleanKeys) {
    if (typeof body?.[key] !== "boolean") {
      return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
    }
  }

  for (const key of numberKeys) {
    const value = Number(body?.[key]);
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      return NextResponse.json({ error: `Invalid ${key}.` }, { status: 400 });
    }
  }

  const values = {
    basicEnabled: String(body.basicEnabled),
    basicPrice: String(body.basicPrice),
    starterEnabled: String(body.starterEnabled),
    starterPrice: String(body.starterPrice),
    proEnabled: String(body.proEnabled),
    proPrice: String(body.proPrice),
    premiumEnabled: String(body.premiumEnabled),
    premiumPrice: String(body.premiumPrice),
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
