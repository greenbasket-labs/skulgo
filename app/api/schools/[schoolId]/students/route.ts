import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  const user = await getCurrentUser();

  if (!user?.membership || user.membership.schoolId !== schoolId) {
    return NextResponse.json({ error: "School access required" }, { status: 403 });
  }

  const role = user.membership.role;

  if (role === "STUDENT") {
    if (!user.student?.id) return NextResponse.json([]);
    return NextResponse.json(await db.student.findMany({
      where: { id: user.student.id, schoolId },
      include: { class: true, user: { select: { id: true, email: true } } },
    }));
  }

  if (role === "PARENT") {
    if (!user.parent?.id) return NextResponse.json([]);
    return NextResponse.json(await db.student.findMany({
      where: {
        schoolId,
        parentLinks: { some: { parentId: user.parent.id, approved: true } },
      },
      include: { class: true, user: { select: { id: true, email: true } } },
      orderBy: { lastName: "asc" },
    }));
  }

  if (role === "TEACHER") {
    const teacher = await db.teacher.findUnique({
      where: { userId: user.id },
      select: { id: true, approved: true },
    });
    if (!teacher?.approved) return NextResponse.json([]);

    return NextResponse.json(await db.student.findMany({
      where: {
        schoolId,
        class: {
          assignments: {
            some: { teacherId: teacher.id },
          },
        },
      },
      include: { class: true, user: { select: { id: true, email: true } } },
      orderBy: { lastName: "asc" },
    }));
  }

  return NextResponse.json(await db.student.findMany({
    where: { schoolId },
    include: { class: true, user: { select: { id: true, email: true } } },
    orderBy: { lastName: "asc" },
  }));
}

export async function POST() {
  return NextResponse.json(
    { error: "Student accounts are created from personal SkulGo accounts. Search for this school and send an admission request." },
    { status: 410 }
  );
}
