import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ResultCheckerCallback from "./callback";

export default async function CallbackPage() {
  const setting = await db.platformSetting.findUnique({ where: { key: "resultCheckerEnabled" } });
  if (setting?.value !== "true") notFound();
  return <ResultCheckerCallback />;
}
