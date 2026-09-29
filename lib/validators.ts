import { db } from "@/lib/db";

export const VALIDATOR_ROLES = ["ADMIN", "TEACHER", "STUDENT", "PARENT", "CASHIER"] as const;
export type ValidatorRole = typeof VALIDATOR_ROLES[number];

export function getValidationSchoolId() {
  return process.env.VALIDATION_SCHOOL_ID?.trim() || "";
}

export function isValidatorRole(value: unknown): value is ValidatorRole {
  return typeof value === "string" && (VALIDATOR_ROLES as readonly string[]).includes(value);
}
