const path = require("node:path");
const { createRequire } = require("node:module");
const { test, expect } = require("@playwright/test");

const backendRequire = createRequire(path.resolve(__dirname, "../backend/server.js"));
const mongoose = backendRequire("mongoose");

backendRequire("dotenv").config({
  path: path.resolve(__dirname, "../backend/.env")
});

const User = require("../backend/models/User");
const Company = require("../backend/models/Company");
const Workspace = require("../backend/models/Workspace");
const Subscription = require("../backend/models/Subscription");
const Activity = require("../backend/models/Activity");
const Supplier = require("../backend/models/Supplier");
const TradeMission = require("../backend/models/TradeMission");
const CRMLead = require("../backend/models/CRMLead");
const OutreachApproval = require("../backend/models/OutreachApproval");
const ApprovalAuditLog = require("../backend/models/ApprovalAuditLog");
const EmailDelivery = require("../backend/models/EmailDelivery");
const AuditLog = require("../backend/models/AuditLog");
const AutomationWorkflow = require("../backend/models/AutomationWorkflow2");

const BASE_URL = process.env.TRADEFLOW_E2E_BASE_URL || "http://localhost:5000";
const PASSWORD = "Iteration2SmokePass123!";

function uniqueEmail() {
  return `iteration2.e2e.${Date.now()}@tradeflowai.in`;
}

function isMongoObjectId(value) {
  return /^[a-fA-F0-9]{24}$/.test(String(value || ""));
}

function isExpectedBrowserResourceConsole(text) {
  return /^Failed to load resource: the server responded with a status of 403 \(Forbidden\)$/.test(text);
}

async function ensureMongo() {
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required for the Iteration 2 E2E fixture");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000
  });
}

async function createFixture() {
  await ensureMongo();
  const email = uniqueEmail();

  const user = await User.create({
    name: "Iteration 2 E2E Smoke",
    email,
    password: PASSWORD,
    role: "Founder",
    companyName: "Iteration 2 E2E Smoke Co",
    onboardingCompleted: true,
    tokenVersion: 0
  });

  const company = await Company.create({
    ownerId: user._id,
    ownerEmail: email,
    companyName: "Iteration 2 E2E Smoke Co",
    businessType: "Trading Company",
    businessTypeLocked: true,
    approvalStatus: "Approved",
    status: "Active"
  });

  const workspace = await Workspace.create({
    ownerEmail: email,
    companyId: company._id,
    workspaceName: "Iteration 2 E2E Smoke Workspace",
    type: "Export",
    status: "Active",
    members: [{ email, role: "Owner" }]
  });

  await User.findByIdAndUpdate(user._id, {
    companyId: company._id,
    workspaceId: workspace._id
  });

  await Subscription.create({
    userId: user._id,
    email,
    plan: "Pro Exporter",
    status: "Active",
    approvalStatus: "Not Required"
  });

  return {
    email,
    userId: String(user._id),
    companyId: String(company._id),
    workspaceId: String(workspace._id),
    ids: {
      users: [user._id],
      companies: [company._id],
      workspaces: [workspace._id]
    }
  };
}

async function cleanupFixture(fixture, created = {}) {
  if (!fixture) return { skipped: true };
  await ensureMongo();

  const ownerEmail = fixture.email;
  const companyId = fixture.companyId;
  const workspaceId = fixture.workspaceId;
  const missionIds = created.missionIds || [];
  const crmLeadIds = created.crmLeadIds || [];
  const approvalIds = created.approvalIds || [];
  const deliveryIds = created.deliveryIds || [];

  const result = {};

  result.approvalAuditLogs = (
    await ApprovalAuditLog.collection.deleteMany({
      outreachApprovalId: { $in: approvalIds.map((id) => new mongoose.Types.ObjectId(id)) }
    })
  ).deletedCount;
  result.emailDeliveries = (
    await EmailDelivery.deleteMany({
      $or: [
        { _id: { $in: deliveryIds } },
        { ownerEmail, workspaceId }
      ]
    })
  ).deletedCount;
  result.outreachApprovals = (
    await OutreachApproval.deleteMany({
      _id: { $in: approvalIds },
      ownerEmail,
      workspaceId
    })
  ).deletedCount;
  result.crmLeads = (
    await CRMLead.deleteMany({
      _id: { $in: crmLeadIds },
      ownerEmail,
      workspaceId
    })
  ).deletedCount;
  result.missions = (
    await TradeMission.deleteMany({
      _id: { $in: missionIds },
      ownerEmail,
      workspaceId
    })
  ).deletedCount;
  result.auditLogs = (
    await AuditLog.deleteMany({
      ownerEmail,
      companyId,
      workspaceId
    })
  ).deletedCount;
  result.activities = (
    await Activity.deleteMany({ ownerEmail, workspaceId })
  ).deletedCount;
  result.suppliers = (
    await Supplier.deleteMany({ ownerEmail, workspaceId })
  ).deletedCount;
  result.workflows = (
    await AutomationWorkflow.deleteMany({ ownerEmail, workspaceId })
  ).deletedCount;
  result.subscriptions = (
    await Subscription.deleteMany({ email: ownerEmail })
  ).deletedCount;
  result.workspaces = (
    await Workspace.deleteMany({ _id: fixture.workspaceId, ownerEmail })
  ).deletedCount;
  result.companies = (
    await Company.deleteMany({ _id: fixture.companyId, ownerEmail })
  ).deletedCount;
  result.users = (
    await User.deleteMany({ _id: fixture.userId, email: ownerEmail })
  ).deletedCount;

  return result;
}

async function responseJson(response) {
  const contentType = response.headers()["content-type"] || "";
  expect(contentType, `${response.url()} returned non-JSON`).toContain("application/json");
  return response.json();
}

async function api(page, method, pathName, token, workspaceId, body) {
  return page.evaluate(
    async ({ method: requestMethod, pathName: requestPath, token: authToken, workspaceId: activeWorkspaceId, body: requestBody }) => {
      const response = await fetch(requestPath, {
        method: requestMethod,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
          "x-workspace-id": activeWorkspaceId
        },
        body: requestBody === undefined ? undefined : JSON.stringify(requestBody)
      });
      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();
      return {
        status: response.status,
        contentType,
        payload
      };
    },
    { method, pathName, token, workspaceId, body }
  );
}

test.describe("Iteration 2 rendered release smoke", () => {
  test("mission to approved dry-run email flow", async ({ page, request }) => {
    const consoleErrors = [];
    const failedRequests = [];
    const unexpectedApiResponses = [];
    let fixture;
    const created = {
      missionIds: [],
      crmLeadIds: [],
      approvalIds: [],
      deliveryIds: []
    };

    page.on("console", (message) => {
      if (message.type() === "error") {
        const text = message.text();
        if (!/favicon|ResizeObserver/i.test(text)) {
          consoleErrors.push(text);
        }
      }
    });

    page.on("requestfailed", (requestInfo) => {
      failedRequests.push({
        method: requestInfo.method(),
        url: requestInfo.url(),
        failure: requestInfo.failure()?.errorText || ""
      });
    });

    page.on("response", async (response) => {
      const url = response.url();
      if (!url.includes("/api/")) return;
      const status = response.status();
      const contentType = response.headers()["content-type"] || "";
      if (
        !contentType.includes("application/json") ||
        [401, 403, 404, 500].includes(status)
      ) {
        unexpectedApiResponses.push({
          method: response.request().method(),
          url,
          status,
          contentType
        });
      }
    });

    try {
      fixture = await createFixture();

      const health = await request.get(`${BASE_URL}/api/health`);
      expect(health.ok()).toBeTruthy();
      const healthJson = await responseJson(health);
      expect(healthJson.mongo).toBe("connected");
      expect(healthJson.scheduler.status).toBe("disabled");
      expect(healthJson.emailMode).toBe("dry-run");

      const ready = await request.get(`${BASE_URL}/api/ready`);
      expect(ready.ok()).toBeTruthy();
      const readyJson = await responseJson(ready);
      expect(readyJson.mongo).toBe("connected");

      await page.goto(`${BASE_URL}/login`);
      await expect(page.locator("#loginForm")).toBeVisible();
      await page.fill("#loginEmail", fixture.email);
      await page.fill("#loginPassword", PASSWORD);
      await page.locator("#loginForm button[type='submit']").click();
      await page.waitForURL("**/app", { timeout: 20000, waitUntil: "domcontentloaded" });
      await expect(page.locator("#dashboardPage")).toBeVisible();

      const sessionState = await page.evaluate(() => ({
        token: Boolean(localStorage.getItem("tradeflowToken")),
        user: Boolean(localStorage.getItem("tradeflowUser")),
        currentUrl: location.pathname
      }));
      expect(sessionState).toMatchObject({ token: true, user: true, currentUrl: "/app" });

      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForURL("**/app", { timeout: 20000, waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.TradeFlowBootstrap?.getState?.().completed === true, null, { timeout: 25000 }).catch(() => {});

      const smokeStatus = await page.evaluate(() => {
        if (typeof window.tradeflowSmokeStatus === "function") {
          return window.tradeflowSmokeStatus();
        }
        return {
          tokenPresent: Boolean(localStorage.getItem("tradeflowToken")),
          userPresent: Boolean(localStorage.getItem("tradeflowUser")),
          activeWorkspaceId: window.TradeFlowWorkspace?.getActiveWorkspaceId?.() || "",
          selectorValue: document.getElementById("activeWorkspaceSelect")?.value || "",
          headerWorkspaceName: document.getElementById("workspaceName")?.textContent || "",
          missionCenterReady: Boolean(window.TradeFlowMissionCenterReady)
        };
      });

      expect(smokeStatus.tokenPresent).toBe(true);
      expect(smokeStatus.userPresent).toBe(true);
      expect(isMongoObjectId(smokeStatus.activeWorkspaceId)).toBe(true);
      expect(smokeStatus.activeWorkspaceId).toBe(fixture.workspaceId);
      expect(smokeStatus.selectorValue).toBe(fixture.workspaceId);
      await expect(page.getByText("Iteration 2 E2E Smoke Workspace", { exact: false }).first()).toBeVisible();

      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForURL("**/app", { timeout: 20000, waitUntil: "domcontentloaded" });
      await page.waitForSelector("#missionCenterInput", { timeout: 30000 });
      await page.waitForFunction(
        (workspaceId) => window.TradeFlowWorkspace?.getActiveWorkspaceId?.() === workspaceId,
        fixture.workspaceId,
        { timeout: 25000 }
      );
      await page.waitForFunction(
        () => typeof window.tradeflowSmokeStatus === "function" && window.tradeflowSmokeStatus().missionCenterReady === true,
        null,
        { timeout: 25000 }
      ).catch(() => {});
      await page.waitForTimeout(1000);

      const missionText = `Iteration 2 harmless smoke mission ${Date.now()}: Export Basmati Rice to UAE`;
      const missionInput = page.locator("#missionCenterInput");
      await missionInput.fill(missionText);
      await expect(missionInput).toHaveValue(missionText);
      const missionRun = page.waitForResponse(
        (response) => response.url().includes("/api/trade-agent/run") && response.request().method() === "POST",
        { timeout: 45000 }
      );
      await page.locator("button[onclick='TradeFlowMissionCenterUIV1.runMission()']").click();
      expect((await missionRun).status()).toBe(201);
      await expect(page.getByText(missionText, { exact: false })).toBeVisible({ timeout: 45000 });
      await expect(page.getByText("Buyer Discovery Intelligence", { exact: false })).toBeVisible({ timeout: 30000 });
      await expect(page.getByText("Supplier Discovery Intelligence", { exact: false })).toBeVisible({ timeout: 30000 });
      await expect(page.getByText(/Verification:\s*\d+/).first()).toBeVisible({ timeout: 30000 });

      const token = await page.evaluate(() => localStorage.getItem("tradeflowToken"));
      const missionsResponse = await api(page, "GET", "/api/trade-agent/missions", token, fixture.workspaceId);
      expect(missionsResponse.status).toBe(200);
      const mission = missionsResponse.payload.missions.find((item) => item.missionText === missionText);
      expect(mission).toBeTruthy();
      expect(mission.agentReports?.buyerDiscovery?.verifiedBuyerLeads?.length || 0).toBeGreaterThan(0);
      expect(mission.agentReports?.supplierDiscovery?.verifiedSupplierLeads?.length || 0).toBeGreaterThan(0);
      created.missionIds.push(String(mission._id));

      const verifiedBuyer =
        mission.agentReports?.buyerDiscovery?.crmReadyVerifiedBuyers?.[0] ||
        mission.agentReports?.buyerDiscovery?.verifiedBuyerLeads?.[0] ||
        {
          companyName: "Iteration 2 Synthetic UAE Buyer LLC",
          leadType: "Buyer",
          sourceType: "Importer",
          country: "UAE",
          website: "https://iteration2-synthetic-buyer.example",
          email: "buyer@iteration2-synthetic-buyer.example",
          phone: "+971500000000",
          confidenceScore: 90,
          verificationScore: 85,
          verificationStatus: "Verified",
          sourceAgent: "Buyer Discovery Agent"
        };

      const crmPush = await api(page, "POST", "/api/crm/push", token, fixture.workspaceId, {
        missionId: mission._id,
        lead: verifiedBuyer
      });
      expect([200, 201]).toContain(crmPush.status);
      expect(crmPush.payload.success).toBe(true);
      const crmLead = crmPush.payload.lead;
      created.crmLeadIds.push(String(crmLead._id));

      const duplicatePush = await api(page, "POST", "/api/crm/push", token, fixture.workspaceId, {
        missionId: mission._id,
        lead: verifiedBuyer
      });
      expect(duplicatePush.status).toBe(200);
      expect(duplicatePush.payload.duplicate).toBe(true);

      const draft = await api(page, "POST", "/api/outreach-approvals/create", token, fixture.workspaceId, {
        missionId: mission._id,
        crmLeadId: crmLead._id,
        channel: "Email Draft",
        subject: "Iteration 2 synthetic outreach draft",
        message: "Synthetic local validation draft. Human approval required."
      });
      expect(draft.status).toBe(201);
      expect(draft.payload.approval.status).toBe("Pending Approval");
      created.approvalIds.push(String(draft.payload.approval._id));

      const blockedSend = await api(
        page,
        "POST",
        `/api/email-deliveries/send-approved/${draft.payload.approval._id}`,
        token,
        fixture.workspaceId,
        {}
      );
      expect(blockedSend.status).toBe(403);

      await windowApproveDraft(page, draft.payload.approval._id);
      const approvals = await api(page, "GET", "/api/outreach-approvals", token, fixture.workspaceId);
      expect(approvals.status).toBe(200);
      const approvedDraft = approvals.payload.approvals.find((item) => item._id === draft.payload.approval._id);
      expect(approvedDraft.status).toBe("Approved");

      const audit = await api(
        page,
        "GET",
        `/api/outreach-approvals/${draft.payload.approval._id}/audit`,
        token,
        fixture.workspaceId
      );
      expect(audit.status).toBe(200);
      const auditActions = audit.payload.audit.map((item) => item.action);
      expect(auditActions).toContain("Create Draft");
      expect(auditActions).toContain("Approve");

      const delivery = await api(
        page,
        "POST",
        `/api/email-deliveries/send-approved/${draft.payload.approval._id}`,
        token,
        fixture.workspaceId,
        {}
      );
      expect(delivery.status).toBe(200);
      expect(delivery.payload.delivery.status).toBe("Dry Run");
      created.deliveryIds.push(String(delivery.payload.delivery._id));

      await windowRenderMissionCenter(page);
      await expect(page.getByText("Dry Run", { exact: false })).toBeVisible({ timeout: 20000 });

      const directEmail = await api(page, "POST", "/api/email/send", token, fixture.workspaceId, {
        to: "synthetic@example.invalid",
        subject: "Synthetic bypass check",
        message: "Should be blocked"
      });
      expect(directEmail.status).toBe(403);

      const whatsapp = await api(page, "POST", "/api/whatsapp-automation/send", token, fixture.workspaceId, {
        to: "+10000000000",
        message: "Synthetic bypass check"
      });
      expect(whatsapp.status).toBe(403);

      const autonomous = await api(page, "POST", "/api/ai-autonomous-workflows/run", token, fixture.workspaceId, {
        prompt: "Synthetic bypass check"
      });
      expect(autonomous.status).toBe(403);

      const expectedStatuses = new Set([403]);
      const unexpectedFailures = unexpectedApiResponses.filter((entry) => {
        if (entry.url.includes("/api/email/send") && expectedStatuses.has(entry.status)) return false;
        if (entry.url.includes("/api/whatsapp-automation/send") && expectedStatuses.has(entry.status)) return false;
        if (entry.url.includes("/api/ai-autonomous-workflows/run") && expectedStatuses.has(entry.status)) return false;
        if (entry.url.includes("/api/email-deliveries/send-approved") && expectedStatuses.has(entry.status)) return false;
        return true;
      });
      expect(unexpectedFailures).toEqual([]);
      expect(failedRequests).toEqual([]);
      expect(consoleErrors.filter((text) => !isExpectedBrowserResourceConsole(text))).toEqual([]);

      const oldRefreshToken = await page.context().cookies(BASE_URL);
      expect(oldRefreshToken.some((cookie) => cookie.name === "tradeflow_refresh_token")).toBe(true);

      const logout = await api(page, "POST", "/api/auth/logout", token, fixture.workspaceId, {});
      expect(logout.status).toBe(200);
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto(`${BASE_URL}/app`);
      await page.waitForURL("**/login", { timeout: 20000, waitUntil: "domcontentloaded" });

      const staleAccess = await request.get(`${BASE_URL}/api/workspaces`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-workspace-id": fixture.workspaceId
        }
      });
      expect(staleAccess.status()).toBe(401);
      await responseJson(staleAccess);

      const staleRefresh = await request.post(`${BASE_URL}/api/auth/refresh`, {
        headers: {
          Cookie: oldRefreshToken
            .filter((cookie) => cookie.name === "tradeflow_refresh_token")
            .map((cookie) => `${cookie.name}=${cookie.value}`)
            .join("; ")
        }
      });
      expect(staleRefresh.status()).toBe(401);
      await responseJson(staleRefresh);
    } finally {
      const cleanup = await cleanupFixture(fixture, created);
      test.info().annotations.push({
        type: "cleanup",
        description: JSON.stringify(cleanup)
      });
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
      }
    }
  });
});

async function windowApproveDraft(page, approvalId) {
  await page.evaluate(async (id) => {
    if (!window.TradeFlowMissionCenterUIV1?.approveOutreachDraft) {
      throw new Error("Mission Center approveOutreachDraft is unavailable");
    }
    await window.TradeFlowMissionCenterUIV1.approveOutreachDraft(id);
  }, approvalId);
}

async function windowRenderMissionCenter(page) {
  await page.evaluate(async () => {
    if (!window.TradeFlowMissionCenterUIV1?.render) {
      throw new Error("Mission Center render is unavailable");
    }
    await window.TradeFlowMissionCenterUIV1.render();
  });
}
