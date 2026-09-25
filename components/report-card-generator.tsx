"use client";

import type { SchoolSettings } from "@/lib/school-settings";

export type ReportCardStudent = {
  id: string;
  admissionId: string;
  firstName: string;
  lastName: string;
  className?: string | null;
  arm?: string | null;
  gender?: string | null;
};

export type ReportCardResult = {
  subject: { name: string };
  total: number;
  percentage: number;
  grade: string;
  position: number;
};

export type ReportCardAttendance = {
  schoolDays: number;
  present: number;
  absent: number;
};

export type ReportCardProps = {
  school: {
    name: string;
    abbr: string;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
  };
  student: ReportCardStudent;
  term: string;
  session?: string;
  results: ReportCardResult[];
  settings?: SchoolSettings;
  attendance?: ReportCardAttendance | null;
  teacherRemark?: string | null;
  principalRemark?: string | null;
};

function remarkForGrade(grade: string) {
  switch (grade.toUpperCase()) {
    case "A": return "Excellent";
    case "B": return "Very Good";
    case "C": return "Average";
    case "D": return "Below Average";
    case "E": return "Poor";
    case "F": return "Very Poor";
    default: return "—";
  }
}

function overallGradeForAverage(average: number) {
  if (average >= 70) return "A";
  if (average >= 60) return "B";
  if (average >= 50) return "C";
  if (average >= 45) return "D";
  if (average >= 40) return "E";
  return "F";
}

function overallRemark(average: number) {
  if (average >= 70) return "Excellent performance. Keep up the consistent effort.";
  if (average >= 60) return "Very good performance. Continue working hard.";
  if (average >= 50) return "Average performance. More consistent study will help.";
  if (average >= 45) return "Performance is below average. More effort is required.";
  if (average >= 40) return "Performance needs improvement. More focus and regular study are required.";
  return "Performance is very low. Immediate improvement in study habits and class participation is required.";
}

function isWeak(grade: string, percentage: number) {
  return ["D", "E", "F"].includes(grade.toUpperCase()) || percentage < 45;
}

export function ReportCardGenerator({
  school,
  student,
  term,
  session = "",
  results,
  settings,
  attendance,
  teacherRemark,
  principalRemark,
}: ReportCardProps) {
  const show = (key: keyof SchoolSettings, fallback = true) =>
    settings ? settings[key] !== false : fallback;

  const total = results.reduce((sum, item) => sum + item.total, 0);
  const maximum = results.length * 100;
  const average = results.length ? results.reduce((sum, item) => sum + item.percentage, 0) / results.length : 0;
  const overallGrade = overallGradeForAverage(average);
  const defaultTeacherRemark = settings?.teacherRemarks?.[overallGrade] || overallRemark(average);
  const defaultPrincipalRemark = settings?.principalRemarks?.[overallGrade] || "Continue to support the student’s learning and maintain regular attendance.";
  /*
    The grade-based defaults are school-editable in Result Settings.
    The explicit teacherRemark/principalRemark props still take precedence when supplied.
  */
  /*
    Legacy calculation kept out of the UI; overallGrade now uses the same thresholds.
  */
  /* OLD:
    average >= 70 ? "A" :
    average >= 60 ? "B" :
    average >= 50 ? "C" :
    average >= 45 ? "D" :
    average >= 40 ? "E" : "F";
  */
  const overallPosition = results.length ? Math.min(...results.map(item => item.position)) : null;

  const print = () => window.print();

  return (
    <section className="report-card-shell">
      <div className="report-card-actions no-print">
        <button className="button" type="button" onClick={print}>Print report card</button>
      </div>

      <article className="report-card">
        <header className="report-card-header">
          <div>
            <div className="report-card-school">{school.name}</div>
            <div className="report-card-subtitle">{school.abbr}</div>
            {(school.address || school.phone || school.email) && (
              <div className="report-card-contact">
                {[school.address, school.phone, school.email].filter(Boolean).join("  •  ")}
              </div>
            )}
          </div>
          <div className="report-card-title">
            <strong>{settings?.resultHeading || "Student Report Card"}</strong>
            <span>{term}{session ? `  •  ${session}` : ""}</span>
          </div>
        </header>

        <div className="report-card-section">
          <div className="report-card-section-title">Student Information</div>
          <div className="report-card-info">
            {show("showStudentName") && <div><span>Name</span><strong>{student.firstName} {student.lastName}</strong></div>}
            {show("showAdmissionId") && <div><span>Admission ID</span><strong>{student.admissionId}</strong></div>}
            {show("showClass") && <div><span>Class</span><strong>{student.className || "—"}{student.arm ? `  ${student.arm}` : ""}</strong></div>}
            {student.gender && <div><span>Gender</span><strong>{student.gender}</strong></div>}
          </div>
        </div>

        <div className="report-card-section">
          <div className="report-card-section-title">Academic Performance</div>
          {show("showSubjectBreakdown") && (
            <table className="report-card-table">
              <thead>
                <tr>
                  <th>S/N</th>
                  <th>Subject</th>
                  {show("showTotal") && <th>Total</th>}
                  {show("showPercentage") && <th>%</th>}
                  {show("showGrade") && <th>Grade</th>}
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item, index) => {
                  const weak = isWeak(item.grade, item.percentage);
                  return (
                    <tr key={`${item.subject.name}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{item.subject.name}</td>
                      {show("showTotal") && <td>{item.total}</td>}
                      {show("showPercentage") && <td className={weak ? "report-card-danger-text" : ""}>{item.percentage.toFixed(0)}%</td>}
                      {show("showGrade") && <td className={weak ? "report-card-danger-cell" : ""}>{item.grade}</td>}
                      <td className={weak ? "report-card-danger-text" : ""}>{remarkForGrade(item.grade)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="report-card-summary-grid">
          <div className="report-card-summary">
            <div className="report-card-section-title">Summary</div>
            {show("showTotal") && <div><span>Total</span><strong>{total} / {maximum || 0}</strong></div>}
            {show("showPercentage") && <div><span>Average</span><strong className={average < 45 ? "report-card-danger-text" : ""}>{average.toFixed(1)}%</strong></div>}
            {show("showGrade") && <div><span>Overall Grade</span><strong className={["E", "F"].includes(overallGrade) ? "report-card-danger-text" : ""}>{overallGrade}</strong></div>}
            {show("showPosition") && <div><span>Position</span><strong>{overallPosition ? `#${overallPosition}` : "—"}</strong></div>}
          </div>

          {show("showAttendance") && (
            <div className="report-card-summary">
              <div className="report-card-section-title">Attendance</div>
              <div><span>School Days</span><strong>{attendance?.schoolDays ?? "—"}</strong></div>
              <div><span>Present</span><strong>{attendance?.present ?? "—"}</strong></div>
              <div><span>Absent</span><strong>{attendance?.absent ?? "—"}</strong></div>
              <div><span>Attendance</span><strong>{attendance && attendance.schoolDays ? `${((attendance.present / attendance.schoolDays) * 100).toFixed(1)}%` : "—"}</strong></div>
            </div>
          )}

          <div className="report-card-summary report-card-grading">
            <div className="report-card-section-title">Grading Key</div>
            <div><span>70–100</span><strong>A</strong></div>
            <div><span>60–69</span><strong>B</strong></div>
            <div><span>50–59</span><strong>C</strong></div>
            <div><span>45–49</span><strong>D</strong></div>
            <div><span>40–44</span><strong>E</strong></div>
            <div><span>0–39</span><strong>F</strong></div>
          </div>
        </div>

        {(show("showTeacherRemark") || show("showPrincipalRemark")) && (
          <div className="report-card-section">
            <div className="report-card-section-title">Remarks</div>
            {show("showTeacherRemark") && (
              <div className="report-card-remark">
                <strong>{settings?.teacherRemarkLabel || "Teacher Remark"}</strong>
                <span>{teacherRemark || defaultTeacherRemark}</span>
              </div>
            )}
            {show("showPrincipalRemark") && (
              <div className="report-card-remark">
                <strong>{settings?.principalRemarkLabel || "Principal Remark"}</strong>
                <span>{principalRemark || defaultPrincipalRemark}</span>
              </div>
            )}
          </div>
        )}

        <footer className="report-card-footer">
          <div>Class Teacher Signature: ____________________</div>
          <div>Principal Signature: ____________________</div>
          <div>Date: ____________________</div>
        </footer>
      </article>
    </section>
  );
}
