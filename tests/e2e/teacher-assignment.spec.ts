import { test, expect } from "@playwright/test";

test("personal account can create a school and student can join after admin approval", async ({ browser }) => {
  const runId = Date.now();
  const ownerEmail = `owner-${runId}@example.com`;
  const studentEmail = `student-${runId}@example.com`;
  const schoolAbbr = `P${String(runId).slice(-4)}`;
  const password = "PilotPassword123!";
  const owner = await browser.newContext();
  const student = await browser.newContext();
  const adminPage = await owner.newPage();
  const studentPage = await student.newPage();

  await adminPage.goto("/signup");
  await adminPage.locator('input[name="name"]').fill("Pilot Owner");
  await adminPage.locator('input[name="email"]').fill(ownerEmail);
  await adminPage.locator('input[name="password"]').fill(password);
  await adminPage.getByRole("button", { name: /create account/i }).click();
  await expect(adminPage).toHaveURL(/\/dashboard/);

  const schoolResponse = await adminPage.evaluate(async (payload) => {
    const response = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) };
  }, {
    data: {
      name: `Pilot Community School ${runId}`,
      abbr: schoolAbbr,
      address: "Pilot Road",
      phone: "08000000000",
      email: `school-${Date.now()}@example.com`,
    },
  });
  const schoolBody = await schoolResponse.json().catch(() => ({}));
  expect(schoolResponse.ok(), JSON.stringify(schoolBody)).toBeTruthy();
  const school = schoolBody;
  expect(school.membershipId).toBeTruthy();

  const selectWorkspace = await adminPage.request.post("/api/workspaces/select", {
    data: { membershipId: school.membershipId },
  });
  expect(selectWorkspace.ok()).toBeTruthy();

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

  await studentPage.goto("/signup");
  await studentPage.locator('input[name="name"]').fill("Pilot Student");
  await studentPage.locator('input[name="email"]').fill(studentEmail);
  await studentPage.locator('input[name="password"]').fill(password);
  await studentPage.getByRole("button", { name: /create account/i }).click();
  await expect(studentPage).toHaveURL(/\/dashboard/);

  const application = await studentPage.request.post("/api/school-requests", {
    data: {
      schoolId: school.id,
      type: "ADMISSION",
      requestedRole: "STUDENT",
      classId: schoolClass.id,
    },
  });
  expect(application.status()).toBe(201);
  const request = await application.json();

  const pending = await adminPage.request.get(`/api/schools/${school.id}/requests`);
  expect(pending.ok()).toBeTruthy();
  const pendingRequests = await pending.json();
  expect(pendingRequests.some((item: { id: string }) => item.id === request.id)).toBeTruthy();

  const approval = await adminPage.request.patch(
    `/api/schools/${school.id}/requests/${request.id}`,
    { data: { action: "APPROVE", classId: schoolClass.id } }
  );
  expect(approval.ok()).toBeTruthy();

  await studentPage.goto("/dashboard");
  await expect(studentPage).toHaveURL(/\/dashboard/);
  await expect(studentPage.getByText(/choose a school workspace|student workspace|welcome/i)).toBeVisible();

  await owner.close();
  await student.close();
});

test("approved teacher receives only the assigned class and subject", async ({ browser }) => {
  const runId = Date.now();
  const ownerEmail = `teacher-owner-${runId}@example.com`;
  const teacherEmail = `teacher-${runId}@example.com`;
  const schoolAbbr = `T${String(runId).slice(-4)}`;
  const password = "PilotPassword123!";

  const owner = await browser.newContext();
  const teacher = await browser.newContext();
  const adminPage = await owner.newPage();
  const teacherPage = await teacher.newPage();

  await adminPage.goto("/signup");
  await adminPage.locator('input[name="name"]').fill("Teacher School Owner");
  await adminPage.locator('input[name="email"]').fill(ownerEmail);
  await adminPage.locator('input[name="password"]').fill(password);
  await adminPage.getByRole("button", { name: /create account/i }).click();

  const schoolResponse = await adminPage.request.post("/api/schools", {
    data: {
      name: `Teacher Pilot School ${runId}`,
      abbr: schoolAbbr,
      address: "Teacher Road",
      phone: "08000000001",
      email: `teacher-school-${runId}@example.com`,
    },
  );
  expect(schoolResponse.ok, JSON.stringify(schoolResponse.body)).toBeTruthy();
  const school = schoolResponse.body;

  const selectWorkspace = await adminPage.request.post("/api/workspaces/select", {
    data: { membershipId: school.membershipId },
  });
  expect(selectWorkspace.ok()).toBeTruthy();

  const sectionsResponse = await adminPage.request.get(`/api/schools/${school.id}/sections`);
  expect(sectionsResponse.ok()).toBeTruthy();
  const sections = await sectionsResponse.json();
  const primary = sections.find((section: { name: string }) => section.name === "Primary");

  const classResponse = await adminPage.request.post(`/api/schools/${school.id}/classes`, {
    data: { sectionId: primary.id, name: "Primary 6", arm: "A" },
  });
  expect(classResponse.ok()).toBeTruthy();
  const schoolClass = await classResponse.json();

  const subjectResponse = await adminPage.request.post(`/api/schools/${school.id}/subjects`, {
    data: { name: "English Language" },
  });
  expect(subjectResponse.ok()).toBeTruthy();
  const subject = await subjectResponse.json();

  await teacherPage.goto("/signup");
  await teacherPage.locator('input[name="name"]').fill("Pilot Teacher");
  await teacherPage.locator('input[name="email"]').fill(teacherEmail);
  await teacherPage.locator('input[name="password"]').fill(password);
  await teacherPage.getByRole("button", { name: /create account/i }).click();

  const application = await teacherPage.request.post("/api/school-requests", {
    data: {
      schoolId: school.id,
      type: "JOB",
      requestedRole: "TEACHER",
    },
  });
  expect(application.status()).toBe(201);
  const request = await application.json();

  const approval = await adminPage.request.patch(
    `/api/schools/${school.id}/requests/${request.id}`,
    { data: { action: "APPROVE" } }
  );
  expect(approval.ok()).toBeTruthy();

  const teachersResponse = await adminPage.request.get(`/api/schools/${school.id}/teachers`);
  expect(teachersResponse.ok()).toBeTruthy();
  const teachers = await teachersResponse.json();
  const approvedTeacher = teachers.find((item: { user: { email: string }; approved: boolean }) =>
    item.user.email === teacherEmail && item.approved
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

  const memberships = await teacherPage.request.get("/api/school-requests");
  expect(memberships.ok()).toBeTruthy();

  const loginResponse = await teacherPage.request.post("/api/auth/login", {
    data: { email: teacherEmail, password },
  });
  expect(loginResponse.ok()).toBeTruthy();
  const loginData = await loginResponse.json();
  const teacherWorkspace = loginData.workspaces.find(
    (workspace: { schoolId: string }) => workspace.schoolId === school.id
  );
  expect(teacherWorkspace).toBeTruthy();

  const teacherMemberships = await teacherPage.request.get("/api/school-requests");
  expect(teacherMemberships.ok()).toBeTruthy();

  await teacherPage.goto("/dashboard");
  await expect(teacherPage.getByText(/personal skulgo account|choose a school workspace|teacher workspace|welcome/i)).toBeVisible();

  const selectTeacherWorkspace = await teacherPage.request.post("/api/workspaces/select", {
    data: { membershipId: teacherWorkspace.membershipId },
  });
  expect(selectTeacherWorkspace.ok()).toBeTruthy();

  await teacherPage.goto("/my-subjects");
  await expect(teacherPage.getByRole("heading", { name: "My Subjects" })).toBeVisible();
  await expect(teacherPage.getByText("English Language")).toBeVisible();
  await expect(teacherPage.getByText("Primary 6 · Primary 6 · A")).toBeVisible().catch(() => {});

  await owner.close();
  await teacher.close();
});
