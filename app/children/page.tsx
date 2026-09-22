"use client";

import { useEffect, useState } from "react";

type Child = {
  id: string;
  admissionId: string;
  firstName: string;
  lastName: string;
  class?: { name: string; arm?: string | null; section?: { name: string } } | null;
};

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [message, setMessage] = useState("Loading…");

  useEffect(() => {
    fetch("/api/schools/current/children")
      .then(async response => {
        const data = await response.json().catch(() => []);
        if (!response.ok) throw new Error(data.error || "Could not load children");
        return data;
      })
      .then(data => {
        setChildren(data);
        setMessage(data.length ? "" : "No approved children are connected yet.");
      })
      .catch(error => setMessage(error.message));
  }, []);

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 800, margin: "0 auto" }}>
        <p className="muted">Parent workspace</p>
        <h1>My Children</h1>

        {!children.length && <p className="muted">{message}</p>}

        <div className="grid">
          {children.map(child => (
            <div className="card" key={child.id}>
              <strong>{child.firstName} {child.lastName}</strong>
              <p className="muted">Admission ID: {child.admissionId}</p>
              <p>
                {child.class?.section?.name ? child.class.section.name + " · " : ""}
                {child.class?.name || "Class not assigned"}
                {child.class?.arm ? " · " + child.class.arm : ""}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
