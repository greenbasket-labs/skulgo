import { createHash, randomBytes } from "node:crypto";

export function createRawToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
