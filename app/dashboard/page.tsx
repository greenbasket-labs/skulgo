import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { navForRole, type WorkspaceRole } from "@/lib/workspace-nav";
import { db } from "@/lib/db";

function money(value: number) {
  return "₦" + value.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

export default async function Dashboard() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");

  if (!u.membership) {
    return (
      <main className="shell">
        <div className="card" style={{ maxWidth: 760, margin: "40px auto" }}>
          <p className="muted">Personal SkulGo account</p>
          <h1>Welcome, {u.name}</h1>
          <p>Your personal profile is ready. Connect to a school to enter school records.</p>
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            <Link className="button" href="/schools">Find a school</Link>
            <Link className="button" href="/register">Create a school</Link>
            <Link className="button" href="/account">My profile / CV</Link>
          </div>
        </div>
      </main>
    );
  }

  const role = u.membership.role as WorkspaceRole;
  const schoolId = u.membership.schoolId;
  const nav = navForRole(role);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  let content: React.ReactNode = null;

  if (role === "ADMIN") {
    const [sections, classes, students, teachers, pending, attendance, payments, announcements] =
      await Promise.all([
        db.section.count({ where: { schoolId } }),
        db.schoolClass.count({ where: { schoolId } }),
        db.student.count({ where: { schoolId } }),
        db.teacher.count({
          where: {
            approved: true,
            user: { memberships: { some: { schoolId, active: true, role: "TEACHER" } } },
          },
        }),
        db.schoolRequest.count({ where: { schoolId, status: "PENDING" } }),
        db.attendance.findMany({
          where: { schoolId, date: { gte: todayStart, lt: tomorrow } },
          select: { present: true, student: { select: { gender: true } } },
        }),
        db.payment.aggregate({
          where: { schoolId, paidAt: { gte: todayStart, lt: tomorrow } },
          _sum: { amount: true },
        }),
        db.announcement.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" }, take: 3 }),
      ]);

    const present = attendance.filter(item => item.present).length;
    const attendancePercentage = attendance.length
      ? Math.round((present / attendance.length) * 100)
      : 0;

    content = (
      <>
        <div className="grid grid-2">
          <div className="card"><p className="muted">Students</p><div className="stat">{students}</div></div>
          <div className="card"><p className="muted">Teachers</p><div className="stat">{teachers}</div></div>
          <div className="card"><p className="muted">Classes</p><div className="stat">{classes}</div></div>
          <div className="card"><p className="muted">Sections</p><div className="stat">{sections}</div></div>
          <div className="card"><p className="muted">Today's attendance</p><div className="stat">{attendancePercentage}%</div></div>
          <div className="card"><p className="muted">Today's payments</p><div className="stat">{money(payments._sum.amount ?? 0)}</div></div>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <strong>{pending} application(s) waiting</strong>
          <p className="muted">Open Applications to approve or reject school requests.</p>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <strong>Announcements</strong>
          {!announcements.length ? (
            <p className="muted">No announcements yet.</p>
          ) : (
            <div className="grid" style={{ marginTop: 10 }}>
              {announcements.map(item => (
                <div key={item.id}>
                  <strong>{item.title}</strong>
                  <p className="muted">{item.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  } else if (role === "TEACHER") {
    const teacher = await db.teacher.findUnique({
      where: { userId: u.id },
      include: {
        assignments: {
          include: { class: { include: { section: true } }, subject: true },
          orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
        },
        classTeacherAssignments: {
          include: { class: { include: { section: true } } },
        },
      },
    });

    const teachingClassIds = Array.from(new Set((teacher?.assignments ?? []).map(item => item.classId)));
    const students = teachingClassIds.length
      ? await db.student.findMany({
          where: { schoolId, classId: { in: teachingClassIds } },
          orderBy: { lastName: "asc" },
        })
      : [];

    const classTeacherCards = await Promise.all(
      (teacher?.classTeacherAssignments ?? []).map(async assignment => ({
        ...assignment,
        studentCount: await db.student.count({ where: { schoolId, classId: assignment.classId } }),
        attendanceCount: await db.attendance.count({
          where: {
            schoolId,
            classId: assignment.classId,
            date: { gte: todayStart, lt: tomorrow },
          },
        }),
      }))
    );

    content = (
      <>
        <div className="card">
          <p className="muted">My teaching</p>
          {!teacher?.approved ? (
            <strong>Teacher approval is still pending.</strong>
          ) : !teacher.assignments.length ? (
            <strong>No class or subject assignment yet.</strong>
          ) : (
            <div className="grid">
              {teacher.assignments.map(item => (
                <div key={item.id}>
                  <strong>{item.subject.name}</strong>
                  <p className="muted">{item.class.section.name} · {item.class.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-2" style={{ marginTop: 18 }}>
          <div className="card"><p className="muted">My students</p><div className="stat">{students.length}</div></div>
          <div className="card">
            <p className="muted">Class teacher</p>
            <strong>{teacher?.classTeacherAssignments.length ? "Yes" : "No"}</strong>
          </div>
        </div>

        {classTeacherCards.length > 0 && (
          <div className="card" style={{ marginTop: 18 }}>
            <p className="muted">My class</p>
            <div className="grid">
              {classTeacherCards.map(item => (
                <div key={item.id}>
                  <strong>{item.class.section.name} · {item.class.name}{item.class.arm ? ` · ${item.class.arm}` : ""}</strong>
                  <p className="muted">{item.studentCount} students · {item.attendanceCount} marked today</p>
                  <Link className="button" href="/attendance">Attendance →</Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  } else if (role === "STUDENT") {
    const student = u.student?.id
      ? await db.student.findFirst({
          where: { id: u.student.id, schoolId },
          include: { class: true },
        })
      : null;

    const subjects = student?.classId
      ? await db.classSubject.findMany({
          where: { schoolId, classId: student.classId },
          include: { subject: true },
          orderBy: { subject: { name: "asc" } },
        })
      : [];

    const attendance = student
      ? await db.attendance.count({ where: { schoolId, studentId: student.id, present: true } })
      : 0;

    content = (
      <>
        <div className="card">
          <p className="muted">My class</p>
          <h2>{student?.class?.name ?? "No class assigned"}</h2>
          <p className="muted">{student?.admissionId ?? ""}</p>
        </div>
        <div className="grid grid-2" style={{ marginTop: 18 }}>
          <div className="card"><p className="muted">Subjects</p><div className="stat">{subjects.length}</div></div>
          <div className="card"><p className="muted">Present records</p><div className="stat">{attendance}</div></div>
        </div>
      </>
    );
  } else if (role === "PARENT") {
    const children = u.parent?.id
      ? await db.parentStudent.findMany({
          where: { parentId: u.parent.id, approved: true, student: { schoolId } },
          include: { student: { include: { class: true } } },
        })
      : [];

    content = (
      <div className="card">
        <p className="muted">My children</p>
        {!children.length ? (
          <strong>No approved child connection yet.</strong>
        ) : (
          <div className="grid">
            {children.map(link => (
              <div key={link.student.id}>
                <strong>{link.student.firstName} {link.student.lastName}</strong>
                <p className="muted">{link.student.class?.name ?? "No class"} · {link.student.admissionId}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  } else {
    const payments = await db.payment.count({ where: { schoolId } });
    const fees = await db.feeRecord.count({ where: { schoolId } });

    content = (
      <div className="grid grid-2">
        <div className="card"><p className="muted">Fee records</p><div className="stat">{fees}</div></div>
        <div className="card"><p className="muted">Payments recorded</p><div className="stat">{payments}</div></div>
      </div>
    );
  }

  return (
    <main className="workspace">
      <aside className="workspace-sidebar">
        <div className="workspace-brand">SkulGo</div>
        <div className="workspace-school">
          <strong>{u.membership.school.name}</strong>
          <span>{u.membership.school.abbr}</span>
        </div>
        <nav className="workspace-nav">
          {nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <div className="workspace-person">
          <strong>{u.name}</strong>
          <span>{role}</span>
          <Link href="/account">My profile / CV</Link>
        </div>
      </aside>

      <section className="workspace-main">
        <div className="workspace-header">
          <div>
            <p className="muted">{role.toLowerCase()} workspace · {u.membership.school.name}</p>
            <h1>Good morning, {u.name.split(" ")[0]}</h1>
          </div>
        </div>
        {content}
      </section>
    </main>
  );
}
