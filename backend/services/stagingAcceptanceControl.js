"use strict";

const crypto = require("node:crypto");
const mongoose = require("mongoose");
const { S3Client, HeadObjectCommand } = require("@aws-sdk/client-s3");
const Evidence = require("../models/StagingAcceptanceEvidence");
const User = require("../models/User");
const Company = require("../models/Company");
const Workspace = require("../models/Workspace");
const BusinessVerification = require("../models/BusinessVerification");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const { getBusinessVerificationReadiness } = require("./businessVerificationReadiness");

const DATABASE = "tradeflow_verification_staging";
const TOKEN_MIN_BYTES = 32;
const RETENTION_MS = 24 * 60 * 60 * 1000;
const TERMINAL = new Set(["Passed", "Failed", "CleanupFailed"]);
const SAFE_STATUSES = new Set(["Pending", "Running", ...TERMINAL]);
const FORBIDDEN_KEYS = /(?:token|secret|password|credential|uri|url|key|hash|document|content|path|command|stack|email|companyId|verificationId|createdIds)/i;

function enabledByEnvironment(env = process.env) {
  return env.NODE_ENV === "staging" && env.BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED === "true";
}

function assertSafeStartup(env = process.env) {
  if (env.NODE_ENV === "production" && env.BUSINESS_VERIFICATION_STAGING_ACCEPTANCE_ENABLED === "true") {
    throw new Error("Staging acceptance control plane is forbidden in production");
  }
}

function configuredToken(env = process.env) {
  const token = String(env.STAGING_ACCEPTANCE_CONTROL_TOKEN || "");
  return Buffer.byteLength(token, "utf8") >= TOKEN_MIN_BYTES ? token : "";
}

function constantTimeTokenEqual(candidate, expected) {
  const supplied = Buffer.from(String(candidate || ""));
  const configured = Buffer.from(String(expected || ""));
  const width = Math.max(supplied.length, configured.length, TOKEN_MIN_BYTES);
  const left = Buffer.alloc(width); const right = Buffer.alloc(width);
  supplied.copy(left); configured.copy(right);
  return crypto.timingSafeEqual(left, right) && supplied.length === configured.length && configured.length >= TOKEN_MIN_BYTES;
}

function redact(value, depth = 0) {
  if (depth > 8) return "[redacted]";
  if (Array.isArray(value)) return value.slice(0, 250).map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") {
    const clean = {};
    for (const [key, item] of Object.entries(value)) {
      if (key === "commit" && typeof item === "string") clean.commit = /^[a-f0-9]{7,40}$/i.test(item) ? item : "unknown";
      else if (!FORBIDDEN_KEYS.test(key)) clean[key] = redact(item, depth + 1);
    }
    return clean;
  }
  if (typeof value === "string") {
    return value
      .replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[redacted]")
      .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
      .replace(/(?:https?:\/\/|s3:\/\/)\S+/gi, "[redacted]")
      .replace(/[A-Fa-f0-9]{32,}|eyJ[A-Za-z0-9._-]+/g, "[redacted]")
      .slice(0, 500);
  }
  return ["number", "boolean"].includes(typeof value) || value === null ? value : undefined;
}

function publicRecord(record, includeArtifact = false) {
  const item = record?.toObject ? record.toObject() : record;
  if (!item || new Date(item.expiresAt) <= new Date()) return null;
  const response = {
    runId: item.runId,
    status: SAFE_STATUSES.has(item.status) ? item.status : "Failed",
    startedAt: new Date(item.startedAt).toISOString(),
    finishedAt: item.finishedAt ? new Date(item.finishedAt).toISOString() : null,
    expiresAt: new Date(item.expiresAt).toISOString(),
    summary: redact(item.summary || {})
  };
  if (includeArtifact) response.artifact = redact(item.artifact || {});
  return response;
}

function createControl(dependencies = {}) {
  const EvidenceModel = dependencies.Evidence || Evidence;
  const readiness = dependencies.readiness || getBusinessVerificationReadiness;
  const runner = dependencies.runner || (async (options) => require("../scripts/business-verification-staging-e2e").runStagingAcceptance(options));
  let activeRunId = null;
  const privateScopes = new Map();

  async function activation() {
    if (!enabledByEnvironment() || !configuredToken()) return false;
    if (mongoose.connection.readyState !== 1 || mongoose.connection.name !== DATABASE) return false;
    const state = await readiness({ live: true });
    return Boolean(state.ready && state.storage?.ready && state.storage?.private && state.scanner?.ready && state.scanner?.private && state.scanner?.failClosed);
  }

  async function start() {
    if (activeRunId) return null;
    const runId = `bva_${crypto.randomBytes(24).toString("base64url")}`;
    activeRunId = runId;
    const now = new Date();
    try {
      await EvidenceModel.create({ runId, status: "Pending", startedAt: now, expiresAt: new Date(now.getTime() + RETENTION_MS), summary: { decision: "Pending" } });
    } catch (error) { activeRunId = null; throw error; }
    setImmediate(async () => {
      try {
        await EvidenceModel.updateOne({ runId }, { $set: { status: "Running" } });
        const output = await runner({ runId, inProcess: true });
        const artifact = redact(output.artifact || output.result || output);
        const executionPassed = output.status === "PASS" && Array.isArray(artifact.steps) && artifact.steps.length > 0 && artifact.steps.every((step) => step.status === "PASS");
        const cleanupPassed = output.cleanupPassed === true;
        const status = cleanupPassed ? (executionPassed ? "Passed" : "Failed") : "CleanupFailed";
        const finishedAt = new Date();
        artifact.runId = runId;
        artifact.environment = "staging";
        artifact.startedAt = now.toISOString(); artifact.finishedAt = finishedAt.toISOString();
        artifact.finalDecision = status === "Passed" ? "PASS" : "FAIL";
        if (output.cleanupScope) {
          privateScopes.set(runId, output.cleanupScope);
          const timer = setTimeout(() => privateScopes.delete(runId), RETENTION_MS);
          timer.unref?.();
        }
        await EvidenceModel.updateOne({ runId }, { $set: { status, finishedAt, artifact, summary: { decision: artifact.finalDecision, stepCount: artifact.steps?.length || 0 } } });
      } catch {
        const finishedAt = new Date();
        await EvidenceModel.updateOne({ runId }, { $set: { status: "Failed", finishedAt, artifact: { runId, environment: "staging", startedAt: now.toISOString(), finishedAt: finishedAt.toISOString(), steps: [], failureReasons: ["Acceptance execution failed"], finalDecision: "FAIL" }, summary: { decision: "FAIL", stepCount: 0 } } }).catch(() => {});
      } finally { activeRunId = null; }
    });
    return publicRecord({ runId, status: "Pending", startedAt: now, expiresAt: new Date(now.getTime() + RETENTION_MS), summary: { decision: "Pending" } });
  }

  async function find(runId, includeArtifact = false) {
    if (!/^bva_[A-Za-z0-9_-]{32}$/.test(runId)) return null;
    const query = EvidenceModel.findOne({ runId, expiresAt: { $gt: new Date() } });
    const record = includeArtifact ? await query : await query.select("-artifact");
    return publicRecord(record, includeArtifact);
  }

  async function verifyCleanup(runId) {
    const record = await EvidenceModel.findOne({ runId, expiresAt: { $gt: new Date() } });
    if (!record) return { missing: true };
    if (!TERMINAL.has(record.status)) return { incomplete: true };
    const scope = privateScopes.get(runId);
    const counts = {};
    let failure = "";
    try {
      if (!scope || !Array.isArray(scope.users) || !Array.isArray(scope.keys)) throw new Error("scope unavailable");
      const queries = { users: [User, scope.users], companies: [Company, scope.companies], workspaces: [Workspace, scope.workspaces], verifications: [BusinessVerification, scope.verifications], notifications: [Notification, scope.notifications], audits: [AuditLog, scope.audits] };
      for (const [name, [Model, ids]] of Object.entries(queries)) counts[name] = ids.length ? await Model.countDocuments({ _id: { $in: ids } }).maxTimeMS(5000) : 0;
      const client = dependencies.s3Client || new S3Client({ endpoint: process.env.BUSINESS_VERIFICATION_S3_ENDPOINT, region: process.env.BUSINESS_VERIFICATION_S3_REGION, forcePathStyle: process.env.BUSINESS_VERIFICATION_S3_FORCE_PATH_STYLE === "true", credentials: { accessKeyId: process.env.BUSINESS_VERIFICATION_S3_ACCESS_KEY_ID, secretAccessKey: process.env.BUSINESS_VERIFICATION_S3_SECRET_ACCESS_KEY } });
      let objects = 0;
      for (const key of scope.keys) { try { await client.send(new HeadObjectCommand({ Bucket: process.env.BUSINESS_VERIFICATION_S3_BUCKET, Key: key })); objects += 1; } catch (error) { if (!["NotFound", "NoSuchKey", "404"].includes(String(error?.name || error?.$metadata?.httpStatusCode))) throw error; } }
      counts.privateObjects = objects;
    } catch { failure = "Independent cleanup verification could not prove zero residue"; }
    const pass = !failure && Object.values(counts).every((count) => count === 0);
    const evidence = { checkedAt: new Date().toISOString(), status: pass ? "PASS" : "FAIL", counts, failureReason: failure || undefined };
    const artifact = redact({ ...(record.artifact || {}), independentCleanup: evidence, finalDecision: pass && record.status === "Passed" ? "PASS" : "FAIL" });
    await EvidenceModel.updateOne({ runId }, { $set: { artifact, ...(pass ? {} : { status: "CleanupFailed", summary: { decision: "FAIL", stepCount: artifact.steps?.length || 0 } }) } });
    return evidence;
  }

  async function remove(runId) { privateScopes.delete(runId); return (await EvidenceModel.deleteOne({ runId })).deletedCount === 1; }
  return { activation, start, find, verifyCleanup, remove, isActive: () => Boolean(activeRunId) };
}

module.exports = { DATABASE, TOKEN_MIN_BYTES, TERMINAL, assertSafeStartup, configuredToken, constantTimeTokenEqual, createControl, enabledByEnvironment, redact };
