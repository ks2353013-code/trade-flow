const mongoose = require("mongoose");
const crypto = require("crypto");

const STATUSES = [
  "Not Started",
  "Draft",
  "Submitted",
  "Under Review",
  "More Information Required",
  "Verified",
  "Rejected",
  "Suspended",
  "Expired"
];

const CATEGORIES = [
  "Exporter",
  "Importer",
  "Exporter & Importer",
  "Trading Company",
  "Manufacturer",
  "Supplier"
];

const documentSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    originalName: { type: String, required: true, trim: true },
    storageKey: { type: String, required: true, select: false },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    sha256: { type: String, required: true, select: false },
    scanStatus: {
      type: String,
      enum: ["Pending", "Clean", "Infected", "Error"],
      default: "Pending"
    },
    storageDriver: { type: String, enum: ["local", "s3"], required: true },
    storageState: {
      type: String,
      enum: ["Quarantine", "Clean", "Deletion Pending", "Deletion Error", "Deleted"],
      default: "Quarantine"
    },
    scannedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    uploadedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const reviewSchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    previousStatus: { type: String, enum: STATUSES, required: true },
    newStatus: { type: String, enum: STATUSES, required: true },
    reason: { type: String, default: "" },
    checklist: { type: [String], default: [] },
    verificationVersion: { type: Number, required: true },
    requestMetadata: {
      ipAddress: { type: String, default: "" },
      userAgent: { type: String, default: "" }
    },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const businessVerificationSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      immutable: true
    },
    publicReference: {
      type: String,
      default: () => crypto.randomBytes(16).toString("base64url"),
      immutable: true,
      unique: true
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      immutable: true
    },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true, immutable: true },
    legalBusinessName: { type: String, trim: true, maxlength: 180, default: "" },
    tradeName: { type: String, trim: true, maxlength: 180, default: "" },
    businessType: { type: String, trim: true, maxlength: 80, default: "" },
    verificationCategory: { type: String, enum: CATEGORIES, default: "Trading Company" },
    country: { type: String, trim: true, maxlength: 80, default: "" },
    registeredAddress: { type: String, trim: true, maxlength: 500, default: "" },
    businessEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
    businessPhone: { type: String, trim: true, maxlength: 40, default: "" },
    website: { type: String, trim: true, maxlength: 300, default: "" },
    incorporationType: { type: String, trim: true, maxlength: 80, default: "" },
    incorporationNumber: { type: String, trim: true, maxlength: 80, default: "" },
    incorporationNumberHash: { type: String, default: "", select: false },
    panEncrypted: { type: String, default: "", select: false },
    panMasked: { type: String, default: "" },
    panHash: { type: String, default: "", select: false },
    gstinEncrypted: { type: String, default: "", select: false },
    gstinMasked: { type: String, default: "" },
    gstinHash: { type: String, default: "", select: false },
    iecEncrypted: { type: String, default: "", select: false },
    iecMasked: { type: String, default: "" },
    iecHash: { type: String, default: "", select: false },
    udyamEncrypted: { type: String, default: "", select: false },
    udyamMasked: { type: String, default: "" },
    authorizedRepresentativeName: { type: String, trim: true, maxlength: 150, default: "" },
    authorizedRepresentativeDesignation: { type: String, trim: true, maxlength: 120, default: "" },
    representativeAuthorityDeclaration: { type: Boolean, default: false },
    operatingMarkets: { type: [String], default: [] },
    exportProducts: { type: [String], default: [] },
    importProducts: { type: [String], default: [] },
    documents: { type: [documentSchema], default: [] },
    verificationStatus: { type: String, enum: STATUSES, default: "Draft", index: true },
    evidenceLevel: {
      type: String,
      enum: ["Format Validated", "Document Reviewed", "Official Source Confirmed"],
      default: "Format Validated"
    },
    riskFlags: { type: [String], default: [] },
    rejectionReason: { type: String, maxlength: 1000, default: "" },
    resubmissionNotes: { type: String, maxlength: 1000, default: "" },
    internalNotes: { type: String, maxlength: 2000, default: "", select: false },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    validUntil: { type: Date, default: null, index: true },
    deletionRequestedAt: { type: Date, default: null },
    deletionRequestReason: { type: String, maxlength: 500, default: "", select: false },
    deletionState: {
      type: String,
      enum: ["Active", "Requested", "Deleting", "Deletion Error"],
      default: "Active"
    },
    legalHold: { type: Boolean, default: false, select: false },
    verificationVersion: { type: Number, min: 1, default: 1 },
    encryptionKeyVersion: { type: String, required: true, maxlength: 24 },
    hashKeyVersion: { type: String, required: true, maxlength: 24 },
    reviewHistory: { type: [reviewSchema], default: [] }
  },
  { timestamps: true, optimisticConcurrency: true }
);

businessVerificationSchema.index({ companyId: 1 }, { unique: true });
businessVerificationSchema.index({ ownerEmail: 1, verificationStatus: 1 });
businessVerificationSchema.index({ verificationStatus: 1, verificationCategory: 1, country: 1, submittedAt: -1 });
businessVerificationSchema.index({ incorporationNumberHash: 1 });
businessVerificationSchema.index({ panHash: 1 }, { sparse: true });
businessVerificationSchema.index({ gstinHash: 1 }, { sparse: true });
businessVerificationSchema.index({ iecHash: 1 }, { sparse: true });

businessVerificationSchema.statics.STATUSES = STATUSES;
businessVerificationSchema.statics.CATEGORIES = CATEGORIES;

module.exports = mongoose.model("BusinessVerification", businessVerificationSchema);
