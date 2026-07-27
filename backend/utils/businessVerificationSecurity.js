const crypto = require("crypto");

const FORMAT_VERSION = "bv1";
const ephemeralDevelopmentKeys = {
  encryption: crypto.randomBytes(32),
  hash: crypto.randomBytes(32)
};

function environmentName() {
  return String(process.env.NODE_ENV || "development").toLowerCase();
}

function strictBase64Key(value, variableName) {
  const raw = String(value || "").trim();
  if (!/^[A-Za-z0-9+/]{43}=$/.test(raw)) {
    throw new Error(`${variableName} must be canonical base64 for exactly 32 bytes`);
  }
  const decoded = Buffer.from(raw, "base64");
  if (decoded.length !== 32 || decoded.toString("base64") !== raw) {
    throw new Error(`${variableName} must decode to exactly 32 bytes`);
  }
  return decoded;
}

function keyVersion() {
  const version = String(process.env.BUSINESS_VERIFICATION_KEY_VERSION || "v1").trim();
  if (!/^[a-zA-Z0-9._-]{1,24}$/.test(version)) {
    throw new Error("BUSINESS_VERIFICATION_KEY_VERSION is invalid");
  }
  return version;
}

function configuredKey(variableName, developmentFallback) {
  const configured = process.env[variableName];
  if (configured) return strictBase64Key(configured, variableName);
  if (["development", "test"].includes(environmentName())) return developmentFallback;
  throw new Error(`${variableName} is required`);
}

function encryptionKey() {
  return configuredKey("BUSINESS_VERIFICATION_ENCRYPTION_KEY", ephemeralDevelopmentKeys.encryption);
}

function hashKey() {
  return configuredKey("BUSINESS_VERIFICATION_HASH_KEY", ephemeralDevelopmentKeys.hash);
}

function previousEncryptionKeys() {
  const raw = String(process.env.BUSINESS_VERIFICATION_PREVIOUS_ENCRYPTION_KEYS || "").trim();
  if (!raw) return {};
  let values;
  try {
    values = JSON.parse(raw);
  } catch {
    throw new Error("BUSINESS_VERIFICATION_PREVIOUS_ENCRYPTION_KEYS must be valid JSON");
  }
  if (!values || Array.isArray(values) || typeof values !== "object") {
    throw new Error("BUSINESS_VERIFICATION_PREVIOUS_ENCRYPTION_KEYS must be an object");
  }
  const keys = {};
  for (const [version, encoded] of Object.entries(values)) {
    if (!/^[a-zA-Z0-9._-]{1,24}$/.test(version)) {
      throw new Error("Previous encryption key version is invalid");
    }
    keys[version] = strictBase64Key(encoded, `previous encryption key ${version}`);
  }
  return keys;
}

function strictBase64Url(value, expectedBytes) {
  const raw = String(value || "");
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) throw new Error("encoding");
  const decoded = Buffer.from(raw, "base64url");
  if (decoded.length !== expectedBytes || decoded.toString("base64url") !== raw) {
    throw new Error("encoding");
  }
  return decoded;
}

function normalizeIdentifier(value) {
  return String(value || "").toUpperCase().replace(/[\s-]/g, "").trim();
}

function encryptIdentifier(value) {
  const normalized = normalizeIdentifier(value);
  if (!normalized) return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(`${FORMAT_VERSION}:${keyVersion()}`));
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  return [
    FORMAT_VERSION,
    keyVersion(),
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url")
  ].join(".");
}

function decryptIdentifier(value) {
  try {
    const [format, version, ivValue, tagValue, encryptedValue, extra] = String(value || "").split(".");
    if (
      format !== FORMAT_VERSION ||
      extra !== undefined ||
      !/^[a-zA-Z0-9._-]{1,24}$/.test(version)
    ) {
      throw new Error("format");
    }
    const keys = { ...previousEncryptionKeys(), [keyVersion()]: encryptionKey() };
    const key = keys[version];
    if (!key) throw new Error("version");
    const iv = strictBase64Url(ivValue, 12);
    const tag = strictBase64Url(tagValue, 16);
    const encrypted = strictBase64Url(encryptedValue, Buffer.from(encryptedValue, "base64url").length);
    if (encrypted.length === 0) throw new Error("ciphertext");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAAD(Buffer.from(`${format}:${version}`));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString("utf8");
  } catch {
    throw new Error("Encrypted identifier could not be authenticated");
  }
}

function keyedHash(value) {
  const normalized = normalizeIdentifier(value);
  if (!normalized) return "";
  const digest = crypto.createHmac("sha256", hashKey()).update(normalized).digest("base64url");
  return `${keyVersion()}.${digest}`;
}

function maskIdentifier(value) {
  const normalized = normalizeIdentifier(value);
  if (!normalized) return "";
  if (normalized.length <= 4) return "*".repeat(normalized.length);
  return `${normalized.slice(0, 2)}${"*".repeat(Math.max(2, normalized.length - 4))}${normalized.slice(-2)}`;
}

function getEncryptionReadiness() {
  const productionLike = !["development", "test"].includes(environmentName());
  const errors = [];
  for (const [name, reader] of [
    ["encryption", encryptionKey],
    ["hash", hashKey],
    ["version", keyVersion],
    ["previousKeys", previousEncryptionKeys]
  ]) {
    try {
      reader();
    } catch {
      errors.push(name);
    }
  }
  return {
    ready: errors.length === 0,
    mode: productionLike ? "configured" : process.env.BUSINESS_VERIFICATION_ENCRYPTION_KEY && process.env.BUSINESS_VERIFICATION_HASH_KEY ? "configured" : "ephemeral-development",
    keyVersion: errors.includes("version") ? "invalid" : keyVersion(),
    errors
  };
}

function validateIdentifiers({ country, pan, gstin, iec, incorporationNumber }, options = {}) {
  const errors = [];
  const normalizedCountry = String(country || "").trim().toUpperCase();
  const values = {
    pan: normalizeIdentifier(pan),
    gstin: normalizeIdentifier(gstin),
    iec: normalizeIdentifier(iec),
    incorporationNumber: normalizeIdentifier(incorporationNumber)
  };
  if (
    (!options.allowMissing && !values.incorporationNumber) ||
    (values.incorporationNumber && !/^[A-Z0-9/]{4,30}$/.test(values.incorporationNumber))
  ) errors.push("Incorporation number format is invalid");
  if (normalizedCountry === "INDIA" || normalizedCountry === "IN") {
    if (values.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(values.pan)) errors.push("PAN format is invalid");
    if (values.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(values.gstin)) errors.push("GSTIN format is invalid");
    if (values.iec && !/^[A-Z0-9]{10}$/.test(values.iec)) errors.push("IEC format is invalid");
  }
  return { errors, values };
}

module.exports = {
  decryptIdentifier,
  encryptIdentifier,
  getEncryptionReadiness,
  keyedHash,
  keyVersion,
  maskIdentifier,
  normalizeIdentifier,
  strictBase64Key,
  validateIdentifiers
};
