"use strict";


const ACCEPTANCE_OBJECT_PREFIX = "staging-acceptance/";
const ACCEPTANCE_RUN_ID = /^bva_[A-Za-z0-9_-]{32}$/;
const MONGO_RESIDUE_TIMEOUT_MS = 750;
const R2_RESIDUE_TIMEOUT_MS = 750;
const TOTAL_RESIDUE_TIMEOUT_MS = 1750;

function unverifiableResidue() {
  return { clean: false, verifiable: false };
}

function withTimeout(promise, timeoutMs, onTimeout) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      try { onTimeout?.(); } catch {}
      reject(new Error("Staging acceptance residue lookup timed out"));
    }, timeoutMs);
    timer.unref?.();
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

async function calculateResidue({ env, EvidenceModel, s3Client, mongoTimeoutMs, r2TimeoutMs }) {
  const required = [
    "BUSINESS_VERIFICATION_S3_ENDPOINT", "BUSINESS_VERIFICATION_S3_REGION",
    "BUSINESS_VERIFICATION_S3_BUCKET", "BUSINESS_VERIFICATION_S3_ACCESS_KEY_ID",
    "BUSINESS_VERIFICATION_S3_SECRET_ACCESS_KEY"
  ];
  if (required.some((name) => typeof env[name] !== "string" || env[name].trim() === "")) {
    return unverifiableResidue();
  }

  try {
    const RunEvidence = EvidenceModel || require("../models/StagingAcceptanceEvidence");
    const countQuery = RunEvidence.countDocuments({ runId: { $regex: ACCEPTANCE_RUN_ID } })
      .maxTimeMS(mongoTimeoutMs);
    const runRecords = await withTimeout(countQuery, mongoTimeoutMs);
    const { S3Client, ListObjectsV2Command } = s3Client
      ? { S3Client: null, ListObjectsV2Command: class { constructor(input) { this.input = input; } } }
      : require("@aws-sdk/client-s3");
    const client = s3Client || new S3Client({
      endpoint: env.BUSINESS_VERIFICATION_S3_ENDPOINT,
      region: env.BUSINESS_VERIFICATION_S3_REGION,
      forcePathStyle: env.BUSINESS_VERIFICATION_S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: env.BUSINESS_VERIFICATION_S3_ACCESS_KEY_ID,
        secretAccessKey: env.BUSINESS_VERIFICATION_S3_SECRET_ACCESS_KEY
      }
    });
    let artifactObjects = 0;
    let continuationToken;
    do {
      const controller = new AbortController();
      const page = await withTimeout(client.send(new ListObjectsV2Command({
        Bucket: env.BUSINESS_VERIFICATION_S3_BUCKET,
        Prefix: ACCEPTANCE_OBJECT_PREFIX,
        ContinuationToken: continuationToken
      }), { abortSignal: controller.signal }), r2TimeoutMs, () => controller.abort());
      artifactObjects += Number(page.KeyCount || 0);
      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      if (page.IsTruncated && !continuationToken) throw new Error("Unsafe object-list pagination");
    } while (continuationToken);

    return { runRecords, artifactObjects, clean: runRecords === 0 && artifactObjects === 0 };
  } catch {
    return unverifiableResidue();
  }
}

async function calculateStagingAcceptanceResidue({
  env = process.env,
  EvidenceModel,
  s3Client,
  mongoTimeoutMs = MONGO_RESIDUE_TIMEOUT_MS,
  r2TimeoutMs = R2_RESIDUE_TIMEOUT_MS,
  totalTimeoutMs = TOTAL_RESIDUE_TIMEOUT_MS
} = {}) {
  try {
    return await withTimeout(calculateResidue({
      env,
      EvidenceModel,
      s3Client,
      mongoTimeoutMs,
      r2TimeoutMs
    }), totalTimeoutMs);
  } catch {
    return unverifiableResidue();
  }
}

module.exports = {
  ACCEPTANCE_OBJECT_PREFIX,
  ACCEPTANCE_RUN_ID,
  MONGO_RESIDUE_TIMEOUT_MS,
  R2_RESIDUE_TIMEOUT_MS,
  TOTAL_RESIDUE_TIMEOUT_MS,
  calculateStagingAcceptanceResidue,
  unverifiableResidue,
  withTimeout
};
