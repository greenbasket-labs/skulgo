import { requireOwner } from "@/lib/owner";
import { db } from "@/lib/db";

export default async function OwnerUsers() {
  await requireOwner();
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
      createdAt: true,
    },
  });

  return (
    <>
      <div className="workspace-header">
        <div>
          <p className="muted">SkulGo Owner</p>
          <h1>Users</h1>
          <p>Basic information about personal SkulGo accounts.</p>
        </div>
      </div>
      <div className="grid">
        {!users.length ? (
          <div className="card"><p className="muted">No users yet.</p></div>
        ) : users.map(user => (
          <div className="card" key={user.id}>
            <strong>{user.name}</strong>
            <p className="muted">{user.email}</p>
            <p className="muted">
              Email: {user.emailVerifiedAt ? "Verified" : "Not verified"} ·
              Created: {user.createdAt.toLocaleDateString("en-NG")}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
