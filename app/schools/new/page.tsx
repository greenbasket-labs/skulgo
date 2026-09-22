"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewSchool() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const response = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
    });

    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      setMessage(data.error || "Could not create school");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 600, margin: "40px auto" }}>
        <p className="muted">SkulGo · New school workspace</p>
        <h1>Register your school</h1>
        <p className="muted">
          Create the school record first. Your personal SkulGo account stays yours,
          and the school becomes one of your workspaces.
        </p>

        <form onSubmit={submit} className="grid">
          <input required name="name" placeholder="School name" />
          <input required name="abbr" placeholder="School abbreviation" />
          <input required name="address" placeholder="Address" />
          <input required name="phone" placeholder="Phone" />
          <input required type="email" name="email" placeholder="School email" />
          <button className="button" disabled={busy}>
            {busy ? "Creating…" : "Create school"}
          </button>
        </form>

        {message && <p>{message}</p>}
      </div>
    </main>
  );
}
