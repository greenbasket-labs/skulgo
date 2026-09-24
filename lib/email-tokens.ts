import { createHash, randomBytes, randomInt } from "node:crypto";

export function createRawToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createOtp() {
  return String(randomInt(100000, 1000000));
}
