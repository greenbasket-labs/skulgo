import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const resourceSources = [
  {
    type: "Lesson Plan",
    description: "Curriculum-aligned teaching resources and lesson-planning materials.",
    sources: [
      { name: "Federal Ministry of Education eLearn", href: "https://elearn.education.gov.ng/resources/" },
      { name: "TRCN Lesson Resources", href: "https://resources.trcn.gov.ng/lesson" },
    ],
  },
  {
    type: "Lesson Note",
    description: "Free lesson notes and curriculum-aligned teaching resources.",
    sources: [
      { name: "TRCN Lesson Resources", href: "https://resources.trcn.gov.ng/lesson" },
      { name: "Federal Ministry of Education eLearn", href: "https://elearn.education.gov.ng/resources/" },
    ],
  },
  {
    type: "Teaching Aid",
    description: "Teaching and learning materials to support classroom preparation.",
    sources: [
      { name: "Federal Ministry of Education eLearn", href: "https://elearn.education.gov.ng/resources/" },
    ],
  },
] as const;

export default async function TeacherResourcesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (!user.membership || user.membership.role !== "TEACHER") {
    redirect("/dashboard");
  }

  const teacher = await db.teacher.findUnique({
    where: { userId: user.id },
    include: {
      assignments: {
        include: {
          class: { include: { section: true } },
          subject: true,
        },
        orderBy: [{ class: { name: "asc" } }, { subject: { name: "asc" } }],
      },
    },
  });

  const assignments = teacher?.assignments ?? [];

  return (
    <main className="workspace-main">
      <div className="workspace-header">
        <p className="muted">Teacher workspace</p>
        <h1>Teacher Resources</h1>
        <p>Free teaching resources connected to the classes and subjects your school has assigned to you.</p>
      </div>

      {!teacher?.approved ? (
        <div className="card">
          <strong>Teacher approval is still pending.</strong>
          <p className="muted">Resources become available after your school approves your teacher account and assigns your work.</p>
        </div>
      ) : !assignments.length ? (
        <div className="card">
          <strong>No subject assignment yet.</strong>
          <p className="muted">Your school Admin needs to assign your class and subject before resources appear here.</p>
        </div>
      ) : (
        <div className="grid">
          {assignments.map((assignment) => (
            <section className="card" key={assignment.id}>
              <p className="muted">
                {assignment.class.section.name} · {assignment.class.name}
                {assignment.class.arm ? " · " + assignment.class.arm : ""}
              </p>
              <h2>{assignment.subject.name}</h2>

              <div className="grid grid-2" style={{ marginTop: 14 }}>
                {resourceSources.map((resource) => (
                  <div key={resource.type} className="card" style={{ margin: 0 }}>
                    <strong>{resource.type}</strong>
                    <p className="muted">{resource.description}</p>
                    <div className="grid" style={{ marginTop: 10 }}>
                      {resource.sources.map((source) => (
                        <a
                          key={source.href}
                          className="button"
                          href={source.href}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {source.name} ↗
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="muted" style={{ marginTop: 14 }}>
                More resources can be opened gradually for this subject as SkulGo adds reviewed materials.
              </p>
            </section>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 18 }}>
        <strong>Why these resources?</strong>
        <p className="muted">
          SkulGo starts with free, curriculum-aligned sources instead of copying or reselling another
          organisation's materials. Your assigned subjects control what appears on this page.
        </p>
      </div>

      <p className="muted" style={{ marginTop: 14 }}>
        <Link href="/my-subjects">← Back to My Subjects</Link>
      </p>
    </main>
  );
}
