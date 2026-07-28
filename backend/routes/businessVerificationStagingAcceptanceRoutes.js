"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { fork } = require("node:child_process");
const express = require("express");
const mongoose = require("mongoose");
const {
  STAGING_DATABASE,
  verifyBusinessVerificationAcceptanceResidue
} = require("../services/businessVerificationAcceptanceResidue");

const CONTROL_PREFIX = "/api/internal/business-verification/staging-acceptance";
const RUN_ID_PATTERN = /^bvsa_[A-Za-z0-9_-]{32}$/;
const CONTROL_TOKEN_PATTERN = /^[A-Za-z0-9_-]{48,256}$/;
const SAFE_404 = Object.freeze({ success: false, message: "API route not found" });
const LOCK_PATH = path.join(os.tmpdir(), "tradeflow-business-verification-acceptance.lock");
const RUNNER_PATH = path.resolve(__dirname, "../scripts/business-verification-staging-e2e.js");

function strongControlToken(value) {
  const token = String(value || "");
  return CONTROL_TOKEN_PATTERN.test(token) && new Set(token).size >= 16;
}

function configuredDatabaseName(uri = process.env.MONGO_URI) {
  try {
    const parsed = new URL(String(uri || ""));
    return decodeURIComponent(parsed.pathname.replace(/^\/+|\/+$/g, ""));
  } catch {
    return "";
  }
}

function exactStagingTopology() {
  const baseUrl = String(process.env.BUSINESS_VERIFICATION_STAGING_BASE_URL || "");
  const s3Endpoint = String(process.env.BUSINESS_VERIFICATION_S3_ENDPOINT || "");
  const emailCredentialPresent = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
    "EMAIL_USER",
    "EMAIL_PASS"
  ].some((name) => Boolean(String(process.env[name] || "").trim()));
  return (
    process.env.BUSINESS_VERIFICATION_STAGING_MONGO_CONFIRMED === "true" &&
    (!process.env.PRODUCTION_MONGO_URI || process.env.PRODUCTION_MONGO_URI !== process.env.MONGO_URI) &&
    /^https:\/\/[a-z0-9.-]*staging[a-z0-9.-]*$/i.test(baseUrl) &&
    process.env.BUSINESS_VERIFICATION_STORAGE_DRIVER === "s3" &&
    process.env.BUSINESS_VERIFICATION_S3_BUCKET === "tradeflow-verification-staging" &&
    process.env.BUSINESS_VERIFICATION_S3_PUBLIC_ACCESS_BLOCKED === "true" &&
    /^https:\/\/[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/i.test(s3Endpoint) &&
    Boolean(process.env.BUSINESS_VERIFICATION_S3_REGION) &&
    Boolean(process.env.BUSINESS_VERIFICATION_S3_ACCESS_KEY_ID) &&
    Boolean(process.env.BUSINESS_VERIFICATION_S3_SECRET_ACCESS_KEY) &&
    process.env.BUSINESS_VERIFICATION_SCANNER_DRIVER === "clamav" &&
    process.env.BUSINESS_VERIFICATION_CLAMAV_HOST === "tradeflow-verification-clamav-staging" &&
    String(process.env.BUSINESS_VERIFICATION_CLAMAV_PORT) === "3310" &&
    !emailCredentialPresent
  );
}

function exactStagingEnabled() {
  return (
    process.env.BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED === "true" &&
    process.env.BUSINESS_VERIFICATION_STAGING_E2E_CONFIRMED === "true" &&
    process.env.BUSINESS_VERIFICATION_ENABLED === "true" &&
    process.env.TRADEFLOW_ENVIRONMENT === "staging" &&
    configuredDatabaseName() === STAGING_DATABASE &&
    !/prod|production/i.test(configuredDatabaseName()) &&
    exactStagingTopology() &&
    process.env.ENABLE_SCHEDULERS !== "true" &&
    process.env.ENABLE_WHATSAPP_AUTOMATION !== "true" &&
    process.env.ENABLE_AUTONOMOUS_EXECUTION !== "true" &&
    process.env.ENABLE_AI_AUTONOMOUS_HTTP_SCHEDULER !== "true" &&
    String(process.env.EMAIL_MODE || process.env.EMAIL_DELIVERY_MODE || "dry-run").toLowerCase() === "dry-run" &&
    strongControlToken(process.env.BUSINESS_VERIFICATION_ACCEPTANCE_CONTROL_TOKEN)
  );
}

function runtimeDatabaseIsExact() {
  return mongoose.connection.readyState === 1 && mongoose.connection.name === STAGING_DATABASE;
}

async function acquireMongoRunLock(runId, nowMs = Date.now()) {
  if (!runtimeDatabaseIsExact()) return false;
  try {
    await mongoose.connection.collection("business_verification_acceptance_control").findOneAndUpdate(
      {
        _id: "active-run",
        $or: [
          { expiresAt: { $lte: new Date(nowMs) } },
          { runId }
        ]
      },
      {
        $set: {
          runId,
          expiresAt: new Date(nowMs + 2 * 60 * 60 * 1000)
        }
      },
      { upsert: true }
    );
    return true;
  } catch (error) {
    if (Number(error?.code) === 11000) return false;
    throw error;
  }
}

async function releaseMongoRunLock(runId) {
  if (!runtimeDatabaseIsExact()) return;
  await mongoose.connection.collection("business_verification_acceptance_control").deleteOne({
    _id: "active-run",
    runId
  });
}

function requestIsHttps(req) {
  if (req.socket?.encrypted === true) return true;
  return String(req.headers["x-forwarded-proto"] || "").toLowerCase() === "https";
}

function suppliedBearer(req) {
  const authorization = String(req.headers.authorization || "");
  const match = authorization.match(/^Bearer ([A-Za-z0-9_-]{48,256})$/);
  return match ? match[1] : "";
}

function validBearer(req) {
  const expected = String(process.env.BUSINESS_VERIFICATION_ACCEPTANCE_CONTROL_TOKEN || "");
  const supplied = suppliedBearer(req);
  const expectedDigest = crypto.createHash("sha256").update(expected).digest();
  const suppliedDigest = crypto.createHash("sha256").update(supplied).digest();
  return (
    strongControlToken(expected) &&
    strongControlToken(supplied) &&
    crypto.timingSafeEqual(expectedDigest, suppliedDigest)
  );
}

function createFixedWindowLimiter({ limit, windowMs }) {
  let startedAt = 0;
  let count = 0;
  return function allow(now = Date.now()) {
    if (!startedAt || now - startedAt >= windowMs) {
      startedAt = now;
      count = 0;
    }
    count += 1;
    return {
      allowed: count <= limit,
      retryAfter: Math.max(1, Math.ceil((startedAt + windowMs - now) / 1000))
    };
  };
}

function evidenceTtlMs() {
  const seconds = Math.min(
    Math.max(Number(process.env.BUSINESS_VERIFICATION_ACCEPTANCE_EVIDENCE_TTL_SECONDS) || 900, 300),
    3600
  );
  return seconds * 1000;
}

function numericCounts(value) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key, count]) => /^[a-zA-Z][a-zA-Z0-9]*$/.test(key) && Number.isSafeInteger(count) && count >= 0)
  );
}

function readArtifact(filePath, expectedRunId) {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (parsed.runId !== expectedRunId) throw new Error("Acceptance artifact run mismatch");
  return {
    runId: expectedRunId,
    startedAt: parsed.startedAt,
    finishedAt: parsed.finishedAt,
    status: parsed.status === "PASS" ? "PASS" : "FAIL",
    commit: /^[a-f0-9]{7,40}$/i.test(String(parsed.commit || "")) ? parsed.commit : "",
    companyTypes: Object.fromEntries(
      Object.entries(parsed.companyTypes || {})
        .filter(([category]) => ["Exporter", "Importer", "Trading Company"].includes(category))
        .map(([category, value]) => [category, {
          status: value?.status === "PASS" ? "PASS" : "FAIL",
          finalPrimaryStatus: String(value?.finalPrimaryStatus || "").slice(0, 40),
          rejectedStatus: String(value?.rejectedStatus || "").slice(0, 40)
        }])
    ),
    steps: Array.isArray(parsed.steps)
      ? parsed.steps.slice(0, 300).map((item) => ({
          name: /^[A-Za-z0-9 .:_-]{1,160}$/.test(String(item?.name || "")) ? item.name : "redacted-step",
          status: item?.status === "PASS" ? "PASS" : "FAIL"
        }))
      : [],
    objectCount: Number.isSafeInteger(parsed.objectCount) && parsed.objectCount >= 0 ? parsed.objectCount : 0,
    cleanup: {
      recordsBefore: numericCounts(parsed.cleanup?.recordsBefore),
      recordsAfter: numericCounts(parsed.cleanup?.recordsAfter),
      objectsTracked: Number(parsed.cleanup?.objectsTracked || 0),
      objectsRemaining: Number(parsed.cleanup?.objectsRemaining || 0),
      runScopedObjectsRemaining: Number(parsed.cleanup?.runScopedObjectsRemaining || 0)
    },
    failure: parsed.failure ? "Acceptance checks failed" : ""
  };
}

function createRunManager({
  spawnRunner = (runnerPath, options) => fork(runnerPath, [], options),
  verifyResidue = verifyBusinessVerificationAcceptanceResidue,
  acquireDistributedLock = acquireMongoRunLock,
  releaseDistributedLock = releaseMongoRunLock,
  now = () => Date.now()
} = {}) {
  const runs = new Map();
  let activeRunId = "";

  function acquireLock(runId) {
    try {
      fs.writeFileSync(LOCK_PATH, runId, { encoding: "utf8", flag: "wx", mode: 0o600 });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const age = now() - fs.statSync(LOCK_PATH).mtimeMs;
      if (age < 2 * 60 * 60 * 1000) return false;
      fs.unlinkSync(LOCK_PATH);
      fs.writeFileSync(LOCK_PATH, runId, { encoding: "utf8", flag: "wx", mode: 0o600 });
    }
    return true;
  }

  function releaseLock(runId) {
    try {
      if (fs.readFileSync(LOCK_PATH, "utf8") === runId) fs.unlinkSync(LOCK_PATH);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  function scheduleExpiry(record) {
    const timeout = setTimeout(() => {
      if (record.status === "running") return;
      runs.delete(record.runId);
      record.ledger = null;
      record.artifact = null;
    }, Math.max(1, record.expiresAtMs - now()));
    timeout.unref?.();
    record.expiryTimer = timeout;
  }

  function publicStatus(record) {
    return {
      runId: record.runId,
      status: record.status,
      startedAt: record.startedAt,
      finishedAt: record.finishedAt,
      expiresAt: new Date(record.expiresAtMs).toISOString(),
      evidenceAvailable: Boolean(record.artifact),
      zeroResidueCheckedAt: record.residue?.checkedAt || null
    };
  }

  async function trigger() {
    if (activeRunId) return { conflict: true, runId: activeRunId };
    const runId = `bvsa_${crypto.randomBytes(24).toString("base64url")}`;
    if (!acquireLock(runId)) return { conflict: true, runId: "" };
    let distributedLocked = false;
    try {
      distributedLocked = await acquireDistributedLock(runId, now());
    } catch {
      releaseLock(runId);
      return { failed: true };
    }
    if (!distributedLocked) {
      releaseLock(runId);
      return { conflict: true, runId: "" };
    }
    const startedAt = new Date(now()).toISOString();
    const artifactPath = path.join(os.tmpdir(), `${runId}.json`);
    const record = {
      runId,
      status: "running",
      startedAt,
      finishedAt: null,
      expiresAtMs: now() + evidenceTtlMs(),
      artifact: null,
      ledger: null,
      residue: null,
      expiryTimer: null
    };
    runs.set(runId, record);
    activeRunId = runId;

    let child;
    try {
      child = spawnRunner(RUNNER_PATH, {
        env: {
          ...process.env,
          BUSINESS_VERIFICATION_STAGING_RUN_ID: runId,
          BUSINESS_VERIFICATION_STAGING_E2E_RESULT: artifactPath
        },
        stdio: ["ignore", "pipe", "pipe", "ipc"]
      });
    } catch {
      runs.delete(runId);
      activeRunId = "";
      releaseLock(runId);
      await releaseDistributedLock(runId).catch(() => {});
      return { failed: true };
    }
    child.stdout?.resume();
    child.stderr?.resume();
    child.on("message", (message) => {
      if (message?.type === "business-verification-acceptance-ledger" && message.runId === runId) {
        record.ledger = message.ledger;
      }
    });
    child.once("error", () => {
      record.status = "failed";
    });
    child.once("close", (code) => {
      try {
        record.artifact = readArtifact(artifactPath, runId);
        record.status = code === 0 && record.artifact.status === "PASS" ? "passed" : "failed";
      } catch {
        record.artifact = {
          runId,
          startedAt,
          finishedAt: new Date(now()).toISOString(),
          status: "FAIL",
          commit: "",
          companyTypes: {},
          steps: [],
          objectCount: 0,
          cleanup: {},
          failure: "Acceptance evidence was not produced"
        };
        record.status = "failed";
      } finally {
        try {
          fs.unlinkSync(artifactPath);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        record.finishedAt = record.artifact.finishedAt || new Date(now()).toISOString();
        record.expiresAtMs = now() + evidenceTtlMs();
        activeRunId = "";
        try {
          releaseLock(runId);
        } catch {
          // A retained lock fails closed until its bounded stale-lock window.
        }
        releaseDistributedLock(runId).catch(() => {});
        scheduleExpiry(record);
      }
    });
    return { conflict: false, status: publicStatus(record) };
  }

  function get(runId) {
    if (!RUN_ID_PATTERN.test(String(runId || ""))) return null;
    return runs.get(runId) || null;
  }

  async function checkResidue(runId) {
    const record = get(runId);
    if (!record) return { missing: true };
    if (record.status === "running" || !record.ledger) return { unavailable: true };
    record.residue = await verifyResidue({ runId, ledger: record.ledger });
    return { residue: record.residue };
  }

  function remove(runId) {
    const record = get(runId);
    if (!record) return { missing: true };
    if (record.status === "running") return { conflict: true };
    clearTimeout(record.expiryTimer);
    record.artifact = null;
    record.ledger = null;
    record.residue = null;
    runs.delete(runId);
    return { removed: true };
  }

  return { trigger, get, publicStatus, checkResidue, remove };
}

function createBusinessVerificationStagingAcceptanceRoutes({
  manager = createRunManager(),
  isEnabled = exactStagingEnabled,
  isRuntimeDatabaseExact = runtimeDatabaseIsExact,
  isHttps = requestIsHttps,
  authenticate = validBearer,
  limiterFactory = createFixedWindowLimiter
} = {}) {
  const router = express.Router();
  const requestLimit = limiterFactory({ limit: 30, windowMs: 60 * 1000 });
  const authFailureLimit = limiterFactory({ limit: 5, windowMs: 15 * 60 * 1000 });
  const triggerLimit = limiterFactory({ limit: 1, windowMs: 15 * 60 * 1000 });

  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("Pragma", "no-cache");
    res.set("X-Content-Type-Options", "nosniff");
    res.removeHeader("Access-Control-Allow-Origin");
    if (!isEnabled()) return res.status(404).json(SAFE_404);
    if (req.headers.origin) return res.status(403).json({ success: false, message: "Browser-origin requests are not allowed" });
    if (!isHttps(req)) return res.status(404).json(SAFE_404);
    const requestWindow = requestLimit();
    if (!requestWindow.allowed) {
      res.set("Retry-After", String(requestWindow.retryAfter));
      return res.status(429).json({ success: false, message: "Rate limit exceeded" });
    }
    if (!authenticate(req)) {
      const authWindow = authFailureLimit();
      if (!authWindow.allowed) res.set("Retry-After", String(authWindow.retryAfter));
      return res.status(authWindow.allowed ? 401 : 429).json({
        success: false,
        message: authWindow.allowed ? "Unauthorized" : "Rate limit exceeded"
      });
    }
    return next();
  });

  router.post("/runs", async (req, res) => {
    if (!isRuntimeDatabaseExact()) return res.status(503).json({ success: false, message: "Exact staging database is not ready" });
    const window = triggerLimit();
    if (!window.allowed) {
      res.set("Retry-After", String(window.retryAfter));
      return res.status(429).json({ success: false, message: "Acceptance trigger rate limit exceeded" });
    }
    let result;
    try {
      result = await manager.trigger();
    } catch {
      return res.status(503).json({ success: false, message: "Acceptance runner could not start" });
    }
    if (result.failed) return res.status(503).json({ success: false, message: "Acceptance runner could not start" });
    if (result.conflict) return res.status(409).json({ success: false, message: "An acceptance run is already active" });
    res.set("Location", `${CONTROL_PREFIX}/runs/${result.status.runId}`);
    return res.status(202).json(result.status);
  });

  router.get("/runs/:runId", (req, res) => {
    const record = manager.get(req.params.runId);
    if (!record) return res.status(404).json({ success: false, message: "Acceptance run not found" });
    return res.json(manager.publicStatus(record));
  });

  router.get("/runs/:runId/artifact", (req, res) => {
    const record = manager.get(req.params.runId);
    if (!record) return res.status(404).json({ success: false, message: "Acceptance run not found" });
    if (!record.artifact) return res.status(409).json({ success: false, message: "Acceptance evidence is not ready" });
    return res.json(record.artifact);
  });

  router.post("/runs/:runId/verify-zero-residue", async (req, res) => {
    if (!isRuntimeDatabaseExact()) return res.status(503).json({ success: false, message: "Exact staging database is not ready" });
    try {
      const result = await manager.checkResidue(req.params.runId);
      if (result.missing) return res.status(404).json({ success: false, message: "Acceptance run not found" });
      if (result.unavailable) return res.status(409).json({ success: false, message: "Exact cleanup ledger is not ready" });
      return res.status(result.residue.zeroResidue ? 200 : 409).json(result.residue);
    } catch {
      return res.status(503).json({ success: false, message: "Independent residue verification failed" });
    }
  });

  router.delete("/runs/:runId/evidence", (req, res) => {
    const result = manager.remove(req.params.runId);
    if (result.missing) return res.status(404).json({ success: false, message: "Acceptance run not found" });
    if (result.conflict) return res.status(409).json({ success: false, message: "Active acceptance evidence cannot be deleted" });
    return res.status(204).end();
  });

  router.use((_req, res) => res.status(404).json(SAFE_404));
  return router;
}

module.exports = {
  CONTROL_PREFIX,
  SAFE_404,
  acquireMongoRunLock,
  configuredDatabaseName,
  createBusinessVerificationStagingAcceptanceRoutes,
  createFixedWindowLimiter,
  createRunManager,
  evidenceTtlMs,
  exactStagingEnabled,
  exactStagingTopology,
  requestIsHttps,
  runtimeDatabaseIsExact,
  strongControlToken,
  suppliedBearer,
  validBearer
};
