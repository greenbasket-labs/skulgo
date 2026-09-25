import { getOwnerSession } from "@/lib/auth";
import OwnerLogin from "./login/page";
import OwnerOverview from "./overview/page";

export default async function OwnerEntry() {
  const ownerSession = await getOwnerSession();

  if (!ownerSession) {
    return <OwnerLogin />;
  }

  return <OwnerOverview />;
}
