const crypto = require("crypto");
const TradeIntegrationCredential = require("../models/TradeIntegrationCredential");

function masterKey() {
  const raw = process.env.TRADEFLOW_INTEGRATION_MASTER_KEY || "";
  if (!raw) throw new Error("TRADEFLOW_INTEGRATION_MASTER_KEY is not configured.");
  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

function decrypt(value) {
  const raw = Buffer.from(value, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"));
}

function ctx(req) {
  return {
    ownerEmail: String(req.tenant?.ownerEmail || req.user?.email || "").toLowerCase().trim(),
    companyId: req.tenant?.companyId || null,
    workspaceId: req.tenant?.workspaceId || req.headers["x-workspace-id"] || null
  };
}

async function save(req, providerKey, credentials, expiresAt = null) {
  const c = ctx(req);
  if (!c.ownerEmail || !c.workspaceId) throw new Error("Authenticated workspace is required.");
  if (!credentials || typeof credentials !== "object") throw new Error("Credential payload is required.");
  const encryptedPayload = encrypt(credentials);
  await TradeIntegrationCredential.findOneAndUpdate(
    { ownerEmail: c.ownerEmail, workspaceId: c.workspaceId, providerKey },
    { ...c, providerKey, encryptedPayload, keyVersion: 1, lastRotatedAt: new Date(), expiresAt },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return { providerKey, configured: true, stored: true, expiresAt };
}

async function load(req, providerKey) {
  const c = ctx(req);
  const doc = await TradeIntegrationCredential.findOne({ ...c, providerKey }).select("+encryptedPayload").lean();
  if (!doc) throw new Error("Integration credentials are not configured.");
  if (doc.expiresAt && new Date(doc.expiresAt) <= new Date()) throw new Error("Integration credentials have expired and must be rotated.");
  return decrypt(doc.encryptedPayload);
}

module.exports = { save, load, encrypt, decrypt };