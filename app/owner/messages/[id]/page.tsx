import { requireOwner } from "@/lib/owner";
import { db } from "@/lib/db";
import SupportReply from "./reply";

export default async function OwnerMessage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params;
  const thread = await db.supportThread.findUnique({
    where: { id },
    include: {
      school: { select: { name: true, abbr: true } },
      createdBy: { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } },
    },
  });
  if (!thread) return <div className="card"><p>Support request not found.</p></div>;

  return (
    <>
      <div className="workspace-header">
        <div><p className="muted">{thread.school.name} · {thread.createdBy.email}</p><h1>{thread.subject}</h1></div>
      </div>
      <div className="grid">
        {thread.messages.map(message => (
          <div className="card" key={message.id}>
            <strong>{message.sender.name}</strong>
            <p>{message.body}</p>
            <small className="muted">{message.createdAt.toLocaleString("en-NG")}</small>
          </div>
        ))}
      </div>
      <SupportReply threadId={thread.id} />
    </>
  );
}
