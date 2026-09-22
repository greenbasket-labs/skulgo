import { test, expect } from "@playwright/test";

test("personal account can create a school and student can join after admin approval", async ({ browser }) => {
  const ownerEmail = `owner-${Date.now()}@example.com`;
  const studentEmail = `student-${Date.now()}@example.com`;
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

  const schoolResponse = await adminPage.request.post("/api/schools", {
    data: {
      name: "Pilot Community School",
      abbr: "PCS",
      address: "Pilot Road",
      phone: "08000000000",
      email: `school-${Date.now()}@example.com`,
    },
  });
  expect(schoolResponse.ok()).toBeTruthy();
  const school = await schoolResponse.json();
  expect(school.membershipId).toBeTruthy();

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
});
