import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const u = await getCurrentUser();
  const { schoolId } = await params;
  if (!u || u.schoolId !== schoolId || u.role !== "ADMIN") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  return NextResponse.json(await db.schoolRequest.findMany({
    where: { schoolId, status: "PENDING" },
    include: { user: { select: { id: true, name: true, email: true } }, class: { select: { id: true, name: true, arm: true, section: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
  }));
}
