import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ResultChecker from "./result-checker";

export default async function ResultCheckerPage() {
  const setting = await db.platformSetting.findUnique({ where: { key: "resultCheckerEnabled" } });
  if (setting?.value !== "true") notFound();

  return <ResultChecker />;
}
