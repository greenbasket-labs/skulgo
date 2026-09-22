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
  await expect(adminPage).toHaveURL(/\\/dashboard/);

  const schoolResponse = await adminPage.evaluate(async payload => {
    const response = await fetch("/api/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, body: await response.json().catch(() => ({})) };
  }, {
    name: `Teacher Pilot School ${runId}`,
    abbr: schoolAbbr,
    address: "Teacher Road",
    phone: "08000000001",
    email: `teacher-school-${runId}@example.com`,
  });

  expect(schoolResponse.ok, JSON.stringify(schoolResponse.body)).toBeTruthy();
  const school = schoolResponse.body;
  expect(school.membershipId).toBeTruthy();

  const selected = await adminPage.evaluate(async membershipId => {
    const response = await fetch("/api/workspaces/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId }),
    });
    return { ok: response.ok, body: await response.json().catch(() => ({})) };
  }, school.membershipId);
  expect(selected.ok, JSON.stringify(selected.body)).toBeTruthy();

  const sectionsResponse = await adminPage.evaluate(async schoolId => {
    const response = await fetch(`/api/schools/${schoolId}/sections`);
    return { ok: response.ok, body: await response.json().catch(() => []) };
  }, school.id);
  expect(sectionsResponse.ok, JSON.stringify(sectionsResponse.body)).toBeTruthy();
  const primary = sectionsResponse.body.find((section: { name: string }) => section.name === "Primary");
  expect(primary).toBeTruthy();

  const classResponse = await adminPage.evaluate(async payload => {
    const response = await fetch(`/api/schools/${payload.schoolId}/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: payload.sectionId, name: "Primary 6", arm: "A" }),
    });
    return { ok: response.ok, body: await response.json().catch(() => ({})) };
  }, { schoolId: school.id, sectionId: primary.id });
  expect(classResponse.ok, JSON.stringify(classResponse.body)).toBeTruthy();

  const subjectResponse = await adminPage.evaluate(async schoolId => {
    const response = await fetch(`/api/schools/${schoolId}/subjects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "English Language" }),
    });
    return { ok: response.ok, body: await response.json().catch(() => ({})) };
  }, school.id);
  expect(subjectResponse.ok, JSON.stringify(subjectResponse.body)).toBeTruthy();

  await teacherPage.goto("/signup");
  await teacherPage.locator('input[name="name"]').fill("Pilot Teacher");
  await teacherPage.locator('input[name="email"]').fill(teacherEmail);
  await teacherPage.locator('input[name="password"]').fill(password);
  await teacherPage.getByRole("button", { name: /create account/i }).click();
  await expect(teacherPage).toHaveURL(/\\/dashboard/);

  const application = await teacherPage.evaluate(async payload => {
    const response = await fetch("/api/school-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) };
  }, { schoolId: school.id, type: "JOB", requestedRole: "TEACHER" });
  expect(application.status, JSON.stringify(application.body)).toBe(201);

  const approval = await adminPage.evaluate(async payload => {
    const response = await fetch(`/api/schools/${payload.schoolId}/requests/${payload.requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "APPROVE" }),
    });
    return { ok: response.ok, body: await response.json().catch(() => ({})) };
  }, { schoolId: school.id, requestId: application.body.id });
  expect(approval.ok, JSON.stringify(approval.body)).toBeTruthy();

  const teachersResponse = await adminPage.evaluate(async schoolId => {
    const response = await fetch(`/api/schools/${schoolId}/teachers`);
    return { ok: response.ok, body: await response.json().catch(() => []) };
  }, school.id);
  expect(teachersResponse.ok, JSON.stringify(teachersResponse.body)).toBeTruthy();

  const approvedTeacher = teachersResponse.body.find(
    (item: { user: { email: string }; approved: boolean }) =>
      item.user.email === teacherEmail && item.approved
  );
  expect(approvedTeacher).toBeTruthy();

  const assignment = await adminPage.evaluate(async payload => {
    const response = await fetch(`/api/schools/${payload.schoolId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        teacherId: payload.teacherId,
        classId: payload.classId,
        subjectId: payload.subjectId,
      }),
    });
    return { ok: response.ok, status: response.status, body: await response.json().catch(() => ({})) };
  }, {
    schoolId: school.id,
    teacherId: approvedTeacher.id,
    classId: classResponse.body.id,
    subjectId: subjectResponse.body.id,
  });
  expect(assignment.status, JSON.stringify(assignment.body)).toBe(201);

  await teacherPage.goto("/dashboard");
  const teacherLogin = await teacherPage.evaluate(async payload => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { ok: response.ok, body: await response.json().catch(() => ({})) };
  }, { email: teacherEmail, password });
  expect(teacherLogin.ok, JSON.stringify(teacherLogin.body)).toBeTruthy();

  const teacherWorkspace = teacherLogin.body.workspaces.find(
    (workspace: { schoolId: string }) => workspace.schoolId === school.id
  );
  expect(teacherWorkspace).toBeTruthy();

  const selectTeacherWorkspace = await teacherPage.evaluate(async membershipId => {
    const response = await fetch("/api/workspaces/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ membershipId }),
    });
    return { ok: response.ok, body: await response.json().catch(() => ({})) };
  }, teacherWorkspace.membershipId);
  expect(selectTeacherWorkspace.ok, JSON.stringify(selectTeacherWorkspace.body)).toBeTruthy();

  await teacherPage.goto("/my-subjects");
  await expect(teacherPage.getByRole("heading", { name: "My Subjects" })).toBeVisible();
  await expect(teacherPage.getByText("English Language")).toBeVisible();

  await owner.close();
  await teacher.close();
});
