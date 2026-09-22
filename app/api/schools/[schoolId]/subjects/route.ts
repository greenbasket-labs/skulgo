import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function schoolAccess(userId: string, schoolId: string) {
  return db.schoolMembership.findFirst({
    where: { userId, schoolId, active: true },
    select: { role: true },
  });
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const membership = await schoolAccess(user.id, schoolId);
  if (!membership) return NextResponse.json({ error: "School access required" }, { status: 403 });

  return NextResponse.json(await db.subject.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
  }));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const membership = await schoolAccess(user.id, schoolId);
  if (!membership || membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Subject name is required" }, { status: 400 });

  try {
    return NextResponse.json(
      await db.subject.create({ data: { schoolId, name } }),
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "This subject already exists" }, { status: 409 });
  }
}
