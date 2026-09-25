import { randomBytes } from "node:crypto";

export function referralLevel(referralCount: number) {
  if (referralCount >= 100) return "Champion";
  if (referralCount >= 50) return "Ambassador";
  if (referralCount >= 20) return "Builder";
  if (referralCount >= 10) return "Connector";
  return "Member";
}

export function createReferralCode(foundingNumber: number | null) {
  if (foundingNumber !== null) {
    return `SKG100-${String(foundingNumber).padStart(3, "0")}`;
  }
  return `SKG-${randomBytes(4).toString("hex").toUpperCase()}`;
}
