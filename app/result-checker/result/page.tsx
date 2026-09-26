import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import ResultAccessView from "./result-access-view";

export default async function ResultPage() {
  const setting = await db.platformSetting.findUnique({ where: { key: "resultCheckerEnabled" } });
  if (setting?.value !== "true") notFound();
  return <Suspense fallback={<main className="workspace-main"><div className="card"><p className="muted">Loading result…</p></div></main>}><ResultAccessView /></Suspense>;
}
