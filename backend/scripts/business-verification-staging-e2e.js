"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const mongoose = require("mongoose");
const { S3Client, HeadObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");
const User = require("../models/User");
const Company = require("../models/Company");
const Workspace = require("../models/Workspace");
const BusinessVerification = require("../models/BusinessVerification");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const { generateAccessToken } = require("../utils/tokenService");
const { getBusinessVerificationReadiness } = require("../services/businessVerificationReadiness");
const { removePrivateDocument } = require("../services/businessVerificationStorage");

const DATABASE = "tradeflow_verification_staging";
const DISCLAIMER = "TradeFlow verification confirms that specified business information and supporting documents were reviewed at the stated date. It is not a guarantee of product quality, payment, delivery, legal compliance, or future performance.";
const CATEGORIES = ["Exporter", "Importer", "Trading Company"];
const resultPath = path.resolve(process.env.BUSINESS_VERIFICATION_STAGING_E2E_RESULT || path.join(os.tmpdir(), "tradeflow-business-verification-staging-e2e.json"));
const suppliedRunId = String(process.env.BUSINESS_VERIFICATION_STAGING_RUN_ID || "");
if (suppliedRunId && !/^bvsa_[A-Za-z0-9_-]{32}$/.test(suppliedRunId)) {
  throw new Error("invalid acceptance run identifier");
}
const runId = suppliedRunId || `bvsa_${crypto.randomBytes(24).toString("base64url")}`;
const result = {
  runId,
  startedAt: new Date().toISOString(),
  finishedAt: null,
  status: "FAIL",
  commit: String(process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || "").slice(0, 40),
  companyTypes: {},
  steps: [],
  objectCount: 0,
  cleanup: { recordsBefore: {}, recordsAfter: {}, objectsTracked: 0, objectsRemaining: null, runScopedObjectsRemaining: null },
  failure: ""
};
const state = {
  users: [], companies: [], workspaces: [], verifications: [], notifications: [], audits: [],
  keys: [], emails: [], reviewer: null, reviewerCreated: false, reviewerToken: "", connected: false
};

function step(name, pass, detail = "") {
  result.steps.push({ name, status: pass ? "PASS" : "FAIL", detail: String(detail).slice(0, 200) });
  if (!pass) throw new Error(name);
}

function safeError(error) {
  const message = String(error?.message || error || "");
  if (/^[A-Za-z0-9 .:_/-]{1,120}$/.test(message) && !/@|https?:|mongodb|s3|bucket|token|secret|key/i.test(message)) {
    return message;
  }
  return "Acceptance execution failed";
}

function saveResult() {
  result.finishedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

function stagingUrl() {
  if (process.env.BUSINESS_VERIFICATION_STAGING_E2E_CONFIRMED !== "true") throw new Error("staging confirmation required");
  if (String(process.env.TRADEFLOW_ENVIRONMENT || "").toLowerCase() !== "staging") throw new Error("staging environment required");
  if (process.env.BUSINESS_VERIFICATION_ENABLED !== "true") throw new Error("verification must be staging-enabled");
  for (const flag of ["ENABLE_SCHEDULERS", "ENABLE_WHATSAPP_AUTOMATION", "ENABLE_AUTONOMOUS_EXECUTION", "ENABLE_AI_AUTONOMOUS_HTTP_SCHEDULER"]) {
    if (process.env[flag] === "true") throw new Error(`${flag} must remain disabled`);
  }
  if (String(process.env.EMAIL_MODE || process.env.EMAIL_DELIVERY_MODE || "dry-run").toLowerCase() !== "dry-run") throw new Error("email must remain dry-run");
  const url = String(process.env.BUSINESS_VERIFICATION_STAGING_BASE_URL || "https://tradeflow-verification-backend-staging.onrender.com").replace(/\/+$/, "");
  if (!/^https:\/\/[a-z0-9.-]*staging[a-z0-9.-]*$/i.test(url)) throw new Error("production URL rejected");
  return url;
}
let baseUrl = "";

function configuredDatabaseName() {
  const raw = String(process.env.MONGO_URI || "").trim();
  if (!raw) throw new Error("staging database URI is required");
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("staging database URI is invalid");
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (database !== DATABASE || /prod|production/i.test(database)) {
    throw new Error("non-staging database rejected before connection");
  }
  return database;
}

async function api(pathname, { token = "", companyId = "", method = "GET", json, form, expected = 200 } = {}) {
  const headers = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (companyId) headers["x-company-id"] = String(companyId);
  if (json !== undefined) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers,
    body: form || (json === undefined ? undefined : JSON.stringify(json)),
    signal: AbortSignal.timeout(60000)
  });
  const contentType = String(response.headers.get("content-type") || "");
  const payload = contentType.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer());
  if (response.status !== expected) throw new Error(`HTTP ${response.status} for ${pathname}`);
  return { contentType, payload };
}

const digest = (label) => crypto.createHash("sha256").update(`${runId}:${label}`).digest("hex").toUpperCase();
const fixtures = [
  (label) => ({ mime: "application/pdf", ext: "pdf", bytes: Buffer.from(`%PDF-1.7\n% synthetic ${runId} ${label}\n`) }),
  (label) => ({ mime: "image/png", ext: "png", bytes: Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.from(`${runId}-${label}`)]) }),
  (label) => ({ mime: "image/jpeg", ext: "jpg", bytes: Buffer.concat([Buffer.from([255, 216, 255, 224]), Buffer.from(`${runId}-${label}`), Buffer.from([255, 217])]) })
];

async function createTenant(category, purpose) {
  const slug = `${category}-${purpose}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const email = `${runId}-${slug}@example.invalid`;
  const user = await User.create({ name: `Synthetic ${category} ${purpose}`, email, password: crypto.randomBytes(32).toString("base64url"), role: "Founder" });
  const company = await Company.create({ ownerId: user._id, ownerEmail: email, companyName: `Synthetic ${category} ${purpose} ${runId}`, businessType: category });
  const workspace = await Workspace.create({
    companyId: company._id, ownerEmail: email, workspaceName: `Synthetic ${category} ${purpose} ${runId}`,
    type: category === "Exporter" ? "Export" : category === "Importer" ? "Import" : "Operations"
  });
  state.users.push(user._id); state.companies.push(company._id); state.workspaces.push(workspace._id); state.emails.push(email);
  return { category, purpose, email, user, company, workspace, token: generateAccessToken(user) };
}

async function draft(tenant, incorporationNumber) {
  const identifier = digest(`${tenant.category}:${tenant.purpose}`).slice(0, 10);
  const saved = await api("/api/business-verification/me", {
    token: tenant.token, companyId: tenant.company._id, method: "PUT",
    json: {
      legalBusinessName: tenant.company.companyName, tradeName: `Synthetic ${tenant.category}`,
      businessType: tenant.category, verificationCategory: tenant.category, country: "Testland",
      registeredAddress: "100 Synthetic Staging Avenue", businessEmail: tenant.email,
      businessPhone: "+00000000000", website: "https://example.invalid",
      incorporationType: "Synthetic Corporation", incorporationNumber, pan: identifier,
      iec: tenant.category === "Trading Company" ? "" : identifier,
      authorizedRepresentativeName: "Synthetic Representative",
      authorizedRepresentativeDesignation: "Synthetic Owner", representativeAuthorityDeclaration: true,
      operatingMarkets: ["Synthetic Market"],
      exportProducts: tenant.category === "Exporter" ? ["Synthetic Export Product"] : [],
      importProducts: tenant.category === "Importer" ? ["Synthetic Import Product"] : []
    }
  });
  tenant.verificationId = String(saved.payload.verification._id);
  tenant.reference = saved.payload.verification.verificationReferenceId;
  if (!state.verifications.map(String).includes(tenant.verificationId)) {
    state.verifications.push(new mongoose.Types.ObjectId(tenant.verificationId));
  }
  const text = JSON.stringify(saved.payload);
  step(`${tenant.category}.${tenant.purpose}.masked-response`, !text.includes(identifier) && !text.includes(incorporationNumber) && !/Encrypted|Hash|storageKey|sha256/.test(text));
}

async function rejectMalware(tenant) {
  const form = new FormData();
  form.set("type", "Company Registration");
  form.set(
    "document",
    new Blob([
      Buffer.from("%PDF-1.7\n"),
      Buffer.from([
        "X5O!P%@AP[4\\PZX54(P^)7CC)7}$",
        "EICAR-STANDARD-ANTIVIRUS-TEST-FILE!",
        "$H+H*"
      ].join(""))
    ], { type: "application/pdf" }),
    `synthetic-antivirus-test-${runId}.pdf`
  );
  const rejected = await api("/api/business-verification/me/documents", {
    token: tenant.token,
    companyId: tenant.company._id,
    method: "POST",
    form,
    expected: 422
  });
  const stored = await BusinessVerification.findById(tenant.verificationId).select("+documents.storageKey");
  const infected = stored.documents.filter((document) => document.scanStatus === "Infected");
  const audits = await AuditLog.find({
    entityId: tenant.verificationId,
    action: "VERIFICATION_DOCUMENT_INFECTED"
  }).select("_id").lean();
  step(
    `${tenant.category}.${tenant.purpose}.malware-rejected`,
    rejected.payload.message === "Document failed security scanning" &&
      infected.length === 1 &&
      infected[0].storageState === "Deleted" &&
      audits.length === 1
  );
}

async function upload(tenant) {
  const requirements = await api(`/api/business-verification/requirements?category=${encodeURIComponent(tenant.category)}`, { token: tenant.token, companyId: tenant.company._id });
  for (let index = 0; index < requirements.payload.requiredDocuments.length; index += 1) {
    const type = requirements.payload.requiredDocuments[index];
    const fixture = fixtures[index % 3](`${tenant.category}-${tenant.purpose}-${type}`);
    const form = new FormData();
    form.set("type", type);
    form.set("document", new Blob([fixture.bytes], { type: fixture.mime }), `../synthetic-${runId}-${index}.${fixture.ext}`);
    const uploaded = await api("/api/business-verification/me/documents", {
      token: tenant.token, companyId: tenant.company._id, method: "POST", form, expected: 201
    });
    const document = uploaded.payload.verification.documents.find((item) => item.type === type);
    step(`${tenant.category}.${tenant.purpose}.clean-${index}`, document?.scanStatus === "Clean" && document?.storageState === "Clean");
  }
  const record = await BusinessVerification.findById(tenant.verificationId).select("+documents.storageKey");
  state.keys.push(...record.documents.map((document) => document.storageKey));
  const audits = await AuditLog.find({ entityId: tenant.verificationId, action: { $in: ["VERIFICATION_DOCUMENT_QUARANTINED", "VERIFICATION_DOCUMENT_SCAN_CLEAN"] } }).select("action").lean();
  const actions = new Set(audits.map((item) => item.action));
  step(`${tenant.category}.${tenant.purpose}.quarantine-clamav`, actions.has("VERIFICATION_DOCUMENT_QUARANTINED") && actions.has("VERIFICATION_DOCUMENT_SCAN_CLEAN"));
}

async function submit(tenant) {
  await api("/api/business-verification/me/submit", { token: tenant.token, companyId: tenant.company._id, method: "POST", json: {} });
}

async function review(id, action, json = {}, expected = 200, token = state.reviewerToken) {
  return api(`/api/business-verification/admin/${id}/review`, { token, method: "POST", json: { action, ...json }, expected });
}

async function noBadge(tenant, status) {
  const response = await api(`/api/business-verification/badges/${encodeURIComponent(tenant.reference)}`, { expected: 404 });
  step(`${tenant.category}.${tenant.purpose}.no-badge-${status}`, response.payload.message === "Active verification badge not found");
}

async function exercise(category) {
  const primary = await createTenant(category, "primary");
  const rejected = await createTenant(category, "rejected");
  const duplicate = `DUP${digest(`${category}:duplicate`).slice(0, 18)}`;
  await draft(primary, duplicate); await draft(rejected, duplicate);
  await rejectMalware(primary);
  await upload(primary); await upload(rejected);
  await submit(primary); await submit(rejected);
  step(`${category}.tenant-scoped-creation-submission`, true);
  await noBadge(primary, "pending");

  const isolation = await api("/api/business-verification/me", { token: primary.token, companyId: rejected.company._id, expected: 403 });
  step(`${category}.cross-tenant-denial`, isolation.contentType.includes("application/json") && !JSON.stringify(isolation.payload).includes(rejected.email));
  const ordinary = await review(primary.verificationId, "start", {}, 403, primary.token);
  step(`${category}.non-master-review-denial`, /Master Admin access required/i.test(ordinary.payload.message));

  const queue = await api("/api/business-verification/admin", { token: state.reviewerToken });
  const ids = new Set(queue.payload.verifications.map((item) => String(item._id)));
  step(`${category}.master-admin-queue`, ids.has(primary.verificationId) && ids.has(rejected.verificationId));

  const firstDoc = (await BusinessVerification.findById(primary.verificationId)).documents[0];
  const read = await api(`/api/business-verification/admin/${primary.verificationId}/documents/${firstDoc._id}`, { token: state.reviewerToken });
  step(`${category}.private-read-back`, Buffer.isBuffer(read.payload) && read.payload.subarray(0, 5).toString() === "%PDF-");

  await review(primary.verificationId, "start");
  const blocked = await review(primary.verificationId, "verify", { confirm: true }, 409);
  step(`${category}.duplicate-block`, blocked.payload.message === "Duplicate identifier review is required before verification");

  const missingReason = await review(rejected.verificationId, "reject", { confirm: true }, 422);
  step(`${category}.rejection-reason-required`, missingReason.payload.message === "A review reason is required");
  const missingConfirmation = await review(rejected.verificationId, "reject", { reason: "Synthetic rejection" }, 422);
  step(`${category}.rejection-confirmation-required`, missingConfirmation.payload.message === "Explicit confirmation is required");
  await review(rejected.verificationId, "reject", { confirm: true, reason: "Synthetic isolated rejection" });
  await noBadge(rejected, "rejected");

  await review(primary.verificationId, "request_information", { reason: "Replace synthetic duplicate" });
  const before = await BusinessVerification.findById(primary.verificationId).lean();
  await api("/api/business-verification/me/resubmit", {
    token: primary.token, companyId: primary.company._id, method: "POST", json: { resubmissionNotes: "Synthetic duplicate replaced" }
  });
  const after = await BusinessVerification.findById(primary.verificationId).lean();
  step(`${category}.resubmission-version`, after.verificationVersion === before.verificationVersion + 1 && after.verificationStatus === "Draft");
  await draft(primary, `UNQ${digest(`${category}:unique`).slice(0, 18)}`);
  await submit(primary);
  await review(primary.verificationId, "verify", { confirm: true, validityDays: 30, checklist: ["Synthetic evidence clean", "Synthetic duplicate resolved"] });

  const badge = await api(`/api/business-verification/badges/${encodeURIComponent(primary.reference)}`);
  const publicText = JSON.stringify(badge.payload);
  step(`${category}.approved-badge-disclaimer`, badge.payload.badge === `TradeFlow Verified ${category}` && badge.payload.disclaimer === DISCLAIMER && !/documents|storageKey|sha256|pan|gstin|iec|ownerEmail/i.test(publicText));

  const historyBefore = await BusinessVerification.findById(primary.verificationId).select("reviewHistory").lean();
  const frozenHistory = JSON.stringify(historyBefore.reviewHistory);
  const noSuspendReason = await review(primary.verificationId, "suspend", { confirm: true }, 422);
  step(`${category}.suspension-reason-required`, noSuspendReason.payload.message === "A review reason is required");
  await review(primary.verificationId, "suspend", { confirm: true, reason: "Synthetic revocation-equivalent suspension" });
  await noBadge(primary, "revoked");
  const noExpiryConfirmation = await review(primary.verificationId, "expire", { reason: "Synthetic expiry" }, 422);
  step(`${category}.expiry-confirmation-required`, noExpiryConfirmation.payload.message === "Explicit confirmation is required");
  await review(primary.verificationId, "expire", { confirm: true, reason: "Synthetic isolated expiry" });
  await noBadge(primary, "expired");

  const final = await BusinessVerification.findById(primary.verificationId).select("reviewHistory").lean();
  const audits = await AuditLog.find({ entityId: primary.verificationId, module: "Business Verification" }).select("_id").lean();
  step(`${category}.immutable-review-audit-history`, final.reviewHistory.length > historyBefore.reviewHistory.length && JSON.stringify(final.reviewHistory.slice(0, historyBefore.reviewHistory.length)) === frozenHistory && audits.length >= final.reviewHistory.length);
  result.companyTypes[category] = {
    status: "PASS",
    finalPrimaryStatus: "Expired",
    rejectedStatus: "Rejected"
  };
}

async function collectSideEffects() {
  const notifications = await Notification.find({ companyId: { $in: state.companies } }).select("_id").lean();
  const audits = await AuditLog.find({ module: "Business Verification", entityId: { $in: state.verifications.map(String) } }).select("_id").lean();
  state.notifications = [...new Set(notifications.map((item) => String(item._id)))];
  state.audits = [...new Set(audits.map((item) => String(item._id)))];
}

async function counts() {
  return {
    users: await User.countDocuments({ _id: { $in: state.users } }),
    companies: await Company.countDocuments({ _id: { $in: state.companies } }),
    workspaces: await Workspace.countDocuments({ _id: { $in: state.workspaces } }),
    verifications: await BusinessVerification.countDocuments({ _id: { $in: state.verifications } }),
    notifications: state.notifications.length ? await Notification.countDocuments({ _id: { $in: state.notifications } }) : 0,
    audits: state.audits.length ? await AuditLog.countDocuments({ _id: { $in: state.audits } }) : 0,
    reviewer: state.reviewerCreated ? await User.countDocuments({ _id: state.reviewer._id }) : 0
  };
}

function storageClient() {
  return new S3Client({
    endpoint: process.env.BUSINESS_VERIFICATION_S3_ENDPOINT,
    region: process.env.BUSINESS_VERIFICATION_S3_REGION,
    forcePathStyle: process.env.BUSINESS_VERIFICATION_S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.BUSINESS_VERIFICATION_S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.BUSINESS_VERIFICATION_S3_SECRET_ACCESS_KEY
    }
  });
}

async function cleanup() {
  if (!state.connected) return;
  await collectSideEffects();
  result.cleanup.recordsBefore = await counts();
  for (const key of [...new Set(state.keys)].reverse()) await removePrivateDocument(key).catch(() => {});
  const exactDelete = async (Model, values) => {
    const ids = [...new Set(values.map(String))];
    if (ids.length) await Model.deleteMany({ _id: { $in: ids } });
  };
  await exactDelete(AuditLog, state.audits);
  await exactDelete(Notification, state.notifications);
  await exactDelete(BusinessVerification, state.verifications);
  await exactDelete(Workspace, state.workspaces);
  await exactDelete(Company, state.companies);
  await exactDelete(User, state.users);
  if (state.reviewerCreated) await User.deleteOne({ _id: state.reviewer._id });
}

async function proveCleanup() {
  result.cleanup.recordsAfter = await counts();
  const client = storageClient();
  const keys = [...new Set(state.keys)];
  let remaining = 0;
  for (const key of keys) {
    try {
      await client.send(new HeadObjectCommand({ Bucket: process.env.BUSINESS_VERIFICATION_S3_BUCKET, Key: key }));
      remaining += 1;
    } catch {}
  }
  const bucket = await client.send(new ListObjectsV2Command({ Bucket: process.env.BUSINESS_VERIFICATION_S3_BUCKET, MaxKeys: 1000 }));
  result.cleanup.objectsTracked = keys.length;
  result.cleanup.objectsRemaining = remaining;
  result.cleanup.runScopedObjectsRemaining = remaining;
  step("cleanup.zero-run-records", Object.values(result.cleanup.recordsAfter).every((value) => value === 0));
  step("cleanup.zero-run-objects", remaining === 0);
  step("cleanup.private-bucket-empty", !bucket.IsTruncated && Number(bucket.KeyCount || 0) === 0);
}

async function main() {
  baseUrl = stagingUrl();
  step("guard.configured-database-name", configuredDatabaseName() === DATABASE);
  await mongoose.connect(process.env.MONGO_URI);
  state.connected = true;
  step("guard.exact-database", mongoose.connection.name === DATABASE);
  step("guard.production-database-rejected", !/prod|production/i.test(mongoose.connection.name));
  const readiness = await getBusinessVerificationReadiness({ live: true });
  step("guard.storage-scanner-ready", readiness.ready && readiness.storage?.ready && readiness.scanner?.ready && readiness.scanner?.failClosed);

  state.reviewer = await User.findOne({ email: "contact@tradeflowai.in" });
  if (!state.reviewer) {
    state.reviewer = await User.create({ name: "Synthetic Staging Master Reviewer", email: "contact@tradeflowai.in", password: crypto.randomBytes(32).toString("base64url"), role: "Founder" });
    state.reviewerCreated = true;
  }
  await state.reviewer.save();
  step("authorization.backend-master-admin", state.reviewer.role === "Master Admin" && state.reviewer.isMasterAdmin === true);
  state.reviewerToken = generateAccessToken(state.reviewer);
  for (const category of CATEGORIES) await exercise(category);
  result.objectCount = state.keys.length;
}

(async () => {
  let failure;
  try {
    await main();
  } catch (error) {
    failure = error;
  } finally {
    try {
      if (state.connected) {
        await cleanup();
        await proveCleanup();
      }
    } catch (error) {
      failure ||= error;
      result.steps.push({ name: "cleanup.guarantee", status: "FAIL", detail: safeError(error) });
    }
    await mongoose.disconnect().catch(() => {});
  }
  result.status = !failure && result.steps.length && result.steps.every((item) => item.status === "PASS") ? "PASS" : "FAIL";
  result.failure = failure ? safeError(failure) : "";
  saveResult();
  if (typeof process.send === "function") {
    process.send({
      type: "business-verification-acceptance-ledger",
      runId,
      ledger: {
        ids: {
          users: [
            ...state.users.map(String),
            ...(state.reviewerCreated && state.reviewer ? [String(state.reviewer._id)] : [])
          ],
          companies: state.companies.map(String),
          workspaces: state.workspaces.map(String),
          verifications: state.verifications.map(String),
          notifications: state.notifications,
          audits: state.audits
        },
        objectKeys: [...new Set(state.keys)]
      }
    });
  }
  process.stdout.write(`${JSON.stringify({ runId, status: result.status, stepCount: result.steps.length, cleanup: result.cleanup })}\n`);
  if (result.status !== "PASS") process.exitCode = 1;
})();
