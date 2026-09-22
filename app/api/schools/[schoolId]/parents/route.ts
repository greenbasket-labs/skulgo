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

  const parents = await db.parent.findMany({
    where: {
      user: {
        memberships: { some: { schoolId, active: true, role: "PARENT" } },
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      links: {
        include: {
          student: {
            select: { id: true, admissionId: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  return NextResponse.json(parents);
}

export async function POST() {
  return NextResponse.json(
    { error: "Parent accounts and child links are created from personal SkulGo accounts and approved through the school application flow." },
    { status: 410 }
  );
}
