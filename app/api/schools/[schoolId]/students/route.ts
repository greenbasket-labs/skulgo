import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { makeStudentId } from "@/lib/ids";
import { hashPassword } from "@/lib/auth";

export async function GET(_: Request, { params }: { params: Promise<{ schoolId: string }> }) {
  const { schoolId } = await params;
  return NextResponse.json(await db.student.findMany({
    where: { schoolId }, include: { class: true, user: { select: { id: true, email: true } } },
    orderBy: { lastName: "asc" }
  }));
}

export async function POST() {
  return NextResponse.json(
    { error: "Student accounts are created from personal SkulGo accounts. Search for this school and send an admission request." },
    { status: 410 }
  );
}
