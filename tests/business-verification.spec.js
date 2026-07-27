const { test, expect } = require("@playwright/test");

const owner = {
  id: "507f1f77bcf86cd799439021",
  email: "synthetic-owner@example.test",
  role: "Founder",
  token: "synthetic.owner.token"
};

async function seedSession(page, user = owner) {
  await page.addInitScript((value) => {
    localStorage.setItem("tradeflowToken", value.token);
    localStorage.setItem("tradeflowUser", JSON.stringify(value));
  }, user);
  await page.route("**/api/auth/session", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ valid: true, user })
  }));
}

test("company can save, submit, receive information request and begin versioned resubmission", async ({ page }) => {
  let status = "Not Started";
  let version = 1;
  let savedBody;
  const base = {
    _id: "507f1f77bcf86cd799439031",
    verificationStatus: "Draft",
    verificationVersion: version,
    legalBusinessName: "Synthetic Export Labs",
    verificationCategory: "Exporter",
    documents: [],
    reviewHistory: []
  };
  await seedSession(page);
  await page.route("**/api/business-verification/requirements**", (route) => route.fulfill({
    status: 200, contentType: "application/json",
    body: JSON.stringify({ requiredDocuments: ["Company Registration", "IEC Evidence"] })
  }));
  await page.route("**/api/business-verification/me**", async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname.endsWith("/resubmit")) {
      status = "Draft"; version += 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ verification: { ...base, verificationStatus: status, verificationVersion: version } }) });
    }
    if (url.pathname.endsWith("/submit")) {
      status = "Submitted";
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ verification: { ...base, verificationStatus: status } }) });
    }
    if (method === "PUT") {
      savedBody = JSON.parse(route.request().postData());
      status = "Draft";
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ verification: { ...base, ...savedBody }, missingRequirements: [] }) });
    }
    return route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify(status === "Not Started"
        ? { verification: null, status, requiredDocuments: [] }
        : { verification: { ...base, ...savedBody, verificationStatus: status, verificationVersion: version }, missingRequirements: [], requiredDocuments: ["Company Registration", "IEC Evidence"] })
    });
  });

  await page.goto("/business-verification.html");
  await expect(page.getByRole("heading", { name: "Business Verification" })).toBeVisible();
  await page.locator('[name="legalBusinessName"]').fill("Synthetic Export Labs");
  await page.locator('[name="businessType"]').fill("Exporter");
  await page.locator('[name="country"]').fill("India");
  await page.locator('[name="incorporationType"]').fill("Private Limited");
  await page.locator('[name="incorporationNumber"]').fill("U12345DL2020PTC123456");
  await page.locator('[name="businessEmail"]').fill("company@example.test");
  await page.locator('[name="businessPhone"]').fill("+91 9999999999");
  await page.locator('[name="registeredAddress"]').fill("Synthetic address");
  await page.locator('[name="authorizedRepresentativeName"]').fill("Test Owner");
  await page.locator('[name="authorizedRepresentativeDesignation"]').fill("Director");
  await page.locator('[name="representativeAuthorityDeclaration"]').check();
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Draft saved");
  expect(savedBody.ownerEmail).toBeUndefined();
  expect(savedBody.companyId).toBeUndefined();

  await page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.locator("#status")).toHaveText("Submitted");

  status = "More Information Required";
  await page.reload();
  await expect(page.getByRole("button", { name: "Start resubmission" })).toBeVisible();
  await page.getByRole("button", { name: "Start resubmission" }).click();
  await expect(page.locator("#status")).toHaveText("Draft");
  expect(version).toBe(2);
});

test("ordinary session cannot render Master Admin verification controls or privileged data", async ({ page }) => {
  await seedSession(page);
  await page.route("**/api/workspaces**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route("**/api/beta/**", (route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ success: false, message: "Master Admin access required" }) }));
  let adminQueueRequested = false;
  await page.route("**/api/business-verification/admin**", (route) => {
    adminQueueRequested = true;
    return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ success: false, message: "Master Admin access required" }) });
  });
  await page.goto("/master-admin.html");
  await expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible();
  await expect(page.getByText("Business Verification Review Center")).toHaveCount(0);
  expect(adminQueueRequested).toBe(false);
});
