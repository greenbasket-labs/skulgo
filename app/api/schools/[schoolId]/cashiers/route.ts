import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;
  if (!user) return NextResponse.json({ error: "Login required" }, { status: 401 });

  const membership = await db.schoolMembership.findUnique({
    where: { schoolId_userId: { schoolId, userId: user.id } },
  });
  if (!membership || !membership.active) {
    return NextResponse.json({ error: "School access required" }, { status: 403 });
  }

  const cashiers = await db.schoolMembership.findMany({
    where: { schoolId, active: true, role: "CASHIER" },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });

  return NextResponse.json(cashiers.map(item => ({
    id: item.user.id,
    name: item.user.name,
    email: item.user.email,
    role: item.role,
  })));
}

export async function POST() {
  return NextResponse.json(
    { error: "Cashier accounts are created from personal SkulGo accounts and approved through the school application flow." },
    { status: 410 }
  );
}
