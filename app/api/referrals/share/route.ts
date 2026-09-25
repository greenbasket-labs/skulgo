import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildReferralLink, buildReferralPilotMessage } from "@/lib/referral-message";

export async function GET() {
  const user = await getCurrentUser();

  if (!user?.referralCode) {
    return NextResponse.json({ error: "Referral ID is not available" }, { status: 404 });
  }

  return NextResponse.json({
    referralCode: user.referralCode,
    referralLink: buildReferralLink(user.referralCode),
    message: buildReferralPilotMessage(user.referralCode),
  });
}
