import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const user = await getCurrentUser();
  const { schoolId } = await params;

  if (!user?.membership || user.membership.schoolId !== schoolId) {
    return NextResponse.json({ error: "School access required" }, { status: 403 });
  }

  const teachers = await db.teacher.findMany({
    where: { user: { memberships: { some: { schoolId, active: true, role: "TEACHER" } } } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          memberships: { where: { schoolId, active: true, role: "TEACHER" }, select: { id: true } },
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  });

  return NextResponse.json(teachers.map(teacher => ({
    ...teacher,
    membershipId: teacher.user.memberships[0]?.id ?? null,
    user: { id: teacher.user.id, name: teacher.user.name, email: teacher.user.email },
  })));
}

export async function POST() {
  return NextResponse.json(
    { error: "Teacher accounts are created from personal SkulGo accounts. Search for this school and send a job request." },
    { status: 410 }
  );
}
