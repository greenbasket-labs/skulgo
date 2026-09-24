import { test, expect } from "@playwright/test";
import { createAndLoginTestUser, loginTestUser, selectTestWorkspace, TEST_PIN } from "./helpers/test-auth";

test("teacher can mark attendance offline and it syncs when online returns", async ({ browser }) => {
  const runId = Date.now();
  const password = "OfflinePilot123!";
  const ownerEmail = `offline-owner-${runId}@example.com`;
  const teacherEmail = `offline-teacher-${runId}@example.com`;
  const studentEmail = `offline-student-${runId}@example.com`;
  const schoolAbbr = `O${String(runId).slice(-4)}`;

  const owner = await browser.newContext();
  const teacher = await browser.newContext();
  const adminPage = await owner.newPage();
  const teacherPage = await teacher.newPage();

  try {
    await createAndLoginTestUser(adminPage, { name: "Offline Test Owner", email: ownerEmail, password: password });

    const schoolResponse = await adminPage.request.post("/api/schools", {
      data: {
        name: `Offline Pilot School ${runId}`,
        abbr: schoolAbbr,
        address: "Offline Road",
        phone: "08000000004",
        email: `offline-school-${runId}@example.com`,
      },
    });
    expect(schoolResponse.ok(), await schoolResponse.text()).toBeTruthy();
    const school = await schoolResponse.json();

    const selectAdmin = await selectTestWorkspace(adminPage, school.membershipId);
    expect(selectAdmin.ok()).toBeTruthy();

    const sectionsResponse = await adminPage.request.get(`/api/schools/${school.id}/sections`);
    expect(sectionsResponse.ok()).toBeTruthy();
    const sections = await sectionsResponse.json();
    const primary = sections.find((section: { name: string }) => section.name === "Primary");
    expect(primary).toBeTruthy();

    const classResponse = await adminPage.request.post(`/api/schools/${school.id}/classes`, {
      data: { sectionId: primary.id, name: "Primary 5", arm: "A" },
    });
    expect(classResponse.status(), await classResponse.text()).toBe(201);
    const schoolClass = await classResponse.json();

    await adminPage.request.post(`/api/schools/${school.id}/subjects`, {
      data: { name: "English Language" },
    }).then(async response => expect(response.ok(), await response.text()).toBeTruthy());

    await createAndLoginTestUser(teacherPage, { name: "Offline Test Teacher", email: teacherEmail, password: password });

    const teacherApplication = await teacherPage.request.post("/api/school-requests", {
      data: { schoolId: school.id, type: "JOB", requestedRole: "TEACHER" },
    });
    expect(teacherApplication.status()).toBe(201);
    const teacherRequest = await teacherApplication.json();

    const teacherApproval = await adminPage.request.patch(
      `/api/schools/${school.id}/requests/${teacherRequest.id}`,
      { data: { action: "APPROVE" } }
    );
    expect(teacherApproval.ok(), await teacherApproval.text()).toBeTruthy();

    const teachersResponse = await adminPage.request.get(`/api/schools/${school.id}/teachers`);
    expect(teachersResponse.ok()).toBeTruthy();
    const teachers = await teachersResponse.json();
    const teacherRecord = teachers.find(
      (item: { id: string; user?: { email?: string } }) => item.user?.email === teacherEmail
    );
    expect(teacherRecord).toBeTruthy();

    const subjectResponse = await adminPage.request.get(`/api/schools/${school.id}/subjects`);
    expect(subjectResponse.ok()).toBeTruthy();
    const subjects = await subjectResponse.json();

    const assignmentResponse = await adminPage.request.post(`/api/schools/${school.id}/assignments`, {
      data: {
        teacherId: teacherRecord.id,
        classId: schoolClass.id,
        subjectId: subjects[0].id,
      },
    });
    expect(assignmentResponse.status(), await assignmentResponse.text()).toBe(201);

    const classTeacherResponse = await adminPage.request.post(`/api/schools/${school.id}/class-teachers`, {
      data: {
        teacherId: teacherRecord.id,
        classId: schoolClass.id,
      },
    });
    expect(classTeacherResponse.status(), await classTeacherResponse.text()).toBe(201);

    const teacherLogin = await teacherPage.request.post("/api/auth/login", {
      data: { email: teacherEmail, password },
    });
    expect(teacherLogin.ok()).toBeTruthy();
    const teacherLoginBody = await teacherLogin.json();
    const workspace = teacherLoginBody.workspaces.find(
      (item: { schoolId: string; membershipId: string }) => item.schoolId === school.id
    );
    expect(workspace).toBeTruthy();

    const selectTeacher = await selectTestWorkspace(teacherPage, workspace.membershipId);
    expect(selectTeacher.ok()).toBeTruthy();

    const studentPage = await (await browser.newContext()).newPage();
    await createAndLoginTestUser(studentPage, { name: "Offline Test Student", email: studentEmail, password: password });

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

    const adminLogin = await adminPage.request.post("/api/auth/login", {
      data: { email: ownerEmail, password },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const adminLoginBody = await adminLogin.json();
    const adminWorkspace = adminLoginBody.workspaces.find(
      (item: { schoolId: string; membershipId: string }) => item.schoolId === school.id
    );
    expect(adminWorkspace).toBeTruthy();
    const selectOwner = await selectTestWorkspace(adminPage, adminWorkspace.membershipId);
    expect(selectOwner.ok()).toBeTruthy();

    const studentApproval = await adminPage.request.patch(
      `/api/schools/${school.id}/requests/${studentRequest.id}`,
      { data: { action: "APPROVE", classId: schoolClass.id } }
    );
    expect(studentApproval.ok()).toBeTruthy();

    const studentsResponse = await adminPage.request.get(`/api/schools/${school.id}/students`);
    expect(studentsResponse.ok()).toBeTruthy();
    const students = await studentsResponse.json();
    const studentRecord = students.find(
      (item: { user?: { email?: string }; id: string }) => item.user?.email === studentEmail
    );
    expect(studentRecord).toBeTruthy();

    await teacherPage.goto("/attendance");
    await expect(teacherPage.getByRole("heading", { name: "Attendance" })).toBeVisible();
    await expect(teacherPage.getByText(studentRecord.admissionId)).toBeVisible();

    await teacherPage.context().setOffline(true);
    await expect(teacherPage.getByText(/^Offline$/)).toBeVisible();

    const presentButton = teacherPage.getByRole("button", { name: "Present" }).first();
    await presentButton.click();
    await expect(
      teacherPage.getByText(/Saved on this device|Connection dropped/)
    ).toBeVisible();
    await expect(teacherPage.getByText(/waiting to sync/)).toBeVisible();

    await teacherPage.context().setOffline(false);
    await expect(teacherPage.getByText(/^Online$/)).toBeVisible();
    await teacherPage.evaluate(() => window.dispatchEvent(new Event("online")));

    await expect.poll(async () => {
      const response = await teacherPage.request.get(
        `/api/schools/${school.id}/attendance?classId=${schoolClass.id}&date=${new Date().toISOString().slice(0, 10)}`
      );
      if (!response.ok()) return null;
      const records = await response.json();
      const record = records.records?.find((item: { studentId: string }) => item.studentId === studentRecord.id);
      return record?.present ?? null;
    }).toBe(true);
  } finally {
    await owner.close();
    await teacher.close();
  }
});
