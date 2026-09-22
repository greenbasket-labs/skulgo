import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import AdminRequests from "@/components/admin-requests";

export default async function Dashboard() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");

  if (!u.schoolId || !u.role) {
    return (
      <main className="shell">
        <div className="card">
          <p className="muted">Personal SkulGo account</p>
          <h1>Welcome, {u.name}</h1>
          <p>Your account is ready. Search for your school and send a request.</p>
          <a className="button" href="/schools">Find a school</a>
        </div>
      </main>
    );
  }

  const schoolId = u.schoolId;
  const [school, sections, classes, subjects, students, teachers, requests] = await Promise.all([
    db.school.findUnique({ where: { id: schoolId }, select: { name: true, abbr: true, address: true, phone: true, email: true } }),
    db.section.count({ where: { schoolId } }),
    db.schoolClass.count({ where: { schoolId } }),
    db.subject.count({ where: { schoolId } }),
    db.student.count({ where: { schoolId } }),
    db.teacher.count({ where: { user: { schoolId } } }),
    db.schoolRequest.count({ where: { schoolId, status: "PENDING" } }),
  ]);

  if (u.role !== "ADMIN") {
    return (
      <main className="shell">
        <div className="card">
          <p className="muted">{school?.name} · {u.role}</p>
          <h1>Welcome, {u.name}</h1>
          <p>Your SkulGo account is connected to your school.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="card">
        <p className="muted">School Admin</p>
        <h1>{school?.name}</h1>
        <p className="muted">{school?.abbr} · {school?.address}</p>
      </div>

      <div className="grid grid-4" style={{ marginTop: 16 }}>
        <div className="card"><strong>Sections</strong><div className="stat">{sections}</div></div>
        <div className="card"><strong>Classes</strong><div className="stat">{classes}</div></div>
        <div className="card"><strong>Subjects</strong><div className="stat">{subjects}</div></div>
        <div className="card"><strong>Students</strong><div className="stat">{students}</div></div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <p className="muted">School setup</p>
          <h2>Structure</h2>
          <p>Manage the school structure that the connected records use.</p>
          <div className="grid">
            <a className="button" href={`/schools/${schoolId}/sections`}>Sections &amp; classes</a>
            <a className="button" href={`/schools/${schoolId}/subjects`}>Subjects</a>
          </div>
        </div>
        <div className="card">
          <p className="muted">People</p>
          <h2>School people</h2>
          <p>{teachers} teachers · {students} students · {requests} pending requests</p>
          <a className="button" href={`/schools/${schoolId}/requests`}>Requests</a>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <AdminRequests schoolId={schoolId} />
      </div>
    </main>
  );
}
