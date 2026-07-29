const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  decryptIdentifier,
  encryptIdentifier,
  getEncryptionReadiness,
  keyedHash,
  keyVersion,
  maskIdentifier,
  normalizeIdentifier,
  strictBase64Key,
  validateIdentifiers
} = require("../backend/utils/businessVerificationSecurity");
const {
  assertValidUpload,
  getStorageReadiness,
  promoteCleanDocument,
  readPrivateDocument,
  removePrivateDocument,
  storeQuarantinedDocument
} = require("../backend/services/businessVerificationStorage");
const { getScannerReadiness, scanDocument } = require("../backend/services/businessVerificationScanner");
const {
  requiredDocumentTypes,
  safeVerification
} = require("../backend/routes/businessVerificationRoutes");
const { requireVerifiedBusiness } = require("../backend/middleware/businessVerificationMiddleware");
const BusinessVerification = require("../backend/models/BusinessVerification");

const TEST_ENCRYPTION_KEY = Buffer.alloc(32, 17).toString("base64");
const TEST_HASH_KEY = Buffer.alloc(32, 23).toString("base64");
process.env.NODE_ENV = "test";
process.env.BUSINESS_VERIFICATION_ENABLED = "true";
process.env.BUSINESS_VERIFICATION_ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
process.env.BUSINESS_VERIFICATION_HASH_KEY = TEST_HASH_KEY;
process.env.BUSINESS_VERIFICATION_KEY_VERSION = "test-v1";
process.env.BUSINESS_VERIFICATION_STORAGE_DRIVER = "local";
process.env.BUSINESS_VERIFICATION_SCANNER_DRIVER = "test";

test("identifier normalization, masking, encryption and duplicate hashes are safe", () => {
  const raw = " abcde-1234-f ";
  assert.equal(normalizeIdentifier(raw), "ABCDE1234F");
  assert.equal(maskIdentifier(raw), "AB******4F");
  assert.equal(keyedHash(raw), keyedHash("ABCDE1234F"));
  const encryptedA = encryptIdentifier(raw);
  const encryptedB = encryptIdentifier(raw);
  assert.notEqual(encryptedA, encryptedB);
  assert.equal(encryptedA.includes("ABCDE1234F"), false);
  assert.equal(decryptIdentifier(encryptedA), "ABCDE1234F");
});

test("verification responses mask incorporation identifiers and remove plaintext and ciphertext", () => {
  const raw = "U12345DL2020PTC123456";
  const response = safeVerification({
    _id: "507f1f77bcf86cd799439011",
    incorporationNumber: raw,
    incorporationNumberEncrypted: encryptIdentifier(raw),
    incorporationNumberMasked: maskIdentifier(raw),
    incorporationNumberHash: keyedHash(raw),
    panEncrypted: encryptIdentifier("ABCDE1234F"),
    panMasked: maskIdentifier("ABCDE1234F"),
    panHash: keyedHash("ABCDE1234F"),
    publicReference: "synthetic-reference"
  });
  const json = JSON.stringify(response);
  assert.equal(json.includes(raw), false);
  assert.equal(json.includes("bv1."), false);
  assert.equal(Object.hasOwn(response, "incorporationNumber"), false);
  assert.equal(Object.hasOwn(response, "incorporationNumberEncrypted"), false);
  assert.equal(Object.hasOwn(response, "incorporationNumberHash"), false);
  assert.equal(response.incorporationNumberMasked, maskIdentifier(raw));
  assert.equal(response.panMasked, maskIdentifier("ABCDE1234F"));
});

test("production key readiness fails closed for missing and malformed separate keys", () => {
  const snapshot = { ...process.env };
  try {
    process.env.NODE_ENV = "production";
    delete process.env.BUSINESS_VERIFICATION_ENCRYPTION_KEY;
    delete process.env.BUSINESS_VERIFICATION_HASH_KEY;
    assert.equal(getEncryptionReadiness().ready, false);
    process.env.BUSINESS_VERIFICATION_ENCRYPTION_KEY = "not-base64";
    process.env.BUSINESS_VERIFICATION_HASH_KEY = TEST_HASH_KEY;
    assert.equal(getEncryptionReadiness().ready, false);
    assert.throws(() => strictBase64Key("not-base64", "test"), /canonical base64/);
  } finally {
    process.env = snapshot;
  }
});

test("authenticated encryption rejects wrong keys and tampering", () => {
  const encrypted = encryptIdentifier("ABCDE1234F");
  const snapshot = process.env.BUSINESS_VERIFICATION_ENCRYPTION_KEY;
  process.env.BUSINESS_VERIFICATION_ENCRYPTION_KEY = Buffer.alloc(32, 91).toString("base64");
  assert.throws(() => decryptIdentifier(encrypted), /could not be authenticated/);
  process.env.BUSINESS_VERIFICATION_ENCRYPTION_KEY = snapshot;
  const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith("A") ? "B" : "A"}`;
  assert.throws(() => decryptIdentifier(tampered), /could not be authenticated/);
});

test("rotation metadata decrypts prior versions while new ciphertext uses the current version", () => {
  const oldKey = Buffer.alloc(32, 31).toString("base64");
  const newKey = Buffer.alloc(32, 32).toString("base64");
  const snapshot = { ...process.env };
  try {
    process.env.BUSINESS_VERIFICATION_KEY_VERSION = "old-v1";
    process.env.BUSINESS_VERIFICATION_ENCRYPTION_KEY = oldKey;
    const oldCiphertext = encryptIdentifier("ABCDE1234F");
    process.env.BUSINESS_VERIFICATION_KEY_VERSION = "new-v2";
    process.env.BUSINESS_VERIFICATION_ENCRYPTION_KEY = newKey;
    process.env.BUSINESS_VERIFICATION_PREVIOUS_ENCRYPTION_KEYS = JSON.stringify({ "old-v1": oldKey });
    assert.equal(decryptIdentifier(oldCiphertext), "ABCDE1234F");
    assert.match(encryptIdentifier("ABCDE1234F"), /^bv1\.new-v2\./);
    assert.equal(keyVersion(), "new-v2");
  } finally {
    process.env = snapshot;
  }
});

test("duplicate hashes use a separate versioned key", () => {
  const first = keyedHash("ABCDE1234F");
  const previous = process.env.BUSINESS_VERIFICATION_HASH_KEY;
  process.env.BUSINESS_VERIFICATION_HASH_KEY = Buffer.alloc(32, 77).toString("base64");
  const second = keyedHash("ABCDE1234F");
  process.env.BUSINESS_VERIFICATION_HASH_KEY = previous;
  assert.notEqual(first, second);
  assert.match(first, /^test-v1\./);
});

test("India PAN, GSTIN and IEC structural validation rejects invalid identifiers", () => {
  const valid = validateIdentifiers({
    country: "India",
    incorporationNumber: "U12345DL2020PTC123456",
    pan: "ABCDE1234F",
    gstin: "27ABCDE1234F1Z5",
    iec: "ABCDE1234F"
  });
  assert.deepEqual(valid.errors, []);
  const invalid = validateIdentifiers({
    country: "India",
    incorporationNumber: "x",
    pan: "123",
    gstin: "bad",
    iec: "short"
  });
  assert.equal(invalid.errors.length, 4);
});

test("category evidence rules keep importer/exporter, trading and manufacturer claims distinct", () => {
  for (const category of ["Exporter", "Importer", "Exporter & Importer"]) {
    assert.ok(requiredDocumentTypes(category).includes("IEC Evidence"));
  }
  assert.ok(requiredDocumentTypes("Trading Company").includes("Business Activity Declaration"));
  assert.equal(requiredDocumentTypes("Trading Company").includes("Production Declaration"), false);
  assert.ok(requiredDocumentTypes("Manufacturer").includes("Factory Address Evidence"));
  assert.equal(requiredDocumentTypes("Supplier").includes("IEC Evidence"), false);
});

test("upload signature checks reject executable and mismatched content", () => {
  assert.throws(() => assertValidUpload({
    mimetype: "application/pdf",
    buffer: Buffer.from("MZ executable")
  }), /signature/);
  assert.throws(() => assertValidUpload({
    mimetype: "text/html",
    buffer: Buffer.from("<script>alert(1)</script>")
  }), /allowed/);
  assert.doesNotThrow(() => assertValidUpload({
    mimetype: "application/pdf",
    buffer: Buffer.from("%PDF-1.7 synthetic")
  }));
});

test("local storage quarantines, promotes, reads and exactly deletes a synthetic file", async () => {
  const file = { mimetype: "application/pdf", buffer: Buffer.from("%PDF-1.7 synthetic clean") };
  const stored = await storeQuarantinedDocument(file, "507f1f77bcf86cd799439011");
  assert.match(stored.key, /^quarantine\//);
  await assert.rejects(() => readPrivateDocument(stored.key), /quarantined/);
  const cleanKey = await promoteCleanDocument(stored.key, "507f1f77bcf86cd799439011", file.mimetype);
  assert.match(cleanKey, /^clean\//);
  assert.deepEqual(await readPrivateDocument(cleanKey), file.buffer);
  await removePrivateDocument(cleanKey);
  await assert.rejects(() => readPrivateDocument(cleanKey), /ENOENT/);
  await assert.rejects(() => readPrivateDocument("../../secret"), /quarantined|Invalid/);
  assert.equal((await getStorageReadiness()).ready, true);
});

test("scanner is deterministic and fails closed for infected, timeout and error fixtures", async () => {
  assert.equal((await scanDocument(Buffer.from("%PDF-1.7 clean"))).status, "Clean");
  assert.equal((await scanDocument(Buffer.from("%PDF-1.7 EICAR"))).status, "Infected");
  assert.equal((await scanDocument(Buffer.from("%PDF-1.7 SCAN_ERROR"))).status, "Error");
  assert.equal((await scanDocument(Buffer.from("%PDF-1.7 SCAN_TIMEOUT"))).status, "Error");
  const readiness = await getScannerReadiness();
  assert.equal(readiness.ready, true);
  assert.equal(readiness.failClosed, true);
});

test("verification gate returns safe JSON 403 without a tenant company", async () => {
  const gate = requireVerifiedBusiness();
  let payload;
  await gate({ tenant: { ownerEmail: "tenant@example.test" } }, {
    status(code) {
      assert.equal(code, 403);
      return this;
    },
    json(value) {
      payload = value;
      return value;
    }
  }, () => assert.fail("gate must not pass"));
  assert.equal(payload.code, "BUSINESS_VERIFICATION_REQUIRED");
  assert.equal(JSON.stringify(payload).includes("tenant@example.test"), false);
});

test("verification schema has tenant, queue, expiry and duplicate-detection indexes", () => {
  const indexes = BusinessVerification.schema.indexes().map(([keys, options]) => ({ keys, options }));
  assert.ok(indexes.some(({ keys, options }) => keys.companyId === 1 && options.unique === true));
  assert.ok(indexes.some(({ keys }) => keys.verificationStatus === 1 && keys.verificationCategory === 1));
  assert.ok(indexes.some(({ keys }) => keys.iecHash === 1));
  assert.ok(indexes.some(({ keys }) => keys.validUntil === 1));
});

test("authorization and badge routes never trust spoofed headers or expose identifiers", () => {
  const routeSource = fs.readFileSync(path.join(__dirname, "../backend/routes/businessVerificationRoutes.js"), "utf8");
  const publicSource = fs.readFileSync(path.join(__dirname, "../backend/routes/businessVerificationPublicRoutes.js"), "utf8");
  assert.equal(routeSource.includes('headers["x-user-email"]'), false);
  assert.equal(routeSource.includes("req.body.ownerEmail"), false);
  assert.match(routeSource, /requireMasterAdmin/);
  assert.match(publicSource, /verificationStatus: "Verified"/);
  assert.match(publicSource, /validUntil: \{ \$gt: new Date\(\) \}/);
  assert.match(publicSource, /publicReference/);
  for (const sensitive of ["panEncrypted", "gstinEncrypted", "iecEncrypted", "documents"]) {
    assert.equal(publicSource.includes(`${sensitive}:`), false);
  }
});

test("review workflow requires reasons, confirmation, version history and duplicate blocking", () => {
  const source = fs.readFileSync(path.join(__dirname, "../backend/routes/businessVerificationRoutes.js"), "utf8");
  assert.match(source, /Explicit confirmation is required/);
  assert.match(source, /A review reason is required/);
  assert.match(source, /verification\.reviewHistory\.push/);
  assert.match(source, /Duplicate identifier review is required before verification/);
  assert.match(source, /verification\.verificationVersion \+= 1/);
  assert.match(source, /verification\.validUntil = null/);
  assert.match(source, /scanStatus !== "Clean"/);
  assert.match(source, /storageState !== "Clean"/);
});
