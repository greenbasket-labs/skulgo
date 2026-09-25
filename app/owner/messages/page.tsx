import Link from "next/link";
import { requireOwner } from "@/lib/owner";
import { db } from "@/lib/db";

export default async function OwnerMessages() {
  await requireOwner();
  const threads = await db.supportThread.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      school: { select: { name: true, abbr: true } },
      createdBy: { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return (
    <>
      <div className="workspace-header">
        <div><p className="muted">SkulGo support</p><h1>Messages / Requests</h1></div>
      </div>
      {!threads.length ? <div className="card"><p className="muted">No support requests yet.</p></div> : (
        <div className="grid">
          {threads.map(thread => (
            <Link key={thread.id} href={`/owner/messages/${thread.id}`} className="card">
              <strong>{thread.subject}</strong>
              <p className="muted">{thread.school.name} · {thread.createdBy.name}</p>
              <p>{thread.messages[0]?.body}</p>
              <small>{thread.status} · {thread.updatedAt.toLocaleString("en-NG")}</small>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
