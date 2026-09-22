import Link from "next/link";

const roles = [
  ["Principal","Approve, assign and manage"],
  ["Teacher","Attendance and scores"],
  ["Student","View records"],
  ["Parent","View linked child"],
  ["Cashier","Payments and balances"],
];

export default function Home() {
  return <main className="shell">
    <section className="card" style={{marginBottom:16}}>
      <p className="muted">Transparent and Secure Records</p>
      <h1>SkulGo</h1>
      <p>A lightweight school record system built around one connected flow:</p>
      <p><strong>People → Classes → Subjects → Attendance → Scores → Results → Fees</strong></p>
      <Link className="button" href="/register">Register a school</Link>
    </section>
    <section className="grid grid-2">
      {roles.map(([name,desc])=><div className="card" key={name}><h2>{name}</h2><p className="muted">{desc}</p></div>)}
    </section>
  </main>;
}
