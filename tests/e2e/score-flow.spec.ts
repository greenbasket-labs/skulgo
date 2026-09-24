import { test, expect } from "@playwright/test";
import { createAndLoginTestUser, loginTestUser, selectTestWorkspace, TEST_PIN } from "./helpers/test-auth";

test("teacher can save a score offline and it syncs when online returns", async ({ browser }) => {
  const runId = Date.now();
  const password = "ScorePilot123!";
  const ownerEmail = `score-owner-${runId}@example.com`;
  const teacherEmail = `score-teacher-${runId}@example.com`;
  const studentEmail = `score-student-${runId}@example.com`;
  const schoolAbbr = `S${String(runId).slice(-4)}`;

  const owner = await browser.newContext();
  const teacher = await browser.newContext();
  const student = await browser.newContext();
  const adminPage = await owner.newPage();
  const teacherPage = await teacher.newPage();
  const studentPage = await student.newPage();

  try {
    await createAndLoginTestUser(adminPage, { name: "Score Test Owner", email: ownerEmail, password: password });

    const schoolResponse = await adminPage.request.post("/api/schools", {
      data: {
        name: `Score Pilot School ${runId}`,
        abbr: schoolAbbr,
        address: "Score Road",
        phone: "08000000010",
        email: `score-school-${runId}@example.com`,
      },
    });
    expect(schoolResponse.ok()).toBeTruthy();
    const school = await schoolResponse.json();

    const selected = await selectTestWorkspace(adminPage, school.membershipId);
    expect(selected.ok()).toBeTruthy();

    const sectionsResponse = await adminPage.request.get(`/api/schools/${school.id}/sections`);
    expect(sectionsResponse.ok()).toBeTruthy();
    const sections = await sectionsResponse.json();
    const primary = sections.find((section: { name: string }) => section.name === "Primary");
    expect(primary).toBeTruthy();

    const classResponse = await adminPage.request.post(`/api/schools/${school.id}/classes`, {
      data: { sectionId: primary.id, name: "Primary 5", arm: "A" },
    });
    expect(classResponse.ok()).toBeTruthy();
    const schoolClass = await classResponse.json();

    const subjectResponse = await adminPage.request.post(`/api/schools/${school.id}/subjects`, {
      data: { name: "Mathematics" },
    });
    expect(subjectResponse.ok()).toBeTruthy();
    const subject = await subjectResponse.json();

    await createAndLoginTestUser(teacherPage, { name: "Score Test Teacher", email: teacherEmail, password: password });

    const teacherApplication = await teacherPage.request.post("/api/school-requests", {
      data: { schoolId: school.id, type: "JOB", requestedRole: "TEACHER" },
    });
    expect(teacherApplication.status()).toBe(201);
    const teacherRequest = await teacherApplication.json();

    const approval = await adminPage.request.patch(
      `/api/schools/${school.id}/requests/${teacherRequest.id}`,
      { data: { action: "APPROVE" } }
    );
    expect(approval.ok()).toBeTruthy();

    const teachersResponse = await adminPage.request.get(`/api/schools/${school.id}/teachers`);
    expect(teachersResponse.ok()).toBeTruthy();
    const teachers = await teachersResponse.json();
    const approvedTeacher = teachers.find(
      (item: { user: { email: string } }) => item.user.email === teacherEmail
    );
    expect(approvedTeacher).toBeTruthy();

    const assignment = await adminPage.request.post(`/api/schools/${school.id}/assignments`, {
      data: {
        teacherId: approvedTeacher.id,
        classId: schoolClass.id,
        subjectId: subject.id,
      },
    });
    expect(assignment.status(), JSON.stringify(await assignment.text())).toBe(201);

    await createAndLoginTestUser(studentPage, { name: "Score Test Student", email: studentEmail, password: password });

    const studentApplication = await studentPage.request.post("/api/school-requests", {
      data: {
        schoolId: school.id,
        type: "ADMISSION",
        requestedRole: "STUDENT",
        classId: schoolClass.id,
      },
    });
    expect(studentApplication.status()).toBe(201);
    const studentRequest = await studentApplication.json();

    const studentApproval = await adminPage.request.patch(
      `/api/schools/${school.id}/requests/${studentRequest.id}`,
      { data: { action: "APPROVE", classId: schoolClass.id } }
    );
    const studentApprovalBody = await studentApproval.json().catch(() => ({}));
    expect(studentApproval.ok(), JSON.stringify(studentApprovalBody)).toBeTruthy();

    const studentId = await getStudentId(adminPage, school.id, studentEmail);

    const login = await teacherPage.evaluate(async payload => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return { ok: response.ok, body: await response.json().catch(() => ({})) };
    }, { email: teacherEmail, password });
    expect(login.ok).toBeTruthy();

    const workspace = login.body.workspaces.find(
      (item: { schoolId: string }) => item.schoolId === school.id
    );
    expect(workspace).toBeTruthy();

    const selectTeacherWorkspace = await selectTestWorkspace(teacherPage, workspace.membershipId);
    expect(selectTeacherWorkspace.ok()).toBeTruthy();

    const onlineAssessment = await teacherPage.request.post(`/api/schools/${school.id}/assessments`, {
      data: {
        studentId,
        classId: schoolClass.id,
        subjectId: subject.id,
        term: "First Term",
        ca1: 9,
        ca2: 9,
        exam: 60,
      },
    });
    expect(onlineAssessment.status(), await onlineAssessment.text()).toBe(201);
    const onlineBody = await onlineAssessment.json();
    expect(onlineBody.total).toBe(78);

    await teacherPage.goto("/scores");
    await expect(teacherPage.getByRole("heading", { name: "Scores" })).toBeVisible();
    await expect(teacherPage.getByRole("paragraph").filter({ hasText: /Mathematics · Primary/ })).toBeVisible();
    await expect(teacherPage.getByText(/Score Test Student/)).toBeVisible();

    await teacherPage.context().setOffline(true);

    const inputs = teacherPage.locator("input");
    await inputs.nth(0).fill("20");
    await inputs.nth(1).fill("65");
    await teacherPage.getByRole("button", { name: "Save score" }).click();

    await expect(
      teacherPage.getByText("Saved on this device. It will sync automatically when internet returns.")
    ).toBeVisible();

    await teacherPage.context().setOffline(false);

    await expect.poll(async () => {
      const response = await adminPage.request.get(
        `/api/schools/${school.id}/assessments?classId=${schoolClass.id}&subjectId=${subject.id}&term=First%20Term`
      );
      if (!response.ok()) return null;
      const records = await response.json();
      const record = records.find((item: { studentId: string }) => item.studentId === studentId);
      return record ? { ca: record.ca, exam: record.exam } : null;
    }, { timeout: 10000 }).toEqual({ ca: 20, exam: 65 });
  } finally {
    await owner.close();
    await teacher.close();
    await student.close();
  }
});

async function getStudentId(
  adminPage: import("@playwright/test").Page,
  schoolId: string,
  email: string,
) {
  const response = await adminPage.request.get(`/api/schools/${schoolId}/students`);
  expect(response.ok()).toBeTruthy();
  const students = await response.json();
  const student = students.find(
    (item: { user?: { email?: string } }) => item.user?.email === email
  );
  expect(student).toBeTruthy();
  return student.id;
}
