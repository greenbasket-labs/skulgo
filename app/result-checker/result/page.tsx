import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import ResultAccessView from "./result-access-view";

export default async function ResultPage() {
  const setting = await db.platformSetting.findUnique({ where: { key: "resultCheckerEnabled" } });
  if (setting?.value !== "true") notFound();
  return <ResultAccessView />;
}
