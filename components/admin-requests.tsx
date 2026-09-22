"use client";

import { useEffect, useState } from "react";

type RequestItem = {
  id: string;
  type: "JOB" | "ADMISSION";
  requestedRole: string;
  classId?: string | null;
  user: { name: string; email: string };
};

export default function AdminRequests({ schoolId }: { schoolId: string }) {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const r = await fetch(`/api/schools/${schoolId}/requests`);
    const data = await r.json();
    setItems(r.ok ? data : []);
  }

  useEffect(() => { load(); }, [schoolId]);

  async function review(id: string, action: "APPROVE" | "REJECT") {
    setMessage("");
    const r = await fetch(`/api/schools/${schoolId}/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMessage(data.error || "Could not update request");
      return;
    }
    setItems(items.filter(x => x.id !== id));
    setMessage(action === "APPROVE" ? "Request approved." : "Request rejected.");
  }

  return (
    <div className="card">
      <p className="muted">Admin</p>
      <h2>Pending requests</h2>
      {!items.length && <p className="muted">No pending requests.</p>}
      <div className="grid">
        {items.map(item => (
          <div key={item.id} className="card">
            <strong>{item.user.name}</strong>
            <p className="muted">{item.user.email}</p>
            <p>{item.type === "JOB" ? "Teacher job request" : "Student admission request"}</p>
            <div className="grid grid-2">
              <button className="button" onClick={() => review(item.id, "APPROVE")}>Approve</button>
              <button className="button" onClick={() => review(item.id, "REJECT")}>Reject</button>
            </div>
          </div>
        ))}
      </div>
      {message && <p>{message}</p>}
    </div>
  );
}
