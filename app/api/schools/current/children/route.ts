import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "PARENT") {
    return NextResponse.json({ error: "Parent workspace required" }, { status: 403 });
  }

  const parent = await db.parent.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!parent) return NextResponse.json({ error: "Parent profile not found" }, { status: 404 });

  const membership = await db.schoolMembership.findUnique({ where: { id: user.membership.id }, select: { workspaceCode: true } });
  const checkerSetting = await db.platformSetting.findUnique({ where: { key: "resultCheckerEnabled" } });

  const links = await db.parentStudent.findMany({
    where: {
      parentId: parent.id,
      approved: true,
      student: { schoolId: user.membership.schoolId },
    },
    include: {
      student: {
        select: {
          id: true,
          admissionId: true,
          firstName: true,
          lastName: true,
          class: { select: { id: true, name: true, arm: true, section: { select: { name: true } } } },
        },
      },
    },
    orderBy: { student: { lastName: "asc" } },
  });

  return NextResponse.json({ children: links.map(link => link.student), resultCheckerEnabled: checkerSetting?.value === "true", resultCheckerId: checkerSetting?.value === "true" ? membership?.workspaceCode ?? null : null });
}
