import { randomBytes } from "node:crypto";

export function referralLevel(referralCount: number) {
  if (referralCount >= 100) return "Champion";
  if (referralCount >= 50) return "Ambassador";
  if (referralCount >= 20) return "Builder";
  if (referralCount >= 10) return "Connector";
  return "Member";
}

export function createReferralCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += alphabet[randomBytes(1)[0] % alphabet.length];
  }
  return `SKG${suffix}`;
}
