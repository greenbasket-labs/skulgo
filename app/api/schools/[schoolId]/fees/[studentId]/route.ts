import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ schoolId: string; studentId: string }> }
) {
  const { schoolId, studentId } = await params;

  const fee = await db.feeRecord.findFirst({
    where: { schoolId, studentId },
    include: {
      student: { select: { id: true, admissionId: true, firstName: true, lastName: true } },
    },
  });

  if (!fee) return NextResponse.json({ error: "Fee record not found" }, { status: 404 });

  const payments = await db.payment.findMany({
    where: { schoolId, studentId },
    orderBy: { paidAt: "desc" },
  });

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return NextResponse.json({
    fee,
    payments,
    totalPaid,
    balance: fee.totalFee - totalPaid,
  });
}
