import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getCurrentUser, getOwnerSession } from "@/lib/auth";

function isMobileUserAgent(userAgent: string) {
  return /android|iphone|ipad|ipod|mobile|windows phone|opera mini|blackberry/i.test(userAgent);
}

export async function requireOwner() {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") ?? "";

  if (isMobileUserAgent(userAgent)) {
    redirect("/owner/login");
  }

  const user = await getCurrentUser();
  const ownerSession = await getOwnerSession();
  const ownerEmail = process.env.SKULGO_OWNER_EMAIL?.trim().toLowerCase();

  if (
    !user ||
    !ownerSession ||
    ownerSession.userId !== user.id ||
    ownerSession.deviceId !== user.session.deviceId ||
    !ownerEmail ||
    user.email.toLowerCase() !== ownerEmail
  ) {
    redirect("/owner/login");
  }

  return user;
}
