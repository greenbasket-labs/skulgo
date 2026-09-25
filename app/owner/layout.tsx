import Link from "next/link";
import { getCurrentUser, getOwnerSession } from "@/lib/auth";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const ownerSession = await getOwnerSession();

  if (!ownerSession) {
    return children;
  }

  const user = await getCurrentUser();

  if (!user || user.session.deviceId !== ownerSession.deviceId) {
    return children;
  }

  return (
    <main className="workspace">
      <aside className="workspace-sidebar">
        <div className="workspace-brand">SkulGo</div>
        <div className="workspace-school">
          <strong>Owner Dashboard</strong>
          <span>SkulGo control</span>
        </div>
        <nav className="workspace-nav">
          <Link href="/owner">Overview</Link>
          <Link href="/owner/schools">Schools</Link>
          <Link href="/owner/subscriptions">Subscriptions</Link>
          <Link href="/owner/payments">Payments</Link>
          <Link href="/owner/system">System</Link>
          <Link href="/owner/activity">Activity</Link>\n          <Link href="/owner/messages">Messages / Requests</Link>
        </nav>
        <div className="workspace-person">
          <strong>{user.name}</strong>
          <span>SkulGo Owner</span>
          <Link href="/dashboard">School workspace</Link>
        </div>
      </aside>
      <section className="workspace-main">{children}</section>
    </main>
  );
}
