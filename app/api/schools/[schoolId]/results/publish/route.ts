import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const body = await request.json().catch(() => null);
  const term = String(body?.term ?? "").trim();
  const studentId = body?.studentId ? String(body.studentId) : null;

  if (!term) return NextResponse.json({ error: "term is required" }, { status: 400 });

  const result = await db.result.updateMany({
    where: {
      schoolId,
      term,
      ...(studentId ? { studentId } : {}),
    },
    data: { published: true },
  });

  return NextResponse.json({ published: result.count });
}
