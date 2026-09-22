import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <section className="card" style={{ minHeight: "70vh", display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <p className="muted">SkulGo</p>
          <h1>Transparent &amp; Secure Records.</h1>
          <Link className="button" href="/login">Sign in</Link>
        </div>
      </section>
    </main>
  );
}
