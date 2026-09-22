import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const school = await db.school.findUnique({ where: { id: user.schoolId }, select: { name: true, abbr: true } });
  const links: Record<string, string[]> = {
    ADMIN: ["Teachers", "Students", "Classes", "Subjects", "Assignments", "Results", "Fees"],
    TEACHER: ["My classes", "Attendance", "Scores", "Results"],
    STUDENT: ["My attendance", "My results", "My fees"],
    PARENT: ["Children", "Attendance", "Results", "Fees"],
    CASHIER: ["Students", "Fees", "Payments"]
  };

  return <main className="shell"><div className="card">
    <p className="muted">{school?.name ?? "SkulGo"} · {user.role}</p>
    <h1>Welcome, {user.name}</h1>
    <p className="muted">This dashboard stays intentionally small. The records behind these areas are connected.</p>
    <div className="grid grid-2" style={{ marginTop: 20 }}>
      {(links[user.role] ?? []).map(item => <div className="card" key={item}><strong>{item}</strong></div>)}
    </div>
    <form action="/api/auth/logout" method="post" style={{ marginTop: 20 }}>
      <button className="button" type="submit">Sign out</button>
    </form>
  </div></main>;
}
