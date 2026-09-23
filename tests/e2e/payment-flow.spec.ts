import { test, expect } from "@playwright/test";

test("student payment is visible to parent and cashier", async ({ browser }) => {
  const runId = Date.now();
  const password = "PaymentPilot123!";
  const ownerEmail = `pay-owner-${runId}@example.com`;
  const studentEmail = `pay-student-${runId}@example.com`;
  const parentEmail = `pay-parent-${runId}@example.com`;
  const cashierEmail = `pay-cashier-${runId}@example.com`;
  const schoolAbbr = `F${String(runId).slice(-4)}`;

  const owner = await browser.newContext();
  const student = await browser.newContext();
  const parent = await browser.newContext();
  const cashier = await browser.newContext();

  const adminPage = await owner.newPage();
  const studentPage = await student.newPage();
  const parentPage = await parent.newPage();
  const cashierPage = await cashier.newPage();

  try {
    await adminPage.goto("/signup");
    await adminPage.locator('input[name="name"]').fill("Payment Test Owner");
    await adminPage.locator('input[name="email"]').fill(ownerEmail);
    await adminPage.locator('input[name="password"]').fill(password);
    await adminPage.getByRole("button", { name: /create account/i }).click();
    await expect(adminPage).toHaveURL(/\/dashboard/);

    const schoolResponse = await adminPage.request.post("/api/schools", {
      data: {
        name: `Payment Pilot School ${runId}`,
        abbr: schoolAbbr,
        address: "Payment Road",
        phone: "08000000003",
        email: `payment-school-${runId}@example.com`,
      },
    });
    expect(schoolResponse.ok(), await schoolResponse.text()).toBeTruthy();
    const school = await schoolResponse.json();

    const workspace = await adminPage.request.post("/api/workspaces/select", {
      data: { membershipId: school.membershipId },
    });
    expect(workspace.ok(), await workspace.text()).toBeTruthy();

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

    await studentPage.goto("/signup");
    await studentPage.locator('input[name="name"]').fill("Payment Test Student");
    await studentPage.locator('input[name="email"]').fill(studentEmail);
    await studentPage.locator('input[name="password"]').fill(password);
    await studentPage.getByRole("button", { name: /create account/i }).click();
    await expect(studentPage).toHaveURL(/\/dashboard/);

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
    expect(studentApproval.ok(), await studentApproval.text()).toBeTruthy();

    const studentsResponse = await adminPage.request.get(`/api/schools/${school.id}/students`);
    expect(studentsResponse.ok()).toBeTruthy();
    const students = await studentsResponse.json();
    const studentRecord = students.find(
      (item: { user?: { email?: string }; id: string; admissionId: string }) =>
        item.user?.email === studentEmail
    );
    expect(studentRecord).toBeTruthy();

    const feeResponse = await adminPage.request.post(`/api/schools/${school.id}/fees`, {
      data: { studentId: studentRecord.id, totalFee: 50000 },
    });
    expect(feeResponse.status(), await feeResponse.text()).toBe(201);

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

    const selectStudent = await studentPage.request.post("/api/workspaces/select", {
      data: { membershipId: studentWorkspace.membershipId },
    });
    expect(selectStudent.ok()).toBeTruthy();

    const studentFeesBefore = await studentPage.request.get(
      `/api/schools/${school.id}/fees?studentId=${studentRecord.id}`
    );
    expect(studentFeesBefore.ok()).toBeTruthy();
    const before = await studentFeesBefore.json();
    expect(before[0].balance).toBe(50000);

    const payment = await studentPage.request.post(`/api/schools/${school.id}/payments`, {
      data: { studentId: studentRecord.id, amount: 20000, reference: `E2E-${runId}-student` },
    });
    expect(payment.status(), await payment.text()).toBe(201);
    const paymentBody = await payment.json();
    expect(paymentBody.balance).toBe(30000);

    const studentFeesAfter = await studentPage.request.get(
      `/api/schools/${school.id}/fees?studentId=${studentRecord.id}`
    );
    expect(studentFeesAfter.ok()).toBeTruthy();
    expect((await studentFeesAfter.json())[0].balance).toBe(30000);

    await parentPage.goto("/signup");
    await parentPage.locator('input[name="name"]').fill("Payment Test Parent");
    await parentPage.locator('input[name="email"]').fill(parentEmail);
    await parentPage.locator('input[name="password"]').fill(password);
    await parentPage.getByRole("button", { name: /create account/i }).click();
    await expect(parentPage).toHaveURL(/\/dashboard/);

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

    const parentLogin = await parentPage.request.post("/api/auth/login", {
      data: { email: parentEmail, password },
    });
    expect(parentLogin.ok()).toBeTruthy();
    const parentLoginBody = await parentLogin.json();
    const parentWorkspace = parentLoginBody.workspaces.find(
      (item: { schoolId: string; membershipId: string; role: string }) =>
        item.schoolId === school.id && item.role === "PARENT"
    );
    expect(parentWorkspace).toBeTruthy();

    const selectParent = await parentPage.request.post("/api/workspaces/select", {
      data: { membershipId: parentWorkspace.membershipId },
    });
    expect(selectParent.ok()).toBeTruthy();

    const parentFees = await parentPage.request.get(
      `/api/schools/${school.id}/fees?studentId=${studentRecord.id}`
    );
    expect(parentFees.ok()).toBeTruthy();
    expect((await parentFees.json())[0].balance).toBe(30000);

    const parentPayment = await parentPage.request.post(`/api/schools/${school.id}/payments`, {
      data: { studentId: studentRecord.id, amount: 10000, reference: `E2E-${runId}-parent` },
    });
    expect(parentPayment.status(), await parentPayment.text()).toBe(201);
    expect((await parentPayment.json()).balance).toBe(20000);

    const cashierPageSignup = await cashierPage.goto("/signup");
    expect(cashierPageSignup?.ok()).toBeTruthy();
    await cashierPage.locator('input[name="name"]').fill("Payment Test Cashier");
    await cashierPage.locator('input[name="email"]').fill(cashierEmail);
    await cashierPage.locator('input[name="password"]').fill(password);
    await cashierPage.getByRole("button", { name: /create account/i }).click();
    await expect(cashierPage).toHaveURL(/\/dashboard/);

    const cashierApplication = await cashierPage.request.post("/api/school-requests", {
      data: { schoolId: school.id, type: "JOB", requestedRole: "CASHIER" },
    });
    expect(cashierApplication.status()).toBe(201);
    const cashierRequest = await cashierApplication.json();

    const cashierApproval = await adminPage.request.patch(
      `/api/schools/${school.id}/requests/${cashierRequest.id}`,
      { data: { action: "APPROVE" } }
    );
    expect(cashierApproval.ok(), await cashierApproval.text()).toBeTruthy();

    const cashierLogin = await cashierPage.request.post("/api/auth/login", {
      data: { email: cashierEmail, password },
    });
    expect(cashierLogin.ok()).toBeTruthy();
    const cashierLoginBody = await cashierLogin.json();
    const cashierWorkspace = cashierLoginBody.workspaces.find(
      (item: { schoolId: string; membershipId: string; role: string }) =>
        item.schoolId === school.id && item.role === "CASHIER"
    );
    expect(cashierWorkspace).toBeTruthy();

    const selectCashier = await cashierPage.request.post("/api/workspaces/select", {
      data: { membershipId: cashierWorkspace.membershipId },
    });
    expect(selectCashier.ok()).toBeTruthy();

    const cashierFees = await cashierPage.request.get(
      `/api/schools/${school.id}/fees?studentId=${studentRecord.id}`
    );
    expect(cashierFees.ok()).toBeTruthy();
    expect((await cashierFees.json())[0].balance).toBe(20000);

    const cashierPayment = await cashierPage.request.post(`/api/schools/${school.id}/payments`, {
      data: { studentId: studentRecord.id, amount: 5000, reference: `E2E-${runId}-cashier` },
    });
    expect(cashierPayment.status(), await cashierPayment.text()).toBe(201);
    expect((await cashierPayment.json()).balance).toBe(15000);

    const finalStudent = await studentPage.request.get(
      `/api/schools/${school.id}/fees?studentId=${studentRecord.id}`
    );
    expect(finalStudent.ok()).toBeTruthy();
    expect((await finalStudent.json())[0].balance).toBe(15000);

    const finalParent = await parentPage.request.get(
      `/api/schools/${school.id}/fees?studentId=${studentRecord.id}`
    );
    expect(finalParent.ok()).toBeTruthy();
    expect((await finalParent.json())[0].balance).toBe(15000);
  } finally {
    await owner.close();
    await student.close();
    await parent.close();
    await cashier.close();
  }
});


test("student can queue a payment offline and it syncs when online returns", async ({ browser }) => {
  const runId = Date.now();
  const password = "PaymentOffline123!";
  const ownerEmail = `pay-offline-owner-${runId}@example.com`;
  const studentEmail = `pay-offline-student-${runId}@example.com`;
  const schoolAbbr = `Q${String(runId).slice(-4)}`;

  const owner = await browser.newContext();
  const student = await browser.newContext();
  const adminPage = await owner.newPage();
  const studentPage = await student.newPage();

  try {
    await adminPage.goto("/signup");
    await adminPage.locator('input[name="name"]').fill("Offline Payment Owner");
    await adminPage.locator('input[name="email"]').fill(ownerEmail);
    await adminPage.locator('input[name="password"]').fill(password);
    await adminPage.getByRole("button", { name: /create account/i }).click();
    await expect(adminPage).toHaveURL(/\/dashboard/);

    const schoolResponse = await adminPage.request.post("/api/schools", {
      data: {
        name: `Offline Payment School ${runId}`,
        abbr: schoolAbbr,
        address: "Offline Payment Road",
        phone: "08000000005",
        email: `pay-offline-school-${runId}@example.com`,
      },
    });
    expect(schoolResponse.ok(), await schoolResponse.text()).toBeTruthy();
    const school = await schoolResponse.json();

    await adminPage.request.post("/api/workspaces/select", {
      data: { membershipId: school.membershipId },
    });

    const sectionsResponse = await adminPage.request.get(`/api/schools/${school.id}/sections`);
    expect(sectionsResponse.ok()).toBeTruthy();
    const sections = await sectionsResponse.json();
    const primary = sections.find((section: { name: string }) => section.name === "Primary");
    expect(primary).toBeTruthy();

    const classResponse = await adminPage.request.post(`/api/schools/${school.id}/classes`, {
      data: { sectionId: primary.id, name: "Primary 5", arm: "A" },
    });
    expect(classResponse.status()).toBe(201);
    const schoolClass = await classResponse.json();

    await studentPage.goto("/signup");
    await studentPage.locator('input[name="name"]').fill("Offline Payment Student");
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

    const approval = await adminPage.request.patch(
      `/api/schools/${school.id}/requests/${request.id}`,
      { data: { action: "APPROVE", classId: schoolClass.id } }
    );
    expect(approval.ok()).toBeTruthy();

    const studentsResponse = await adminPage.request.get(`/api/schools/${school.id}/students`);
    expect(studentsResponse.ok()).toBeTruthy();
    const students = await studentsResponse.json();
    const studentRecord = students.find(
      (item: { user?: { email?: string }; id: string }) => item.user?.email === studentEmail
    );
    expect(studentRecord).toBeTruthy();

    const feeResponse = await adminPage.request.post(`/api/schools/${school.id}/fees`, {
      data: { studentId: studentRecord.id, totalFee: 50000 },
    });
    expect(feeResponse.status()).toBe(201);

    const login = await studentPage.request.post("/api/auth/login", {
      data: { email: studentEmail, password },
    });
    expect(login.ok()).toBeTruthy();
    const loginBody = await login.json();
    const workspace = loginBody.workspaces.find(
      (item: { schoolId: string; membershipId: string }) => item.schoolId === school.id
    );
    expect(workspace).toBeTruthy();

    const selected = await studentPage.request.post("/api/workspaces/select", {
      data: { membershipId: workspace.membershipId },
    });
    expect(selected.ok()).toBeTruthy();

    await studentPage.goto("/fees");
    await expect(studentPage.getByRole("heading", { name: "School fees" })).toBeVisible();
    await expect(studentPage.getByText("₦50,000")).toHaveCount(2);

    await studentPage.context().setOffline(true);
    await expect(studentPage.getByText(/^Offline$/)).toBeVisible();

    await studentPage.locator('input[placeholder="Payment amount"]').fill("10000");
    await studentPage.getByRole("button", { name: "Record payment" }).click();

    await expect(studentPage.getByText(/Payment saved on this device/)).toBeVisible();
    await expect(studentPage.getByText(/1 payment\(s\) waiting to sync/)).toBeVisible();

    const serverBefore = await adminPage.request.get(
      `/api/schools/${school.id}/fees?studentId=${studentRecord.id}`
    );
    expect(serverBefore.ok()).toBeTruthy();
    expect((await serverBefore.json())[0].balance).toBe(50000);

    await studentPage.context().setOffline(false);
    await expect(studentPage.getByText(/^Online$/)).toBeVisible();
    await studentPage.evaluate(() => window.dispatchEvent(new Event("online")));

    await expect.poll(async () => {
      const response = await adminPage.request.get(
        `/api/schools/${school.id}/fees?studentId=${studentRecord.id}`
      );
      if (!response.ok()) return null;
      const records = await response.json();
      return records[0]?.balance ?? null;
    }, { timeout: 10000 }).toBe(40000);
  } finally {
    await owner.close();
    await student.close();
  }
});
