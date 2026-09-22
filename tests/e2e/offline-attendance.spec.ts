import { test, expect } from "@playwright/test";

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
    await adminPage.goto("/signup");
    await adminPage.locator('input[name="name"]').fill("Offline Test Owner");
    await adminPage.locator('input[name="email"]').fill(ownerEmail);
    await adminPage.locator('input[name="password"]').fill(password);
    await adminPage.getByRole("button", { name: /create account/i }).click();
    await expect(adminPage).toHaveURL(/\/dashboard/);

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

    const selectAdmin = await adminPage.request.post("/api/workspaces/select", {
      data: { membershipId: school.membershipId },
    });
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

    await teacherPage.goto("/signup");
    await teacherPage.locator('input[name="name"]').fill("Offline Test Teacher");
    await teacherPage.locator('input[name="email"]').fill(teacherEmail);
    await teacherPage.locator('input[name="password"]').fill(password);
    await teacherPage.getByRole("button", { name: /create account/i }).click();
    await expect(teacherPage).toHaveURL(/\/dashboard/);

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

    await teacherPage.goto("/signup");
    await teacherPage.request.post("/api/auth/login", {
      data: { email: teacherEmail, password },
    });

    await adminPage.goto("/signup");
    await adminPage.request.post("/api/auth/login", {
      data: { email: ownerEmail, password },
    });

    await teacherPage.goto("/dashboard");
    const teacherLogin = await teacherPage.request.post("/api/auth/login", {
      data: { email: teacherEmail, password },
    });
    expect(teacherLogin.ok()).toBeTruthy();
    const teacherLoginBody = await teacherLogin.json();
    const workspace = teacherLoginBody.workspaces.find(
      (item: { schoolId: string; membershipId: string }) => item.schoolId === school.id
    );
    expect(workspace).toBeTruthy();

    const selectTeacher = await teacherPage.request.post("/api/workspaces/select", {
      data: { membershipId: workspace.membershipId },
    });
    expect(selectTeacher.ok()).toBeTruthy();

    await adminPage.goto("/signup");
    await adminPage.locator('input[name="name"]').fill("Offline Test Student");
    await adminPage.locator('input[name="email"]').fill(studentEmail);
    await adminPage.locator('input[name="password"]').fill(password);
    await adminPage.getByRole("button", { name: /create account/i }).click();
    await expect(adminPage).toHaveURL(/\/dashboard/);

    const studentApplication = await adminPage.request.post("/api/school-requests", {
      data: {
        schoolId: school.id,
        type: "ADMISSION",
        requestedRole: "STUDENT",
        classId: schoolClass.id,
      },
    });
    expect(studentApplication.status()).toBe(201);
    const studentRequest = await studentApplication.json();

    const studentApproval = await teacherPage.request.patch(
      `/api/schools/${school.id}/requests/${studentRequest.id}`,
      { data: { action: "APPROVE", classId: schoolClass.id } }
    );
    expect(studentApproval.ok()).toBeTruthy();

    const studentsResponse = await teacherPage.request.get(`/api/schools/${school.id}/students`);
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

    await expect.poll(async () => {
      const response = await teacherPage.request.get(
        `/api/schools/${school.id}/attendance?classId=${schoolClass.id}&date=${new Date().toISOString().slice(0, 10)}`
      );
      if (!response.ok()) return null;
      const records = await response.json();
      const record = records.find((item: { studentId: string }) => item.studentId === studentRecord.id);
      return record?.present ?? null;
    }).toBe(true);
  } finally {
    await owner.close();
    await teacher.close();
  }
});
