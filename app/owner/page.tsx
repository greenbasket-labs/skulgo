import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";
import OwnerLogin from "./login/page";

export default async function OwnerEntry() {
  const ownerSession = await getOwnerSession();

  if (!ownerSession) {
    return <OwnerLogin />;
  }

  return <OwnerOverview />;
}

async function OwnerOverview() {
  const { default: Overview } = await import("./overview/page");
  return <Overview />;
}
