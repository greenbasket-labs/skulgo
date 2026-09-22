import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 640, margin: "40px auto" }}>
        <p className="muted">SkulGo offline</p>
        <h1>You are offline</h1>
        <p>
          SkulGo can keep working with data already loaded on this device.
          Changes saved offline will sync when internet returns.
        </p>
        <Link className="button" href="/dashboard">Back to workspace</Link>
      </div>
    </main>
  );
}
