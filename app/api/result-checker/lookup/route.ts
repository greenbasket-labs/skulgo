import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveResultCheckerAccess, resultCheckerEnabled } from "@/lib/result-checker";

export async function POST(request: Request) {
  if (!(await resultCheckerEnabled())) {
    return NextResponse.json({ error: "Result Checker is not available." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const access = await resolveResultCheckerAccess(String(body?.id ?? ""), String(body?.pin ?? ""));
  if (!access) return NextResponse.json({ error: "Invalid ID or PIN." }, { status: 401 });

  const published = await db.result.findMany({
    where: { schoolId: access.schoolId, studentId: { in: access.studentIds }, published: true },
    select: { studentId: true },
    distinct: ["studentId"],
  });

  const children = access.children.filter(child => published.some(item => item.studentId === child.id));
  const feeSetting = await db.platformSetting.findUnique({ where: { key: "resultUnlockFee" } });
  const feePerChild = Math.max(0, Number(feeSetting?.value ?? 200));

  return NextResponse.json({
    school: access.schoolName,
    children,
    feePerChild,
    availableChildCount: children.length,
  });
}
