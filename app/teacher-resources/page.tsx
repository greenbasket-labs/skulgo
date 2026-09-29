import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const resources = [
  {
    type: "Lesson Plan",
    title: "SkulGo Lesson Plan — Reusable Teacher Format",
    description: "A practical lesson-planning structure you can reuse for any subject and topic.",
    sections: [
      "Class / subject / topic / date / duration",
      "Previous knowledge",
      "Learning objectives — what students should know or be able to do by the end",
      "Teaching and learning materials",
      "Introduction / starter activity",
      "Teacher explanation and guided practice",
      "Student activity",
      "Assessment during the lesson",
      "Conclusion / recap",
      "Homework or follow-up activity",
      "Teacher reflection — what worked and what needs improvement",
    ],
  },
  {
    type: "Lesson Note",
    title: "SkulGo Lesson Note — Reusable Teacher Format",
    description: "A teacher-ready structure for turning a topic into a clear classroom note.",
    sections: [
      "Topic and key terms",
      "Simple introduction connected to students' previous knowledge",
      "Main explanation broken into clear sections",
      "Local or familiar examples where they help understanding",
      "Worked examples, illustrations or demonstrations where needed",
      "Short questions during the explanation",
      "Key points for students to remember",
      "Class exercise",
      "Short assessment",
      "Homework / extension activity",
    ],
  },
  {
    type: "Teaching Aid",
    title: "SkulGo Classroom Activity Pack",
    description: "Reusable activities that can be adapted to almost any subject.",
    sections: [
      "Think–Pair–Share: students think individually, discuss with a partner, then share with the class.",
      "Explain the picture: show a diagram, object, chart or board sketch and ask students to explain what they observe.",
      "Sort and classify: give students terms, examples or cards and ask them to group them with reasons.",
      "Find the mistake: show an incorrect answer or process and let students identify and correct it.",
      "Teach your partner: one student explains a small part of the topic while the partner asks questions.",
      "Exit ticket: before leaving, each student writes one thing learned and one question that remains.",
    ],
  },
  {
    type: "Assessment",
    title: "SkulGo Quick Assessment Builder",
    description: "A reusable way to check whether students understood the lesson.",
    sections: [
      "2 recall questions — check important facts or terms.",
      "2 understanding questions — ask students to explain an idea in their own words.",
      "1 application question — give a familiar situation where students use the lesson.",
      "1 correction question — present a common mistake and ask students to correct it.",
      "1 short reflection — ask what part of the lesson was easiest or hardest.",
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
        <p>Free, original SkulGo resources you can reuse and adapt for the subjects your school has assigned to you.</p>
      </div>

      {!teacher?.approved ? (
        <div className="card">
          <strong>Teacher approval is still pending.</strong>
          <p className="muted">Resources become available after your school approves your teacher account and assigns your work.</p>
        </div>
      ) : !assignments.length ? (
        <div className="card">
          <strong>No subject assignment yet.</strong>
          <p className="muted">Your school Admin needs to assign your class and subject before teacher resources appear here.</p>
        </div>
      ) : (
        <>
          <div className="card">
            <strong>Your current teaching</strong>
            <div className="grid" style={{ marginTop: 12 }}>
              {assignments.map((assignment) => (
                <div key={assignment.id}>
                  <strong>{assignment.subject.name}</strong>
                  <p className="muted">
                    {assignment.class.section.name} · {assignment.class.name}
                    {assignment.class.arm ? " · " + assignment.class.arm : ""}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid" style={{ marginTop: 18 }}>
            {resources.map((resource) => (
              <section className="card" key={resource.type}>
                <p className="muted">{resource.type}</p>
                <h2>{resource.title}</h2>
                <p>{resource.description}</p>

                <details style={{ marginTop: 14 }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600 }}>Open resource</summary>
                  <ol style={{ marginTop: 12 }}>
                    {resource.sections.map((section) => (
                      <li key={section} style={{ marginBottom: 8 }}>
                        {section}
                      </li>
                    ))}
                  </ol>
                </details>

                <p className="muted" style={{ marginTop: 14 }}>
                  Reusable across subjects. Adapt the content to the topic and class you are teaching.
                </p>
              </section>
            ))}
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: 18 }}>
        <strong>Built for teachers</strong>
        <p className="muted">
          These are original SkulGo resources, not copied lesson notes from another organisation.
          Official curriculum and education resources can guide future subject-specific materials,
          while the teaching structures here can be reused across subjects.
        </p>
      </div>

      <p className="muted" style={{ marginTop: 14 }}>
        <Link href="/my-subjects">← Back to My Subjects</Link>
      </p>
    </main>
  );
}
