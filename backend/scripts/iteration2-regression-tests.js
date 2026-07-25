const path = require("node:path");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env")
});

const assert = require("node:assert/strict");
const mongoose = require("mongoose");

const { connectDB } = require("../config/db");
const {
  generateAccessToken,
  generateRefreshToken
} = require("../utils/tokenService");

const User = require("../models/User");
const Company = require("../models/Company");
const Workspace = require("../models/Workspace");
const Subscription = require("../models/Subscription");
const Activity = require("../models/Activity");
const Supplier = require("../models/Supplier");
const AutomationWorkflow = require("../models/AutomationWorkflow2");

const API = process.env.TEST_API_BASE || "http://localhost:5000";
const runId = `iteration2-${Date.now()}`;
const domain = "tradeflow-regression.test";

function email(label) {
  return `${runId}-${label}@${domain}`;
}

function safeErrorMessage(error) {
  let message = String(error?.message || "Unknown regression failure");

  for (const [name, value] of Object.entries(process.env)) {
    if (
      value &&
      /(?:SECRET|PASS|URI|TOKEN|KEY)/i.test(name) &&
      value.length >= 4
    ) {
      message = message.split(value).join("[REDACTED]");
    }
  }

  return message;
}

async function cleanup() {
  const emailPattern = new RegExp(`^${runId}-`);

  await Promise.all([
    User.deleteMany({ email: emailPattern }),
    Company.deleteMany({ ownerEmail: emailPattern }),
    Workspace.deleteMany({ ownerEmail: emailPattern }),
    Subscription.deleteMany({ email: emailPattern }),
    Activity.deleteMany({ ownerEmail: emailPattern }),
    Supplier.deleteMany({ ownerEmail: emailPattern }),
    AutomationWorkflow.deleteMany({ ownerEmail: emailPattern })
  ]);
}

async function createTenant(label, plan) {
  const cleanEmail = email(label);

  const user = await User.create({
    name: `Regression ${label}`,
    email: cleanEmail,
    password: "RegressionPass123!",
    role: "Founder",
    onboardingCompleted: true
  });

  const company = await Company.create({
    ownerId: user._id,
    ownerEmail: cleanEmail,
    companyName: `Regression ${label} Co`,
    businessType: "Trading Company",
    businessTypeLocked: true,
    approvalStatus: "Approved",
    status: "Active"
  });

  const workspace = await Workspace.create({
    companyId: company._id,
    ownerEmail: cleanEmail,
    workspaceName: `Regression ${label} Workspace`,
    type: "Export",
    status: "Active",
    members: [{ email: cleanEmail, role: "Owner" }]
  });

  await User.findByIdAndUpdate(user._id, {
    companyId: company._id,
    workspaceId: workspace._id
  });

  const subscription = await Subscription.create({
    userId: user._id,
    email: cleanEmail,
    plan,
    status: "Active",
    approvalStatus: plan === "Enterprise AI OS" ? "Approved" : "Not Required"
  });

  const token = generateAccessToken({
    _id: user._id,
    email: cleanEmail,
    role: "Founder"
  });

  return {
    user,
    company,
    workspace,
    subscription,
    token,
    email: cleanEmail
  };
}

function headers(tenant) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${tenant.token}`,
    "x-company-id": String(tenant.company._id),
    "x-workspace-id": String(tenant.workspace._id)
  };
}

async function request(path, tenant, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...headers(tenant),
      ...(options.headers || {})
    }
  });

  const contentType = res.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await res.json()
    : await res.text();

  return {
    status: res.status,
    body,
    contentType
  };
}

async function testPlanGates() {
  const plans = [
    ["free", "Free", 403],
    ["starter", "Starter", 200],
    ["growth", "Growth", 200],
    ["pro", "Pro Exporter", 200],
    ["enterprise", "Enterprise AI OS", 200]
  ];

  for (const [label, plan, expectedStatus] of plans) {
    const tenant = await createTenant(label, plan);
    const res = await request("/api/ai/find-suppliers", tenant, {
      method: "POST",
      body: JSON.stringify({ product: "Basmati Rice", country: "UAE" })
    });

    assert.equal(
      res.status,
      expectedStatus,
      `${plan} AI access expected ${expectedStatus}, got ${res.status}`
    );
  }
}

async function testActivityTenantIsolation() {
  const tenantA = await createTenant("activity-a", "Pro Exporter");
  const tenantB = await createTenant("activity-b", "Pro Exporter");

  const createA = await request("/api/activity", tenantA, {
    method: "POST",
    body: JSON.stringify({
      title: "Tenant A Activity",
      message: "Should only be visible to tenant A",
      type: "Regression"
    })
  });

  assert.equal(createA.status, 201, "Tenant A activity create failed");
  const activityId = createA.body._id;

  const listB = await request("/api/activity", tenantB);
  assert.equal(listB.status, 200, "Tenant B activity list failed");
  assert.equal(
    listB.body.some((item) => item._id === activityId),
    false,
    "Tenant B could see Tenant A activity"
  );

  const deleteB = await request(`/api/activity/${activityId}`, tenantB, {
    method: "DELETE"
  });
  assert.equal(deleteB.status, 404, "Tenant B delete of Tenant A activity should 404");

  const listA = await request("/api/activity", tenantA);
  assert.equal(
    listA.body.some((item) => item._id === activityId),
    true,
    "Tenant A activity disappeared after Tenant B delete attempt"
  );
}

async function testBackupIsolationAndRestoreOwner() {
  const tenantA = await createTenant("backup-a", "Enterprise AI OS");
  const tenantB = await createTenant("backup-b", "Enterprise AI OS");

  const activityA = await Activity.create({
    ownerEmail: tenantA.email,
    companyId: tenantA.company._id,
    workspaceId: tenantA.workspace._id,
    title: "Backup A Activity",
    message: "Tenant A only",
    type: "Regression"
  });

  const activityB = await Activity.create({
    ownerEmail: tenantB.email,
    companyId: tenantB.company._id,
    workspaceId: tenantB.workspace._id,
    title: "Backup B Activity",
    message: "Tenant B only",
    type: "Regression"
  });

  const exported = await request("/api/backup/export", tenantA);
  assert.equal(exported.status, 200, "Backup export failed");
  assert.equal(
    exported.body.activities.some((item) => String(item._id) === String(activityA._id)),
    true,
    "Tenant A backup missing Tenant A activity"
  );
  assert.equal(
    exported.body.activities.some((item) => String(item._id) === String(activityB._id)),
    false,
    "Tenant A backup leaked Tenant B activity"
  );

  const maliciousOwner = "attacker@example.com";
  const restore = await request("/api/backup/restore", tenantA, {
    method: "POST",
    body: JSON.stringify({
      ownerEmail: maliciousOwner,
      suppliers: [
        {
          ownerEmail: maliciousOwner,
          supplierName: `Malicious Restore Supplier ${runId}`,
          product: "Rice",
          country: "UAE",
          email: "supplier@example.com",
          phone: "+971500000000"
        }
      ]
    })
  });

  assert.equal(restore.status, 200, "Backup restore failed");

  const restoredSupplier = await Supplier.findOne({
    supplierName: `Malicious Restore Supplier ${runId}`
  }).lean();

  assert.ok(restoredSupplier, "Restored supplier missing");
  assert.equal(restoredSupplier.ownerEmail, tenantA.email, "Restore adopted uploaded ownerEmail");
  assert.notEqual(restoredSupplier.ownerEmail, maliciousOwner, "Restore preserved malicious ownerEmail");
}

async function testLogoutInvalidation() {
  const tenant = await createTenant("logout", "Starter");
  const staleAccessToken = tenant.token;
  const staleRefreshToken = generateRefreshToken(tenant.user);

  const logout = await request("/api/auth/logout", tenant, { method: "POST" });
  assert.equal(logout.status, 200, "Authenticated logout failed");

  const staleAccess = await request("/api/activity", {
    ...tenant,
    token: staleAccessToken
  });
  assert.equal(staleAccess.status, 401, "Stale access token should return 401");
  assert.ok(
    staleAccess.contentType.includes("application/json"),
    "Stale access token response should be JSON"
  );

  const staleRefresh = await fetch(`${API}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: staleRefreshToken })
  });
  assert.equal(staleRefresh.status, 401, "Stale refresh token should return 401");
  assert.ok(
    (staleRefresh.headers.get("content-type") || "").includes("application/json"),
    "Stale refresh token response should be JSON"
  );

  console.log("Logout stale-token test passed");
}

async function main() {
  const originalConsoleError = console.error;
  let connected;

  try {
    console.error = () => {};
    connected = await connectDB();
  } finally {
    console.error = originalConsoleError;
  }

  if (!connected) {
    throw new Error("Mongo connection failed; regression tests aborted");
  }

  try {
    await cleanup();
    await testPlanGates();
    await testActivityTenantIsolation();
    await testBackupIsolationAndRestoreOwner();
    await testLogoutInvalidation();
    console.log("Iteration 2 regression tests passed");
  } finally {
    try {
      await cleanup();
    } finally {
      await mongoose.disconnect();
    }
  }
}

main().catch(async (error) => {
  console.error(`Iteration 2 regression tests failed: ${safeErrorMessage(error)}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
