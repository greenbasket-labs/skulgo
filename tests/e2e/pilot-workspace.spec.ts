import { test, expect } from "@playwright/test";
import { createAndLoginTestUser, loginTestUser, selectTestWorkspace, TEST_PIN } from "./helpers/test-auth";

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

  await createAndLoginTestUser(adminPage, { name: "Pilot Owner", email: ownerEmail, password: password });

  const schoolResponse = await adminPage.request.post("/api/schools", {
    data: {
      name: `Pilot Community School ${runId}`,
      abbr: schoolAbbr,
      address: "Pilot Road",
      phone: "08000000000",
      email: `school-${Date.now()}@example.com`,
    },
  });
  expect(schoolResponse.ok()).toBeTruthy();
  const school = await schoolResponse.json();
  expect(school.membershipId).toBeTruthy();

  const selectWorkspace = await selectTestWorkspace(adminPage, school.membershipId);
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

  await createAndLoginTestUser(studentPage, { name: "Pilot Student", email: studentEmail, password: password });

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
});


test("parent can request and receive an approved child link", async ({ browser }) => {
  const runId = Date.now();
  const ownerEmail = `parent-owner-${runId}@example.com`;
  const studentEmail = `parent-student-${runId}@example.com`;
  const parentEmail = `parent-${runId}@example.com`;
  const schoolAbbr = `R${String(runId).slice(-4)}`;
  const password = "PilotPassword123!";

  const owner = await browser.newContext();
  const student = await browser.newContext();
  const parent = await browser.newContext();
  const adminPage = await owner.newPage();
  const studentPage = await student.newPage();
  const parentPage = await parent.newPage();

  await createAndLoginTestUser(adminPage, { name: "Parent Test Owner", email: ownerEmail, password: password });

  const schoolResponse = await adminPage.request.post("/api/schools", {
    data: {
      name: `Parent Test School ${runId}`,
      abbr: schoolAbbr,
      address: "Parent Road",
      phone: "08000000002",
      email: `parent-school-${runId}@example.com`,
    },
  });
  expect(schoolResponse.ok()).toBeTruthy();
  const school = await schoolResponse.json();

  const selectWorkspace = await selectTestWorkspace(adminPage, school.membershipId);
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

  await createAndLoginTestUser(studentPage, { name: "Parent Test Student", email: studentEmail, password: password });

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

  const studentResponse = await adminPage.request.get(`/api/schools/${school.id}/students`);
  expect(studentResponse.ok()).toBeTruthy();
  const students = await studentResponse.json();
  const studentRecord = students.find(
    (item: { user?: { email?: string }; admissionId: string }) => item.user?.email === studentEmail
  );
  expect(studentRecord).toBeTruthy();

  await createAndLoginTestUser(parentPage, { name: "Parent Test User", email: parentEmail, password: password });

  const parentApplication = await parentPage.request.post("/api/school-requests", {
    data: {
      schoolId: school.id,
      type: "ADMISSION",
      requestedRole: "PARENT",
      studentAdmissionId: studentRecord.admissionId,
    },
  });
  expect(parentApplication.status()).toBe(201);
  const parentRequest = await parentApplication.json();

  const parentApproval = await adminPage.request.patch(
    `/api/schools/${school.id}/requests/${parentRequest.id}`,
    { data: { action: "APPROVE" } }
  );
  expect(parentApproval.ok()).toBeTruthy();

  const loginResponse = await parentPage.request.post("/api/auth/login", {
    data: { email: parentEmail, password },
  });
  expect(loginResponse.ok()).toBeTruthy();
  const login = await loginResponse.json();

  const workspace = login.workspaces.find(
    (item: { schoolId: string; membershipId: string; role: string }) =>
      item.schoolId === school.id && item.role === "PARENT"
  );
  expect(workspace).toBeTruthy();

  const selectParentWorkspace = await selectTestWorkspace(parentPage, workspace.membershipId);
  expect(selectParentWorkspace.ok()).toBeTruthy();

  await parentPage.goto("/children");
  await expect(parentPage.getByRole("heading", { name: "My Children" })).toBeVisible();
  await expect(parentPage.getByText(studentRecord.admissionId)).toBeVisible();
  await expect(parentPage.getByText("Primary 5")).toBeVisible();

  await owner.close();
  await student.close();
  await parent.close();
});
