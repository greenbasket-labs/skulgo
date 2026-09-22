import Link from "next/link";

export default function Home() {
  return (
    <main className="shell">
      <section style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "clamp(42px, 8vw, 72px)", lineHeight: 1 }}>SkulGo</h1>
          <h2 style={{ margin: "18px 0 28px", fontWeight: 400 }}>
            Transparent &amp; Secure Records.
          </h2>
          <Link className="button" href="/login">Sign in</Link>
        </div>
      </section>
    </main>
  );
}
