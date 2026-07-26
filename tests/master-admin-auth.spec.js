const { test, expect } = require("@playwright/test");

const MASTER_EMAILS = [
  "contact@tradeflowai.in",
  "ks2353013@gmail.com"
];

async function mockMasterApis(page, options = {}) {
  const email = options.email || MASTER_EMAILS[0];
  const role = options.role || "Master Admin";
  const sessionStatus = options.sessionStatus || 200;
  const statusUpdates = options.statusUpdates || [];

  await page.route("**/api/auth/session", async (route) => {
    if (sessionStatus !== 200) {
      return route.fulfill({
        status: sessionStatus,
        contentType: "application/json",
        body: JSON.stringify({ valid: false, message: "Session expired" })
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        valid: true,
        user: {
          id: "507f1f77bcf86cd799439011",
          name: "Master Admin QA",
          email,
          companyName: "TradeFlow",
          role
        }
      })
    });
  });

  await page.route("**/api/auth/refresh", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ success: false, message: "No refresh session" })
    })
  );

  await page.route("**/api/workspaces**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([])
    })
  );

  await page.route("**/api/beta/**", async (route) => {
    if (route.request().method() === "PUT") {
      statusUpdates.push(JSON.parse(route.request().postData() || "{}").status);
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        companies: [],
        users: [],
        feedback: [{
          _id: "6a6500bf44c49a9cf354ca04",
          type: "feedback",
          status: "Open",
          message: "QA feedback"
        }],
        support: [],
        usage: []
      })
    });
  });
}

async function seedCanonicalSession(page, email) {
  await page.addInitScript(({ seededEmail }) => {
    const token = "verified.test.token";
    const user = {
      email: seededEmail,
      companyName: "TradeFlow",
      role: "Master Admin",
      token,
      accessToken: token
    };
    localStorage.setItem("tradeflowToken", token);
    localStorage.setItem("tradeflowUser", JSON.stringify(user));
  }, { seededEmail: email });
}

for (const email of MASTER_EMAILS) {
  test(`canonical Master Admin session loads and persists for ${email}`, async ({ page }) => {
    await seedCanonicalSession(page, email);
    await mockMasterApis(page, { email });

    await page.goto("/master-admin.html");
    await expect(page.locator("#adminInfo")).toContainText(email);
    await expect(page.getByText("No admin token")).toHaveCount(0);

    await page.reload();
    await expect(page.locator("#adminInfo")).toContainText(email);
  });
}

test("ordinary authenticated user sees Access Denied", async ({ page }) => {
  await seedCanonicalSession(page, "ordinary@example.com");
  await mockMasterApis(page, {
    email: "ordinary@example.com",
    role: "Founder"
  });
  await page.goto("/master-admin.html");
  await expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible();
});

test("missing and stale tokens use the canonical login redirect", async ({ page }) => {
  await mockMasterApis(page, { sessionStatus: 401 });
  await page.goto("/master-admin.html");
  await expect(page).toHaveURL(/\/login\?next=%2Fmaster-admin\.html|\/login\?next=\/master-admin\.html/);

  await seedCanonicalSession(page, MASTER_EMAILS[0]);
  await page.goto("/master-admin.html");
  await expect(page).toHaveURL(/\/login\?next=%2Fmaster-admin\.html|\/login\?next=\/master-admin\.html/);
});

test("login honors approved internal next and rejects external next", async ({ page }) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        token: "login.test.token",
        user: {
          email: MASTER_EMAILS[0],
          role: "Master Admin",
          onboardingCompleted: true
        }
      })
    })
  );

  await page.goto("/login?next=/master-admin.html");
  await page.locator("#loginEmail").fill(MASTER_EMAILS[0]);
  await page.locator("#loginPassword").fill("synthetic-test-password");
  await page.locator("#loginForm").evaluate((form) => form.requestSubmit());
  await expect(page).toHaveURL(/\/master-admin\.html$/, { timeout: 5000 });

  await page.goto("/login?next=https://evil.example/steal");
  await page.locator("#loginEmail").fill(MASTER_EMAILS[0]);
  await page.locator("#loginPassword").fill("synthetic-test-password");
  await page.locator("#loginForm").evaluate((form) => form.requestSubmit());
  await expect(page).toHaveURL(/\/app$/, { timeout: 5000 });
});

test("Beta Feedback QA status sequence is sent through the protected API", async ({ page }) => {
  const statusUpdates = [];
  await seedCanonicalSession(page, MASTER_EMAILS[0]);
  await mockMasterApis(page, { statusUpdates });
  await page.goto("/master-admin.html");

  await page.evaluate(async () => {
    for (const status of ["Open", "In Review", "Resolved", "Closed"]) {
      await window.setBetaFeedbackStatus("6a6500bf44c49a9cf354ca04", status);
    }
  });

  expect(statusUpdates).toEqual(["Open", "In Review", "Resolved", "Closed"]);
});
