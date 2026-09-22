import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, setSession } from "@/lib/auth";

function clean(value: unknown) { return typeof value === "string" ? value.trim() : ""; }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const name = clean(body.name), abbr = clean(body.abbr).toUpperCase();
  const address = clean(body.address), phone = clean(body.phone), email = clean(body.email).toLowerCase();
  const adminName = clean(body.adminName), adminEmail = clean(body.adminEmail).toLowerCase(), password = clean(body.password);

  if (!name || !abbr || !address || !phone || !email || !adminName || !adminEmail || !password)
    return NextResponse.json({ error: "All registration fields are required" }, { status: 400 });

  const exists = await db.school.findFirst({ where: { OR: [{ email }, { abbr }] } });
  if (exists) return NextResponse.json({ error: "School email or abbreviation already exists" }, { status: 409 });

  const passwordHash = hashPassword(password);
  const school = await db.$transaction(async tx => {
    const created = await tx.school.create({ data: { name, abbr, address, phone, email } });
    const admin = await tx.user.create({ data: { schoolId: created.id, name: adminName, email: adminEmail, passwordHash, role: "ADMIN" } });
    const sectionNames = ["Nursery", "Primary", "Junior Secondary", "Senior Secondary"];
    await tx.section.createMany({ data: sectionNames.map(name => ({ schoolId: created.id, name })) });
    return { created, admin };
  });

  const response = NextResponse.json({ id: school.created.id, name: school.created.name, abbr: school.created.abbr }, { status: 201 });
  setSession(response, school.admin);
  return response;
}
