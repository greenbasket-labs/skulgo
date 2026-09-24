import { test, expect } from "@playwright/test";
import { createAndLoginTestUser, loginTestUser, selectTestWorkspace, TEST_PIN } from "./helpers/test-auth";

test("result is generated, hidden until published, then visible to student", async ({ browser }) => {
  const runId = Date.now();
  const password = "ResultPilot123!";
  const ownerEmail = `result-owner-${runId}@example.com`;
  const teacherEmail = `result-teacher-${runId}@example.com`;
  const studentEmail = `result-student-${runId}@example.com`;
  const schoolAbbr = `R${String(runId).slice(-4)}`;

  const owner = await browser.newContext();
  const teacher = await browser.newContext();
  const student = await browser.newContext();
  const adminPage = await owner.newPage();
  const teacherPage = await teacher.newPage();
  const studentPage = await student.newPage();

  try {
    await createAndLoginTestUser(adminPage, { name: "Result Test Owner", email: ownerEmail, password: password });

    const schoolResponse = await adminPage.request.post("/api/schools", {
      data: {
        name: `Result Pilot School ${runId}`,
        abbr: schoolAbbr,
        address: "Result Road",
        phone: "08000000020",
        email: `result-school-${runId}@example.com`,
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

    await createAndLoginTestUser(teacherPage, { name: "Result Test Teacher", email: teacherEmail, password: password });

    const teacherApplication = await teacherPage.request.post("/api/school-requests", {
      data: { schoolId: school.id, type: "JOB", requestedRole: "TEACHER" },
    });
    expect(teacherApplication.status()).toBe(201);
    const teacherRequest = await teacherApplication.json();

    const teacherApproval = await adminPage.request.patch(
      `/api/schools/${school.id}/requests/${teacherRequest.id}`,
      { data: { action: "APPROVE" } }
    );
    expect(teacherApproval.ok()).toBeTruthy();

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
    expect(assignment.status()).toBe(201);

    await createAndLoginTestUser(studentPage, { name: "Result Test Student", email: studentEmail, password: password });

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
    expect(studentApproval.ok()).toBeTruthy();

    const studentsResponse = await adminPage.request.get(`/api/schools/${school.id}/students`);
    expect(studentsResponse.ok()).toBeTruthy();
    const students = await studentsResponse.json();
    const studentRecord = students.find(
      (item: { id: string; user?: { email?: string } }) => item.user?.email === studentEmail
    );
    expect(studentRecord).toBeTruthy();

    const teacherLogin = await teacherPage.request.post("/api/auth/login", {
      data: { email: teacherEmail, password },
    });
    expect(teacherLogin.ok()).toBeTruthy();
    const teacherLoginBody = await teacherLogin.json();
    const teacherWorkspace = teacherLoginBody.workspaces.find(
      (item: { schoolId: string; membershipId: string }) => item.schoolId === school.id
    );
    expect(teacherWorkspace).toBeTruthy();

    const selectTeacher = await selectTestWorkspace(teacherPage, teacherWorkspace.membershipId);
    expect(selectTeacher.ok()).toBeTruthy();

    const assessment = await teacherPage.request.post(`/api/schools/${school.id}/assessments`, {
      data: {
        studentId: studentRecord.id,
        classId: schoolClass.id,
        subjectId: subject.id,
        term: "First Term",
        ca: 20,
        exam: 60,
      },
    });
    expect(assessment.status()).toBe(201);

    const generated = await teacherPage.request.post(`/api/schools/${school.id}/results`, {
      data: { studentId: studentRecord.id, term: "First Term" },
    });
    expect(generated.status()).toBe(201);
    const generatedResults = await generated.json();
    expect(generatedResults[0].total).toBe(80);
    expect(generatedResults[0].grade).toBe("A");
    expect(generatedResults[0].published).toBeFalsy();

    const studentLogin = await studentPage.request.post("/api/auth/login", {
      data: { email: studentEmail, password },
    });
    expect(studentLogin.ok()).toBeTruthy();
    const studentLoginBody = await studentLogin.json();
    const studentWorkspace = studentLoginBody.workspaces.find(
      (item: { schoolId: string; membershipId: string; role: string }) =>
        item.schoolId === school.id && item.role === "STUDENT"
    );
    expect(studentWorkspace).toBeTruthy();

    const selectStudent = await selectTestWorkspace(studentPage, studentWorkspace.membershipId);
    expect(selectStudent.ok()).toBeTruthy();

    const beforePublish = await studentPage.request.get(
      `/api/schools/${school.id}/results?studentId=${studentRecord.id}&term=First%20Term&published=true`
    );
    expect(beforePublish.ok()).toBeTruthy();
    expect(await beforePublish.json()).toEqual([]);

    const publish = await adminPage.request.patch(
      `/api/schools/${school.id}/results/publish`,
      {
        data: {
          studentId: studentRecord.id,
          term: "First Term",
        },
      }
    );
    expect(publish.ok()).toBeTruthy();
    const publishBody = await publish.json();
    expect(publishBody.published).toBe(1);

    const afterPublish = await studentPage.request.get(
      `/api/schools/${school.id}/results?studentId=${studentRecord.id}&term=First%20Term&published=true`
    );
    expect(afterPublish.ok()).toBeTruthy();
    const visibleResults = await afterPublish.json();
    expect(visibleResults).toHaveLength(1);
    expect(visibleResults[0].total).toBe(80);
    expect(visibleResults[0].grade).toBe("A");

    await studentPage.goto("/results");
    await expect(studentPage.getByRole("heading", { name: "Results" })).toBeVisible();
    await expect(studentPage.getByText("Mathematics")).toBeVisible();
    await expect(studentPage.getByText(/80\/100/)).toBeVisible();

    await expect.poll(async () => {
      return studentPage.evaluate(async () => {
        const registration = await navigator.serviceWorker.getRegistration("/sw.js");
        if (!registration?.active) return false;
        const cache = await caches.open("skulgo-shell-v4");
        const response = await cache.match("/results");
        return Boolean(response?.ok);
      });
    }, { timeout: 10000 }).toBeTruthy();

    await studentPage.context().setOffline(true);
    await expect.poll(() => studentPage.evaluate(() => navigator.onLine)).toBeFalsy();

    await expect(studentPage.getByRole("heading", { name: "Results" })).toBeVisible();
    await expect(studentPage.getByText("Mathematics")).toBeVisible();
    await expect(studentPage.getByText(/85\/100/)).toBeVisible();
  } finally {
    await owner.close();
    await teacher.close();
    await student.close();
  }
});
