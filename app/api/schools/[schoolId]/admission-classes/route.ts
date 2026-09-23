import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;

  const school = await db.school.findUnique({
    where: { id: schoolId },
    select: { id: true },
  });

  if (!school) {
    return NextResponse.json({ error: "School not found" }, { status: 404 });
  }

  const classes = await db.schoolClass.findMany({
    where: { schoolId },
    select: {
      id: true,
      name: true,
      arm: true,
      section: { select: { name: true } },
    },
    orderBy: [{ name: "asc" }, { arm: "asc" }],
  });

  return NextResponse.json(classes);
}
