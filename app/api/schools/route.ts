import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function clean(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const b = await request.json().catch(() => null);
  const name = clean(b?.name);
  const abbr = clean(b?.abbr).toUpperCase();
  const address = clean(b?.address);
  const phone = clean(b?.phone);
  const email = clean(b?.email).toLowerCase();

  if (!name || !abbr || !address || !phone || !email) {
    return NextResponse.json({ error: "All school fields are required" }, { status: 400 });
  }

  if (await db.school.findFirst({ where: { OR: [{ email }, { abbr }] } })) {
    return NextResponse.json({ error: "School email or abbreviation already exists" }, { status: 409 });
  }

  const school = await db.$transaction(async tx => {
    const s = await tx.school.create({ data: { name, abbr, address, phone, email } });

    await tx.schoolMembership.create({
      data: { schoolId: s.id, userId: user.id, role: "ADMIN" },
    });

    await tx.schoolSubscription.create({
      data: {
        schoolId: s.id,
        plan: "MONTHLY",
        status: "TRIAL",
      },
    });

    return s;
  });

  return NextResponse.json(
    { id: school.id, name: school.name, abbr: school.abbr, membershipId: await db.schoolMembership.findUnique({ where: { schoolId_userId: { schoolId: school.id, userId: user.id } }, select: { id: true } }).then(m => m?.id ?? null) },
    { status: 201 }
  );
}
