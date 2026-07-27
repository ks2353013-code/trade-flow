const express = require("express");
const multer = require("multer");
const mongoose = require("mongoose");
const BusinessVerification = require("../models/BusinessVerification");
const Company = require("../models/Company");
const Notification = require("../models/Notification");
const { hasAdminAccess, isMasterAdmin, requireMasterAdmin } = require("../middleware/permissionMiddleware");
const { writeAuditLog } = require("../utils/auditLogger");
const {
  encryptIdentifier,
  keyedHash,
  keyVersion,
  maskIdentifier,
  validateIdentifiers
} = require("../utils/businessVerificationSecurity");
const {
  readPrivateDocument,
  removePrivateDocument,
  createSignedDownloadUrl,
  promoteCleanDocument,
  storeQuarantinedDocument
} = require("../services/businessVerificationStorage");
const { scanDocument } = require("../services/businessVerificationScanner");
const { deleteVerificationData } = require("../services/businessVerificationRetention");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 10 },
  fileFilter: (_req, file, callback) => {
    callback(null, ["application/pdf", "image/png", "image/jpeg"].includes(file.mimetype));
  }
});

const EDITABLE_FIELDS = [
  "legalBusinessName", "tradeName", "businessType", "verificationCategory", "country",
  "registeredAddress", "businessEmail", "businessPhone", "website", "incorporationType",
  "authorizedRepresentativeName", "authorizedRepresentativeDesignation",
  "representativeAuthorityDeclaration", "operatingMarkets", "exportProducts", "importProducts",
  "resubmissionNotes"
];
const IDENTIFIER_FIELDS = ["incorporationNumber", "pan", "gstin", "iec", "udyam"];
const MATERIAL_FIELDS = new Set([
  "legalBusinessName", "businessType", "verificationCategory", "country", "registeredAddress",
  "incorporationNumber", "pan", "gstin", "iec"
]);
const DOCUMENT_TYPES = new Set([
  "Company Registration", "PAN Proof", "GST Registration", "Registered Address Proof",
  "Representative Authorization", "IEC Evidence", "Product Declaration",
  "Operating Markets Declaration", "Business Activity Declaration", "Relationship Evidence",
  "Factory Address Evidence", "Production Declaration", "Relevant Licence"
]);

function cleanText(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function cleanList(value) {
  const source = Array.isArray(value) ? value : String(value || "").split(",");
  return source.map((item) => cleanText(item, 120)).filter(Boolean).slice(0, 50);
}

function companyFilter(req) {
  if (req.tenant?.companyId) return { _id: req.tenant.companyId };
  return { ownerEmail: req.tenant.ownerEmail };
}

async function resolveTenantCompany(req) {
  const company = await Company.findOne(companyFilter(req)).sort({ createdAt: 1 });
  if (!company) {
    const error = new Error("Complete company onboarding before business verification");
    error.statusCode = 409;
    throw error;
  }
  return company;
}

function canManage(req) {
  return isMasterAdmin(req) || hasAdminAccess(req);
}

function ensureVerificationActive(verification) {
  if (verification?.deletionState && verification.deletionState !== "Active") {
    const error = new Error("Verification changes are blocked while a deletion request is active");
    error.statusCode = 409;
    throw error;
  }
}

function tenantVerificationFilter(req) {
  if (isMasterAdmin(req)) return {};
  return { ownerEmail: req.tenant.ownerEmail };
}

function safeVerification(doc, {
  includeDocuments = true,
  includeHistory = true,
  includeRiskFlags = false
} = {}) {
  const value = doc.toObject ? doc.toObject() : { ...doc };
  delete value.ownerEmail;
  delete value.internalNotes;
  delete value.__v;
  for (const field of [
    "incorporationNumberHash", "panEncrypted", "panHash", "gstinEncrypted",
    "gstinHash", "iecEncrypted", "iecHash", "udyamEncrypted"
  ]) {
    delete value[field];
  }
  value.verificationReferenceId = value.publicReference ? `TFV-${value.publicReference}` : "";
  delete value.publicReference;
  if (!includeRiskFlags) delete value.riskFlags;
  if (!includeDocuments) delete value.documents;
  if (!includeHistory) delete value.reviewHistory;
  if (value.documents) {
    value.documents = value.documents.map((item) => ({
      _id: item._id,
      type: item.type,
      originalName: item.originalName,
      mimeType: item.mimeType,
      size: item.size,
      scanStatus: item.scanStatus,
      storageState: item.storageState,
      expiresAt: item.expiresAt,
      uploadedAt: item.uploadedAt
    }));
  }
  return value;
}

function requiredDocumentTypes(category) {
  const core = [
    "Company Registration", "PAN Proof", "Registered Address Proof",
    "Representative Authorization"
  ];
  if (["Exporter", "Importer", "Exporter & Importer"].includes(category)) {
    return [...core, "IEC Evidence", "Product Declaration", "Operating Markets Declaration"];
  }
  if (category === "Trading Company") return [...core, "Business Activity Declaration"];
  if (category === "Manufacturer") return [...core, "Factory Address Evidence", "Production Declaration"];
  return core;
}

function missingRequirements(verification) {
  const now = Date.now();
  const present = new Set(
    verification.documents
      .filter((doc) => doc.scanStatus === "Clean" && doc.storageState === "Clean" && (!doc.expiresAt || new Date(doc.expiresAt).getTime() > now))
      .map((doc) => doc.type)
  );
  const missing = requiredDocumentTypes(verification.verificationCategory)
    .filter((type) => !present.has(type));
  const requiredFields = [
    ["legalBusinessName", "Legal business name"],
    ["businessType", "Business type"],
    ["country", "Country"],
    ["registeredAddress", "Registered address"],
    ["businessEmail", "Business email"],
    ["businessPhone", "Business phone"],
    ["incorporationType", "Incorporation type"],
    ["incorporationNumber", "Incorporation number"],
    ["authorizedRepresentativeName", "Authorized representative"],
    ["authorizedRepresentativeDesignation", "Representative designation"]
  ];
  for (const [field, label] of requiredFields) {
    if (!verification[field]) missing.push(label);
  }
  if (verification.representativeAuthorityDeclaration !== true) missing.push("Representative authority declaration");
  if (["Exporter", "Importer", "Exporter & Importer"].includes(verification.verificationCategory) && !verification.iecHash) {
    missing.push("IEC number");
  }
  return missing;
}

async function notify(verification, title, message, priority = "Medium") {
  await Notification.create({
    ownerEmail: verification.ownerEmail,
    companyId: verification.companyId,
    title,
    message,
    type: "System",
    priority,
    metadata: { businessVerificationId: String(verification._id), status: verification.verificationStatus }
  });
}

async function duplicateRiskFlags(verification) {
  const hashes = ["incorporationNumberHash", "panHash", "gstinHash", "iecHash"];
  const flags = [];
  for (const field of hashes) {
    if (!verification[field]) continue;
    const duplicate = await BusinessVerification.findOne({
      _id: { $ne: verification._id },
      companyId: { $ne: verification.companyId },
      [field]: verification[field]
    }).select("_id").lean();
    if (duplicate) flags.push(`DUPLICATE_${field.replace("Hash", "").toUpperCase()}`);
  }
  return flags;
}

function reviewMetadata(req) {
  return {
    ipAddress: cleanText(req.ip, 80),
    userAgent: cleanText(req.headers["user-agent"], 300)
  };
}

async function audit(req, verification, action, metadata = {}, severity = "Medium") {
  await writeAuditLog(req, {
    module: "Business Verification",
    action,
    entityType: "BusinessVerification",
    entityId: String(verification._id),
    severity,
    metadata: { verificationVersion: verification.verificationVersion, ...metadata }
  });
}

router.get("/requirements", async (req, res) => {
  const category = cleanText(req.query.category, 80);
  return res.json({ category, requiredDocuments: requiredDocumentTypes(category) });
});

router.get("/me", async (req, res) => {
  try {
    const company = await resolveTenantCompany(req);
    const verification = await BusinessVerification.findOne({
      companyId: company._id,
      ...tenantVerificationFilter(req)
    });
    if (!verification) {
      return res.json({ verification: null, status: "Not Started", requiredDocuments: [] });
    }
    return res.json({
      verification: safeVerification(verification, {
        includeDocuments: canManage(req),
        includeRiskFlags: isMasterAdmin(req)
      }),
      missingRequirements: missingRequirements(verification),
      requiredDocuments: requiredDocumentTypes(verification.verificationCategory)
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
});

router.put("/me", async (req, res) => {
  try {
    if (!canManage(req)) return res.status(403).json({ success: false, message: "Company Owner or Admin permission required" });
    const company = await resolveTenantCompany(req);
    let verification = await BusinessVerification.findOne({ companyId: company._id })
      .select("+incorporationNumberHash +panHash +gstinHash +iecHash");
    ensureVerificationActive(verification);
    const locked = verification && verification.verificationStatus !== "Draft";
    if (locked) {
      return res.status(409).json({
        success: false,
        message: "Submitted verification fields are locked. Start a resubmission before changing reviewed information."
      });
    }

    const data = {};
    for (const field of EDITABLE_FIELDS) {
      if (req.body[field] === undefined) continue;
      data[field] = ["operatingMarkets", "exportProducts", "importProducts"].includes(field)
        ? cleanList(req.body[field])
        : field === "representativeAuthorityDeclaration"
          ? req.body[field] === true
          : cleanText(req.body[field], field === "registeredAddress" ? 500 : 300);
    }
    const identifiers = {};
    for (const field of IDENTIFIER_FIELDS) identifiers[field] = cleanText(req.body[field], 80);
    const validation = validateIdentifiers({
      country: data.country || verification?.country,
      ...identifiers,
      incorporationNumber: identifiers.incorporationNumber || verification?.incorporationNumber
    }, { allowMissing: true });
    if (validation.errors.length) {
      return res.status(422).json({ success: false, message: "Identifier validation failed", errors: validation.errors });
    }

    if (identifiers.incorporationNumber || !verification) {
      Object.assign(data, {
        incorporationNumber: validation.values.incorporationNumber,
        incorporationNumberHash: keyedHash(validation.values.incorporationNumber)
      });
    }
    for (const field of ["pan", "gstin", "iec"]) {
      if (identifiers[field]) {
        data[`${field}Encrypted`] = encryptIdentifier(identifiers[field]);
        data[`${field}Masked`] = maskIdentifier(identifiers[field]);
        data[`${field}Hash`] = keyedHash(identifiers[field]);
      }
    }
    if (identifiers.udyam) {
      data.udyamEncrypted = encryptIdentifier(identifiers.udyam);
      data.udyamMasked = maskIdentifier(identifiers.udyam);
    }

    if (!verification) {
      verification = await BusinessVerification.create({
        ...data,
        companyId: company._id,
        ownerUserId: req.user.id,
        ownerEmail: req.tenant.ownerEmail,
        encryptionKeyVersion: keyVersion(),
        hashKeyVersion: keyVersion(),
        verificationStatus: "Draft"
      });
    } else {
      Object.assign(verification, data);
      verification.verificationStatus = "Draft";
      await verification.save();
    }
    verification.riskFlags = await duplicateRiskFlags(verification);
    await verification.save();
    await notify(verification, "Verification draft saved", "Your business verification draft was saved.");
    await audit(req, verification, "VERIFICATION_DRAFT_SAVED", { updatedFields: Object.keys(data).filter((key) => !key.endsWith("Encrypted") && !key.endsWith("Hash")) });
    return res.json({ verification: safeVerification(verification), missingRequirements: missingRequirements(verification) });
  } catch (error) {
    const status = error.name === "ValidationError" ? 422 : error.statusCode || 500;
    return res.status(status).json({ success: false, message: status === 500 ? "Failed to save verification draft" : error.message });
  }
});

router.post("/me/resubmit", async (req, res) => {
  try {
    if (!canManage(req)) return res.status(403).json({ success: false, message: "Company Owner or Admin permission required" });
    const company = await resolveTenantCompany(req);
    const verification = await BusinessVerification.findOne({ companyId: company._id, ownerEmail: req.tenant.ownerEmail });
    ensureVerificationActive(verification);
    if (!verification || !["More Information Required", "Rejected", "Verified"].includes(verification.verificationStatus)) {
      return res.status(409).json({ success: false, message: "This verification is not eligible for resubmission" });
    }
    const previousStatus = verification.verificationStatus;
    verification.verificationVersion += 1;
    verification.verificationStatus = "Draft";
    verification.validUntil = null;
    verification.resubmissionNotes = cleanText(req.body.resubmissionNotes, 1000);
    verification.rejectionReason = "";
    await verification.save();
    await audit(req, verification, "VERIFICATION_RESUBMISSION_STARTED", { previousStatus });
    return res.json({ verification: safeVerification(verification) });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: "Failed to start resubmission" });
  }
});

router.post("/me/documents", upload.single("document"), async (req, res) => {
  let stored;
  let recorded = false;
  try {
    if (!canManage(req)) return res.status(403).json({ success: false, message: "Company Owner or Admin permission required" });
    const type = cleanText(req.body.type, 100);
    if (!DOCUMENT_TYPES.has(type)) return res.status(422).json({ success: false, message: "Unsupported verification document type" });
    const company = await resolveTenantCompany(req);
    const verification = await BusinessVerification.findOne({ companyId: company._id, ownerEmail: req.tenant.ownerEmail }).select("+documents.storageKey +documents.sha256");
    ensureVerificationActive(verification);
    if (!verification) return res.status(409).json({ success: false, message: "Save the verification draft before uploading documents" });
    if (verification.verificationStatus !== "Draft") {
      return res.status(409).json({ success: false, message: "Documents are locked while this verification is under review" });
    }
    stored = await storeQuarantinedDocument(req.file, company._id);
    const previous = verification.documents.find((doc) => doc.type === type);
    verification.documents.push({
      type,
      originalName: cleanText(req.file.originalname.replace(/[^\w.\- ()]/g, "_"), 180),
      storageKey: stored.key,
      mimeType: req.file.mimetype,
      size: req.file.size,
      sha256: stored.sha256,
      scanStatus: "Pending",
      storageDriver: stored.driver,
      storageState: "Quarantine",
      uploadedBy: req.user.id
    });
    await verification.save();
    recorded = true;
    const pending = verification.documents[verification.documents.length - 1];
    await audit(req, verification, "VERIFICATION_DOCUMENT_QUARANTINED", {
      documentType: type,
      mimeType: req.file.mimetype,
      size: req.file.size
    });
    const scan = await scanDocument(req.file.buffer);
    pending.scanStatus = scan.status;
    pending.scannedAt = new Date();
    if (scan.status === "Clean") {
      pending.storageKey = await promoteCleanDocument(stored.key, company._id, req.file.mimetype);
      pending.storageState = "Clean";
      await verification.save();
      if (previous) {
        previous.storageState = "Deletion Pending";
        await verification.save();
        try {
          await removePrivateDocument(previous.storageKey);
          previous.storageState = "Deleted";
          verification.documents.pull(previous._id);
          await verification.save();
        } catch {
          previous.storageState = "Deletion Error";
          await verification.save();
          await audit(req, verification, "VERIFICATION_DOCUMENT_REPLACEMENT_CLEANUP_ERROR", {
            documentType: type
          }, "High");
          return res.status(503).json({
            success: false,
            message: "Replacement was scanned, but prior-object cleanup requires operator attention"
          });
        }
      }
      await audit(req, verification, previous ? "VERIFICATION_DOCUMENT_REPLACED" : "VERIFICATION_DOCUMENT_SCAN_CLEAN", {
        documentType: type
      }, "High");
      return res.status(201).json({ verification: safeVerification(verification), message: "Document scanned and stored privately" });
    }
    if (scan.status === "Infected") {
      await removePrivateDocument(stored.key);
      pending.storageState = "Deleted";
      await verification.save();
      await audit(req, verification, "VERIFICATION_DOCUMENT_INFECTED", { documentType: type }, "Critical");
      return res.status(422).json({ success: false, message: "Document failed security scanning" });
    }
    await verification.save();
    await audit(req, verification, "VERIFICATION_DOCUMENT_SCAN_ERROR", { documentType: type }, "High");
    return res.status(503).json({ success: false, message: "Document remains quarantined because security scanning is unavailable" });
  } catch (error) {
    if (stored?.key && !recorded) await removePrivateDocument(stored.key).catch(() => {});
    const status = error instanceof multer.MulterError ? 413 : /required|allowed|configured/.test(error.message) ? 422 : 500;
    return res.status(status).json({ success: false, message: status === 500 ? "Document upload failed" : error.message });
  }
});

router.delete("/me/documents/:documentId", async (req, res) => {
  try {
    if (!canManage(req)) return res.status(403).json({ success: false, message: "Company Owner or Admin permission required" });
    if (!mongoose.isValidObjectId(req.params.documentId)) return res.status(400).json({ success: false, message: "Invalid document id" });
    const company = await resolveTenantCompany(req);
    const verification = await BusinessVerification.findOne({ companyId: company._id, ownerEmail: req.tenant.ownerEmail }).select("+documents.storageKey");
    ensureVerificationActive(verification);
    const document = verification?.documents.id(req.params.documentId);
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });
    if (verification.verificationStatus !== "Draft") {
      return res.status(409).json({ success: false, message: "Documents are locked while this verification is under review" });
    }
    document.storageState = "Deletion Pending";
    await verification.save();
    try {
      await removePrivateDocument(document.storageKey);
      document.storageState = "Deleted";
      verification.documents.pull(document._id);
      await verification.save();
    } catch {
      document.storageState = "Deletion Error";
      await verification.save();
      return res.status(503).json({ success: false, message: "Private object cleanup requires operator attention" });
    }
    await audit(req, verification, "VERIFICATION_DOCUMENT_REMOVED", { documentType: document.type });
    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false, message: "Document removal failed" });
  }
});

router.post("/me/submit", async (req, res) => {
  try {
    if (!canManage(req)) return res.status(403).json({ success: false, message: "Company Owner or Admin permission required" });
    const company = await resolveTenantCompany(req);
    const verification = await BusinessVerification.findOne({
      companyId: company._id,
      ownerEmail: req.tenant.ownerEmail
    }).select("+incorporationNumberHash +panHash +gstinHash +iecHash");
    ensureVerificationActive(verification);
    if (!verification) return res.status(409).json({ success: false, message: "Complete a verification draft first" });
    if (verification.verificationStatus !== "Draft") {
      return res.status(409).json({ success: false, message: "Verification cannot be submitted in its current status" });
    }
    const missing = missingRequirements(verification);
    if (missing.length) return res.status(422).json({ success: false, message: "Required verification evidence is missing", missingRequirements: missing });
    verification.riskFlags = await duplicateRiskFlags(verification);
    verification.verificationStatus = "Submitted";
    verification.submittedAt = new Date();
    await verification.save();
    await notify(verification, "Verification submitted", "Your application was received for manual TradeFlow review.", "High");
    await audit(req, verification, "VERIFICATION_SUBMITTED", { riskFlagCount: verification.riskFlags.length }, "High");
    return res.json({ verification: safeVerification(verification) });
  } catch {
    return res.status(500).json({ success: false, message: "Verification submission failed" });
  }
});

router.get("/admin", requireMasterAdmin, async (req, res) => {
  const filter = {};
  for (const field of ["verificationStatus", "verificationCategory", "country"]) {
    if (req.query[field]) filter[field] = cleanText(req.query[field], 80);
  }
  if (req.query.from || req.query.to) {
    filter.submittedAt = {};
    if (req.query.from) filter.submittedAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.submittedAt.$lte = new Date(req.query.to);
  }
  const rows = await BusinessVerification.find(filter).sort({ submittedAt: 1, createdAt: 1 }).limit(200);
  return res.json({
    verifications: rows.map((row) => safeVerification(row, {
      includeDocuments: false,
      includeRiskFlags: true
    }))
  });
});

router.post("/me/request-deletion", async (req, res) => {
  try {
    if (!canManage(req)) return res.status(403).json({ success: false, message: "Company Owner or Admin permission required" });
    const company = await resolveTenantCompany(req);
    const verification = await BusinessVerification.findOne({
      companyId: company._id,
      ownerEmail: req.tenant.ownerEmail,
      deletionState: "Active"
    });
    if (!verification) return res.status(404).json({ success: false, message: "Active verification not found" });
    const reason = cleanText(req.body.reason, 500);
    if (!reason) return res.status(422).json({ success: false, message: "A deletion request reason is required" });
    verification.deletionRequestedAt = new Date();
    verification.deletionRequestReason = reason;
    verification.deletionState = "Requested";
    await verification.save();
    await audit(req, verification, "VERIFICATION_DELETION_REQUESTED", {}, "High");
    return res.status(202).json({ success: true, message: "Deletion request recorded for privacy and retention review" });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.statusCode ? error.message : "Deletion request failed" });
  }
});

router.get("/admin/:id", requireMasterAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid verification id" });
  const verification = await BusinessVerification.findById(req.params.id).select("+internalNotes");
  if (!verification) return res.status(404).json({ success: false, message: "Verification not found" });
  const value = safeVerification(verification, { includeRiskFlags: true });
  value.internalNotes = verification.internalNotes;
  return res.json({ verification: value, missingRequirements: missingRequirements(verification) });
});

router.get("/admin/:id/documents/:documentId", requireMasterAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.documentId)) {
      return res.status(400).json({ success: false, message: "Invalid verification document id" });
    }
    const verification = await BusinessVerification.findById(req.params.id).select("+documents.storageKey");
    const document = verification?.documents.id(req.params.documentId);
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });
    if (document.scanStatus !== "Clean" || document.storageState !== "Clean") {
      return res.status(423).json({ success: false, message: "Document is quarantined and unavailable" });
    }
    const file = await readPrivateDocument(document.storageKey);
    await audit(req, verification, "VERIFICATION_DOCUMENT_VIEWED", { documentType: document.type }, "High");
    res.set({
      "Content-Type": document.mimeType,
      "Content-Disposition": `attachment; filename="${document.originalName.replace(/["\r\n]/g, "_")}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    return res.send(file);
  } catch {
    return res.status(500).json({ success: false, message: "Document access failed" });
  }
});

router.post("/admin/:id/documents/:documentId/signed-download", requireMasterAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(req.params.documentId)) {
      return res.status(400).json({ success: false, message: "Invalid verification document id" });
    }
    const verification = await BusinessVerification.findById(req.params.id).select("+documents.storageKey");
    const document = verification?.documents.id(req.params.documentId);
    if (!document) return res.status(404).json({ success: false, message: "Document not found" });
    if (document.scanStatus !== "Clean" || document.storageState !== "Clean") {
      return res.status(423).json({ success: false, message: "Document is quarantined and unavailable" });
    }
    const expiresIn = 60;
    const url = await createSignedDownloadUrl(document.storageKey, document.originalName, expiresIn);
    await audit(req, verification, "VERIFICATION_DOCUMENT_SIGNED_DOWNLOAD_CREATED", {
      documentType: document.type,
      expiresIn
    }, "High");
    return res.json({ url, expiresAt: new Date(Date.now() + expiresIn * 1000) });
  } catch {
    return res.status(503).json({ success: false, message: "Private signed download is unavailable" });
  }
});

router.post("/admin/:id/review", requireMasterAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid verification id" });
    const action = cleanText(req.body.action, 40);
    const transitions = {
      start: "Under Review",
      request_information: "More Information Required",
      verify: "Verified",
      reject: "Rejected",
      suspend: "Suspended",
      expire: "Expired"
    };
    const newStatus = transitions[action];
    if (!newStatus) return res.status(422).json({ success: false, message: "Unsupported review action" });
    const reason = cleanText(req.body.reason, 1000);
    if (["request_information", "reject", "suspend", "expire"].includes(action) && !reason) {
      return res.status(422).json({ success: false, message: "A review reason is required" });
    }
    if (["verify", "reject", "suspend", "expire"].includes(action) && req.body.confirm !== true) {
      return res.status(422).json({ success: false, message: "Explicit confirmation is required" });
    }
    const verification = await BusinessVerification.findById(req.params.id)
      .select("+internalNotes +incorporationNumberHash +panHash +gstinHash +iecHash");
    if (!verification) return res.status(404).json({ success: false, message: "Verification not found" });
    const allowedPreviousStatuses = {
      start: ["Submitted"],
      request_information: ["Submitted", "Under Review"],
      verify: ["Submitted", "Under Review"],
      reject: ["Submitted", "Under Review"],
      suspend: ["Verified"],
      expire: ["Verified", "Suspended"]
    };
    if (!allowedPreviousStatuses[action].includes(verification.verificationStatus)) {
      return res.status(409).json({ success: false, message: `Cannot ${action.replace("_", " ")} a ${verification.verificationStatus} verification` });
    }
    verification.riskFlags = await duplicateRiskFlags(verification);
    const missing = missingRequirements(verification);
    if (action === "verify") {
      if (missing.length) return res.status(422).json({ success: false, message: "Missing evidence prevents verification", missingRequirements: missing });
      if (verification.riskFlags.some((flag) => flag.startsWith("DUPLICATE_"))) {
        return res.status(409).json({ success: false, message: "Duplicate identifier review is required before verification" });
      }
      if (!["Submitted", "Under Review"].includes(verification.verificationStatus)) {
        return res.status(409).json({ success: false, message: "Only a submitted application can be verified" });
      }
      if (
        req.body.officialSourceConfirmed === true &&
        (
          process.env.OFFICIAL_VERIFICATION_SOURCE_ENABLED !== "true" ||
          !cleanText(req.body.officialSourceReference, 200)
        )
      ) {
        return res.status(422).json({
          success: false,
          message: "Official Source Confirmed requires a configured authorized source and review reference"
        });
      }
      const days = Math.min(Math.max(Number(req.body.validityDays) || 365, 30), 730);
      verification.validUntil = new Date(Date.now() + days * 86400000);
      verification.evidenceLevel = req.body.officialSourceConfirmed === true
        ? "Official Source Confirmed"
        : "Document Reviewed";
    }
    const previousStatus = verification.verificationStatus;
    verification.verificationStatus = newStatus;
    verification.reviewedAt = new Date();
    verification.reviewedBy = req.user.id;
    verification.rejectionReason = ["Rejected", "More Information Required"].includes(newStatus) ? reason : "";
    verification.internalNotes = cleanText(req.body.internalNotes, 2000);
    verification.reviewHistory.push({
      actorUserId: req.user.id,
      previousStatus,
      newStatus,
      reason,
      checklist: cleanList(req.body.checklist),
      verificationVersion: verification.verificationVersion,
      requestMetadata: reviewMetadata(req)
    });
    await verification.save();
    const titles = {
      "Under Review": "Verification review started",
      "More Information Required": "More information required",
      Verified: "Business verification approved",
      Rejected: "Business verification rejected",
      Suspended: "Business verification suspended",
      Expired: "Business verification expired"
    };
    await notify(verification, titles[newStatus], reason || `Your business verification is now ${newStatus}.`, "High");
    await audit(req, verification, "VERIFICATION_REVIEW_STATUS_CHANGED", { previousStatus, newStatus, reason }, "High");
    return res.json({ verification: safeVerification(verification) });
  } catch {
    return res.status(500).json({ success: false, message: "Verification review failed" });
  }
});

router.delete("/admin/:id/data", requireMasterAdmin, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid verification id" });
    if (req.body.confirmation !== "DELETE VERIFICATION DATA") {
      return res.status(422).json({ success: false, message: "Exact deletion confirmation is required" });
    }
    const reason = cleanText(req.body.reason, 500);
    if (!reason) return res.status(422).json({ success: false, message: "A deletion reason is required" });
    const verification = await BusinessVerification.findById(req.params.id).select("+documents.storageKey +legalHold");
    if (!verification) return res.status(404).json({ success: false, message: "Verification not found" });
    await deleteVerificationData(verification, {
      userId: req.user.id,
      reasonCategory: "Approved company deletion request"
    });
    return res.json({ success: true, message: "Verification data and private objects deleted" });
  } catch (error) {
    return res.status(error.message.includes("retention hold") ? 409 : 500).json({
      success: false,
      message: error.message.includes("retention hold") ? error.message : "Verification data deletion failed"
    });
  }
});

router.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 422).json({
      success: false,
      message: error.code === "LIMIT_FILE_SIZE" ? "Document exceeds the 8 MB limit" : "Invalid document upload"
    });
  }
  return res.status(500).json({ success: false, message: "Business verification request failed" });
});

module.exports = router;
module.exports.requiredDocumentTypes = requiredDocumentTypes;
module.exports.missingRequirements = missingRequirements;
