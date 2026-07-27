const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const {
  S3Client,
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  GetPublicAccessBlockCommand,
  HeadBucketCommand,
  PutObjectCommand
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { keyedHash } = require("../utils/businessVerificationSecurity");

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const SIGNATURES = {
  "application/pdf": (buffer) => buffer.subarray(0, 5).toString() === "%PDF-",
  "image/png": (buffer) => buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  "image/jpeg": (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
};

function productionLike() {
  return !["development", "test"].includes(String(process.env.NODE_ENV || "development").toLowerCase());
}

function storageDriver() {
  const configured = String(process.env.BUSINESS_VERIFICATION_STORAGE_DRIVER || "").toLowerCase();
  if (configured) return configured;
  return productionLike() ? "unconfigured" : "local";
}

function assertValidUpload(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) throw new Error("Document file is required");
  if (file.buffer.length === 0 || file.buffer.length > MAX_UPLOAD_BYTES) throw new Error("Document exceeds the 8 MB limit");
  const validator = SIGNATURES[file.mimetype];
  if (!validator || !validator(file.buffer)) throw new Error("Document type or file signature is not allowed");
  const leading = file.buffer.subarray(0, Math.min(file.buffer.length, 4096)).toString("latin1").toLowerCase();
  if (
    leading.includes("<script") ||
    leading.includes("<!doctype html") ||
    leading.includes("<?php") ||
    leading.startsWith("mz")
  ) {
    throw new Error("Polyglot or executable document content is not allowed");
  }
}

function extensionFor(mimeType) {
  return mimeType === "application/pdf" ? ".pdf" : mimeType === "image/png" ? ".png" : ".jpg";
}

function opaqueTenantPrefix(companyId) {
  const digest = keyedHash(String(companyId)).split(".")[1];
  return `tenant/${digest}`;
}

function newObjectKey(companyId, mimeType, state = "quarantine") {
  return `${state}/${opaqueTenantPrefix(companyId)}/${crypto.randomUUID()}${extensionFor(mimeType)}`;
}

function localRoot() {
  const configured = process.env.BUSINESS_VERIFICATION_STORAGE_DIR;
  if (productionLike()) throw new Error("Local verification storage is disabled outside development and test");
  return path.resolve(configured || path.join(__dirname, "../../.private/business-verification"));
}

function localPath(key) {
  const root = localRoot();
  const target = path.resolve(root, String(key || "").replaceAll("/", path.sep));
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid private object key");
  return { root, target };
}

function s3Config() {
  const values = {
    endpoint: String(process.env.BUSINESS_VERIFICATION_S3_ENDPOINT || "").trim(),
    region: String(process.env.BUSINESS_VERIFICATION_S3_REGION || "").trim(),
    bucket: String(process.env.BUSINESS_VERIFICATION_S3_BUCKET || "").trim(),
    accessKeyId: String(process.env.BUSINESS_VERIFICATION_S3_ACCESS_KEY_ID || "").trim(),
    secretAccessKey: String(process.env.BUSINESS_VERIFICATION_S3_SECRET_ACCESS_KEY || "").trim()
  };
  if (!values.endpoint.startsWith("https://")) throw new Error("Private S3 endpoint must use TLS");
  for (const field of ["region", "bucket", "accessKeyId", "secretAccessKey"]) {
    if (!values[field]) throw new Error(`Private S3 ${field} is not configured`);
  }
  return values;
}

function s3Client() {
  const config = s3Config();
  return {
    bucket: config.bucket,
    client: new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: process.env.BUSINESS_VERIFICATION_S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      }
    })
  };
}

function encryptionParameters() {
  const kmsKeyId = String(process.env.BUSINESS_VERIFICATION_S3_KMS_KEY_ID || "").trim();
  return kmsKeyId
    ? { ServerSideEncryption: "aws:kms", SSEKMSKeyId: kmsKeyId }
    : { ServerSideEncryption: "AES256" };
}

async function storeQuarantinedDocument(file, companyId) {
  assertValidUpload(file);
  const key = newObjectKey(companyId, file.mimetype);
  const sha256 = crypto.createHash("sha256").update(file.buffer).digest("hex");
  if (storageDriver() === "local") {
    const { root, target } = localPath(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file.buffer, { flag: "wx", mode: 0o600 });
    return { key, sha256, driver: "local", state: "Quarantine" };
  }
  if (storageDriver() === "s3") {
    const { client, bucket } = s3Client();
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentLength: file.buffer.length,
      ContentType: "application/octet-stream",
      Metadata: { state: "quarantine", sha256 },
      ...encryptionParameters()
    }));
    return { key, sha256, driver: "s3", state: "Quarantine" };
  }
  throw new Error("Private business verification storage is not configured");
}

async function promoteCleanDocument(key, companyId, mimeType) {
  if (!String(key).startsWith(`quarantine/${opaqueTenantPrefix(companyId)}/`)) {
    throw new Error("Quarantine object ownership mismatch");
  }
  const cleanKey = String(key).replace(/^quarantine\//, "clean/");
  if (storageDriver() === "local") {
    const source = localPath(key);
    const target = localPath(cleanKey);
    await fs.mkdir(path.dirname(target.target), { recursive: true });
    await fs.rename(source.target, target.target);
    return cleanKey;
  }
  if (storageDriver() === "s3") {
    const { client, bucket } = s3Client();
    await client.send(new CopyObjectCommand({
      Bucket: bucket,
      Key: cleanKey,
      CopySource: `${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`,
      ContentType: mimeType,
      MetadataDirective: "REPLACE",
      Metadata: { state: "clean" },
      ...encryptionParameters()
    }));
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return cleanKey;
  }
  throw new Error("Private business verification storage is not configured");
}

async function readPrivateDocument(key) {
  if (!String(key).startsWith("clean/")) throw new Error("Document is still quarantined");
  if (storageDriver() === "local") return fs.readFile(localPath(key).target);
  if (storageDriver() === "s3") {
    const { client, bucket } = s3Client();
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const bytes = await result.Body.transformToByteArray();
    if (bytes.length > MAX_UPLOAD_BYTES) throw new Error("Stored document exceeds the size policy");
    return Buffer.from(bytes);
  }
  throw new Error("Private business verification storage is not configured");
}

async function createSignedDownloadUrl(key, originalName, expiresIn = 60) {
  if (storageDriver() !== "s3" || !String(key).startsWith("clean/")) {
    throw new Error("Signed private downloads require clean S3 storage");
  }
  const { client, bucket } = s3Client();
  const safeName = String(originalName || "verification-document").replace(/[^a-zA-Z0-9._ -]/g, "_");
  return getSignedUrl(client, new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${safeName}"`,
    ResponseCacheControl: "no-store",
    ResponseContentType: "application/octet-stream"
  }), { expiresIn: Math.min(Math.max(Number(expiresIn) || 60, 30), 120) });
}

async function removePrivateDocument(key) {
  if (!key) return;
  if (storageDriver() === "local") {
    await fs.unlink(localPath(key).target).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
    return;
  }
  if (storageDriver() === "s3") {
    const { client, bucket } = s3Client();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return;
  }
  throw new Error("Private business verification storage is not configured");
}

async function getStorageReadiness({ live = false } = {}) {
  const driver = storageDriver();
  if (driver === "local") {
    return {
      ready: !productionLike(),
      driver,
      private: true,
      durable: false,
      quarantine: true,
      signedUrls: false,
      error: productionLike() ? "local-disabled" : ""
    };
  }
  if (driver !== "s3") return { ready: false, driver, private: false, durable: false, quarantine: false, signedUrls: false, error: "unconfigured" };
  try {
    const { client, bucket } = s3Client();
    if (live) {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      if (process.env.BUSINESS_VERIFICATION_S3_PUBLIC_ACCESS_BLOCKED === "true") {
        try {
          const result = await client.send(new GetPublicAccessBlockCommand({ Bucket: bucket }));
          const block = result.PublicAccessBlockConfiguration || {};
          if (![block.BlockPublicAcls, block.IgnorePublicAcls, block.BlockPublicPolicy, block.RestrictPublicBuckets].every(Boolean)) {
            throw new Error("public-access-block-incomplete");
          }
        } catch (error) {
          if (!String(error.name || "").includes("NotImplemented")) throw error;
        }
      } else {
        throw new Error("bucket-privacy-not-attested");
      }
    }
    return { ready: true, driver, private: true, durable: true, quarantine: true, signedUrls: true, error: "" };
  } catch {
    return { ready: false, driver, private: true, durable: true, quarantine: true, signedUrls: true, error: "storage-unavailable" };
  }
}

module.exports = {
  MAX_UPLOAD_BYTES,
  assertValidUpload,
  createSignedDownloadUrl,
  getStorageReadiness,
  promoteCleanDocument,
  readPrivateDocument,
  removePrivateDocument,
  storageDriver,
  storeQuarantinedDocument
};
