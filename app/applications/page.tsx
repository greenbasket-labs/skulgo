"use client";

import { useEffect, useState } from "react";

type Request = {
  id: string;
  type: "JOB" | "ADMISSION";
  requestedRole: "TEACHER" | "STUDENT" | "PARENT" | "CASHIER";
  createdAt: string;
  applicationDetails: string | null;
  user: { id: string; name: string; email: string };
  class: { id: string; name: string; arm: string | null; section: { name: string } } | null;
};

type SchoolClass = {
  id: string;
  name: string;
  arm: string | null;
  section: { name: string };
};

export default function ApplicationsPage() {
  const [schoolId, setSchoolId] = useState("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [classChoice, setClassChoice] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("Loading...");
  const [busy, setBusy] = useState("");

  async function load() {
    try {
      const me = await fetch("/api/auth/me");
      const meData = await me.json().catch(() => ({}));
      const id = meData?.user?.membership?.schoolId;

      if (!me.ok || !id || meData?.user?.membership?.role !== "ADMIN") {
        setMessage("Admin access required.");
        return;
      }

      setSchoolId(id);

      const [requestResponse, classResponse] = await Promise.all([
        fetch(`/api/schools/${id}/requests`),
        fetch(`/api/schools/${id}/classes`),
      ]);

      const requestData = await requestResponse.json().catch(() => []);
      const classData = await classResponse.json().catch(() => []);

      if (!requestResponse.ok) throw new Error(requestData?.error || "Unable to load applications.");
      if (!classResponse.ok) throw new Error(classData?.error || "Unable to load classes.");

      setRequests(Array.isArray(requestData) ? requestData : []);
      setClasses(Array.isArray(classData) ? classData : []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load applications.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(request: Request, action: "APPROVE" | "REJECT") {
    const selectedClassId =
      action === "APPROVE" && request.requestedRole === "STUDENT"
        ? classChoice[request.id] || request.class?.id || ""
        : "";

    if (action === "APPROVE" && request.requestedRole === "STUDENT" && !selectedClassId) {
      setMessage("Choose a class before approving this student.");
      return;
    }

    setBusy(request.id);
    setMessage("");

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/requests/${request.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            ...(selectedClassId ? { classId: selectedClassId } : {}),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || "Request could not be reviewed.");

      setMessage(
        action === "APPROVE"
          ? `${request.user.name} approved.`
          : `${request.user.name} rejected.`
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request could not be reviewed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">Admin</p>
        <h1>Applications</h1>
        <p>Review student, staff and parent requests for this school.</p>
      </div>

      {message && <p role="status" className="muted">{message}</p>}

      {!requests.length && !message.includes("Loading") ? (
        <div className="card">
          <strong>No pending applications.</strong>
          <p className="muted">New school requests will appear here.</p>
        </div>
      ) : (
        <div className="grid">
          {requests.map(request => {
            let details: Record<string, string> = {};
            try {
              details = request.applicationDetails
                ? JSON.parse(request.applicationDetails)
                : {};
            } catch {
              details = {};
            }

            return (
              <article className="card" key={request.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <strong>{request.user.name}</strong>
                    <p className="muted">
                      {request.user.email} · {request.requestedRole} · {request.type}
                    </p>
                  </div>
                  <span className="muted">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {request.class && (
                  <p className="muted">
                    Requested class: {request.class.section.name} · {request.class.name}
                    {request.class.arm ? ` · ${request.class.arm}` : ""}
                  </p>
                )}

                {!!Object.keys(details).length && (
                  <div style={{ marginTop: 10 }}>
                    {Object.entries(details).map(([key, value]) =>
                      value ? (
                        <p key={key} className="muted">
                          {key}: {value}
                        </p>
                      ) : null
                    )}
                  </div>
                )}

                {request.requestedRole === "STUDENT" && (
                  <select
                    value={classChoice[request.id] || request.class?.id || ""}
                    onChange={event =>
                      setClassChoice(current => ({
                        ...current,
                        [request.id]: event.target.value,
                      }))
                    }
                    style={{ marginTop: 12 }}
                  >
                    <option value="">Choose class</option>
                    {classes.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.section.name} · {item.name}
                        {item.arm ? ` · ${item.arm}` : ""}
                      </option>
                    ))}
                  </select>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    type="button"
                    disabled={busy === request.id}
                    onClick={() => void review(request, "APPROVE")}
                  >
                    {busy === request.id ? "Saving..." : "Approve"}
                  </button>
                  <button
                    type="button"
                    disabled={busy === request.id}
                    onClick={() => void review(request, "REJECT")}
                  >
                    Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
