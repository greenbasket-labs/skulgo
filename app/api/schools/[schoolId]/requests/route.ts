import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;

  if (!user?.membership || user.membership.schoolId !== schoolId || user.membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  return NextResponse.json(await db.schoolRequest.findMany({
    where: { schoolId, status: "PENDING" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      class: {
        select: {
          id: true,
          name: true,
          arm: true,
          section: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  }));
}
