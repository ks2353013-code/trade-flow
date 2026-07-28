"use strict";

const {
  S3Client,
  HeadObjectCommand,
  ListObjectsV2Command
} = require("@aws-sdk/client-s3");
const mongoose = require("mongoose");
const User = require("../models/User");
const Company = require("../models/Company");
const Workspace = require("../models/Workspace");
const BusinessVerification = require("../models/BusinessVerification");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");

const STAGING_DATABASE = "tradeflow_verification_staging";

function uniqueStrings(values = []) {
  return [...new Set(values.map(String).filter(Boolean))];
}

function exactIds(values = []) {
  const ids = uniqueStrings(values).filter((value) => mongoose.isValidObjectId(value));
  return ids.length ? { _id: { $in: ids } } : { _id: { $in: [] } };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildStorageClient() {
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

async function countBucketObjects(client, bucket) {
  let continuationToken;
  let count = 0;
  do {
    const page = await client.send(new ListObjectsV2Command({
      Bucket: bucket,
      ContinuationToken: continuationToken,
      MaxKeys: 1000
    }));
    count += Number(page.KeyCount || 0);
    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (continuationToken);
  return count;
}

async function countTrackedObjects(client, bucket, keys) {
  let remaining = 0;
  for (const key of uniqueStrings(keys)) {
    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      remaining += 1;
    } catch (error) {
      const status = Number(error?.$metadata?.httpStatusCode || 0);
      const code = String(error?.name || error?.Code || "");
      if (status !== 404 && !["NotFound", "NoSuchKey"].includes(code)) throw error;
    }
  }
  return remaining;
}

async function verifyBusinessVerificationAcceptanceResidue({
  runId,
  ledger,
  connection = mongoose.connection,
  storageClient = buildStorageClient()
}) {
  if (connection.readyState !== 1 || connection.name !== STAGING_DATABASE) {
    throw new Error("Exact staging database connection required");
  }
  if (!/^bvsa_[A-Za-z0-9_-]{32}$/.test(String(runId || ""))) {
    throw new Error("Invalid acceptance run identifier");
  }

  const ids = ledger?.ids || {};
  const runPattern = new RegExp(escapeRegex(runId), "i");
  const [
    users,
    companies,
    workspaces,
    verifications,
    notifications,
    audits,
    runUsers,
    runCompanies,
    runWorkspaces,
    runVerifications,
    runNotifications,
    runAudits
  ] = await Promise.all([
    User.countDocuments(exactIds(ids.users)),
    Company.countDocuments(exactIds(ids.companies)),
    Workspace.countDocuments(exactIds(ids.workspaces)),
    BusinessVerification.countDocuments(exactIds(ids.verifications)),
    Notification.countDocuments(exactIds(ids.notifications)),
    AuditLog.countDocuments(exactIds(ids.audits)),
    User.countDocuments({ email: runPattern }),
    Company.countDocuments({ companyName: runPattern }),
    Workspace.countDocuments({ workspaceName: runPattern }),
    BusinessVerification.countDocuments({ ownerEmail: runPattern }),
    Notification.countDocuments({ ownerEmail: runPattern }),
    AuditLog.countDocuments({ ownerEmail: runPattern })
  ]);

  const mongoCounts = {
    users: Math.max(users, runUsers),
    companies: Math.max(companies, runCompanies),
    workspaces: Math.max(workspaces, runWorkspaces),
    verifications: Math.max(verifications, runVerifications),
    notifications: Math.max(notifications, runNotifications),
    audits: Math.max(audits, runAudits)
  };
  const bucket = String(process.env.BUSINESS_VERIFICATION_S3_BUCKET || "");
  if (!bucket) throw new Error("Private staging object store required");
  const [trackedObjectsRemaining, bucketObjectCount] = await Promise.all([
    countTrackedObjects(storageClient, bucket, ledger?.objectKeys),
    countBucketObjects(storageClient, bucket)
  ]);
  const mongoZeroResidue = Object.values(mongoCounts).every((value) => value === 0);
  const r2ZeroResidue = trackedObjectsRemaining === 0 && bucketObjectCount === 0;

  return {
    checkedAt: new Date().toISOString(),
    zeroResidue: mongoZeroResidue && r2ZeroResidue,
    mongo: {
      zeroResidue: mongoZeroResidue,
      counts: mongoCounts
    },
    r2: {
      zeroResidue: r2ZeroResidue,
      trackedObjectsRemaining,
      bucketObjectCount
    }
  };
}

module.exports = {
  STAGING_DATABASE,
  verifyBusinessVerificationAcceptanceResidue
};
