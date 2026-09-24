import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

function dayRange(value?: string) {
  const date = value ? new Date(value + "T00:00:00") : new Date();
  if (Number.isNaN(date.getTime())) return dayRange();
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end, date: start.toISOString().slice(0, 10) };
}

export default async function AdminAttendance({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; classId?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.membership || user.membership.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const range = dayRange(params.date);

  const classes = await db.schoolClass.findMany({
    where: { schoolId: user.membership.schoolId },
    include: { section: true },
    orderBy: [{ section: { name: "asc" } }, { name: "asc" }, { arm: "asc" }],
  });

  const selectedClass = params.classId
    ? classes.find(item => item.id === params.classId) ?? null
    : null;

  const records = selectedClass
    ? await db.attendance.findMany({
        where: {
          schoolId: user.membership.schoolId,
          classId: selectedClass.id,
          date: { gte: range.start, lt: range.end },
        },
        include: {
          student: {
            select: { id: true, admissionId: true, firstName: true, lastName: true },
          },
        },
        orderBy: { student: { lastName: "asc" } },
      })
    : [];

  const students = selectedClass
    ? await db.student.findMany({
        where: { schoolId: user.membership.schoolId, classId: selectedClass.id },
        select: { id: true, admissionId: true, firstName: true, lastName: true },
        orderBy: { lastName: "asc" },
      })
    : [];

  const attendanceByStudent = new Map(records.map(item => [item.studentId, item.present]));

  const classSummaries = await Promise.all(
    classes.map(async item => {
      const [studentCount, attendance] = await Promise.all([
        db.student.count({ where: { schoolId: user.membership!.schoolId, classId: item.id } }),
        db.attendance.findMany({
          where: {
            schoolId: user.membership!.schoolId,
            classId: item.id,
            date: { gte: range.start, lt: range.end },
          },
          select: { present: true },
        }),
      ]);
      const present = attendance.filter(record => record.present).length;
      const absent = attendance.filter(record => !record.present).length;
      return { ...item, studentCount, marked: attendance.length, present, absent };
    })
  );

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">Admin workspace</p>
        <h1>Attendance</h1>
        <p className="muted">Daily attendance by class, down to each student.</p>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <form style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
          <label>
            <span className="muted">Date</span>
            <input type="date" name="date" defaultValue={range.date} />
          </label>
          {selectedClass && <input type="hidden" name="classId" value={selectedClass.id} />}
          <button className="button" type="submit">View</button>
        </form>
      </div>

      {!selectedClass ? (
        <>
          <div className="card" style={{ marginBottom: 18 }}>
            <strong>Today's / selected day's attendance</strong>
            <p className="muted">Choose a class to follow the record down to individual students.</p>
          </div>

          <div className="grid">
            {classSummaries.map(item => (
              <Link
                className="card"
                key={item.id}
                href={`/admin/attendance?date=${range.date}&classId=${item.id}`}
                style={{ textDecoration: "none" }}
              >
                <strong>{item.section.name} · {item.name}{item.arm ? ` · ${item.arm}` : ""}</strong>
                <p className="muted">{item.studentCount} students · {item.marked} marked</p>
                <p>{item.present} present · {item.absent} absent</p>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 18 }}>
            <p className="muted">Class</p>
            <h2>{selectedClass.section.name} · {selectedClass.name}{selectedClass.arm ? ` · ${selectedClass.arm}` : ""}</h2>
            <p className="muted">{range.date} · {students.length} students</p>
            <Link className="button" href={`/admin/attendance?date=${range.date}`}>← All classes</Link>
          </div>

          <div className="grid">
            {students.map(student => {
              const present = attendanceByStudent.get(student.id);
              return (
                <div className="card" key={student.id}>
                  <strong>{student.firstName} {student.lastName}</strong>
                  <p className="muted">{student.admissionId}</p>
                  <p>
                    {present === undefined
                      ? "Not marked"
                      : present
                        ? "Present"
                        : "Absent"}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
