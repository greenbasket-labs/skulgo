import { notFound } from "next/navigation";
import { Suspense } from "react";
import { db } from "@/lib/db";
import ResultCheckerCallback from "./callback";

export default async function CallbackPage() {
  const setting = await db.platformSetting.findUnique({ where: { key: "resultCheckerEnabled" } });
  if (setting?.value !== "true") notFound();
  return <Suspense fallback={<main className="workspace-main"><div className="card"><p className="muted">Verifying payment…</p></div></main>}><ResultCheckerCallback /></Suspense>;
}
