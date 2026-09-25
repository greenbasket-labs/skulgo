import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export async function requireOwner() {
  const user = await getCurrentUser();
  const ownerEmail = process.env.SKULGO_OWNER_EMAIL?.trim().toLowerCase();

  if (!user || !ownerEmail || user.email.toLowerCase() !== ownerEmail) {
    redirect("/owner/login");
  }

  return user;
}
