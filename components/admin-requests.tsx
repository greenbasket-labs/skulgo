"use client";

import { useEffect, useState } from "react";

type SchoolClass = { id: string; name: string; arm?: string | null; section?: { name: string } };
type RequestItem = {
  id: string;
  type: "JOB" | "ADMISSION";
  requestedRole: string;
  classId?: string | null;
  class?: SchoolClass | null;
  user: { name: string; email: string };
};

export default function AdminRequests({ schoolId }: { schoolId: string }) {
  const [items, setItems] = useState<RequestItem[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [message, setMessage] = useState("");

  async function load() {
    const [requests, classResponse] = await Promise.all([
      fetch(`/api/schools/${schoolId}/requests`),
      fetch(`/api/schools/${schoolId}/classes`),
    ]);
    const data = await requests.json();
    const classData = await classResponse.json();
    setItems(requests.ok ? data : []);
    setClasses(classResponse.ok ? classData : []);
  }

  useEffect(() => { load(); }, [schoolId]);

  async function review(item: RequestItem, action: "APPROVE" | "REJECT") {
    setMessage("");
    const classId = item.type === "ADMISSION"
      ? (document.getElementById(`class-${item.id}`) as HTMLSelectElement)?.value
      : undefined;

    const r = await fetch(`/api/schools/${schoolId}/requests/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...(classId ? { classId } : {}) }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMessage(data.error || "Could not update request");
      return;
    }
    setItems(current => current.filter(x => x.id !== item.id));
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

            {item.type === "ADMISSION" && (
              <select id={`class-${item.id}`} defaultValue={item.classId || ""}>
                <option value="">Choose class</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.section?.name ? c.section.name + " · " : ""}{c.name}{c.arm ? " · " + c.arm : ""}
                  </option>
                ))}
              </select>
            )}

            <div className="grid grid-2" style={{ marginTop: 10 }}>
              <button className="button" onClick={() => review(item, "APPROVE")}>Approve</button>
              <button className="button" onClick={() => review(item, "REJECT")}>Reject</button>
            </div>
          </div>
        ))}
      </div>
      {message && <p>{message}</p>}
    </div>
  );
}
