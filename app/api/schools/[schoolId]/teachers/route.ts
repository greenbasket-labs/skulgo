import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { makeTeacherId } from "@/lib/ids";
import { randomBytes, scryptSync } from "node:crypto";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  const teachers = await db.teacher.findMany({
    where: { user: { schoolId } },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return NextResponse.json(teachers);
}

export async function POST() {
  return NextResponse.json(
    { error: "Teacher accounts are created from personal SkulGo accounts. Search for this school and send a job request." },
    { status: 410 }
  );
}
