const BusinessVerification = require("../models/BusinessVerification");
const AuditLog = require("../models/AuditLog");
const { removePrivateDocument } = require("./businessVerificationStorage");

function boundedDays(name, fallback) {
  return Math.min(Math.max(Number(process.env[name]) || fallback, 1), 3650);
}

function getRetentionPolicy() {
  return {
    draftDays: boundedDays("BUSINESS_VERIFICATION_DRAFT_RETENTION_DAYS", 30),
    rejectedDays: boundedDays("BUSINESS_VERIFICATION_REJECTED_RETENTION_DAYS", 180),
    expiredDays: boundedDays("BUSINESS_VERIFICATION_EXPIRED_RETENTION_DAYS", 365)
  };
}

function retentionCutoffs(now = new Date()) {
  const policy = getRetentionPolicy();
  return {
    draft: new Date(now.getTime() - policy.draftDays * 86400000),
    rejected: new Date(now.getTime() - policy.rejectedDays * 86400000),
    expired: new Date(now.getTime() - policy.expiredDays * 86400000)
  };
}

async function removeVerificationObjects(verification) {
  const failures = [];
  for (const document of verification.documents || []) {
    try {
      await removePrivateDocument(document.storageKey);
    } catch {
      failures.push(String(document._id));
    }
  }
  if (failures.length) throw new Error("One or more private objects could not be deleted");
}

async function deleteVerificationData(verification, actor = {}) {
  if (verification.legalHold === true) throw new Error("Verification data is under retention hold");
  const locked = await BusinessVerification.findOneAndUpdate(
    { _id: verification._id, __v: verification.__v, legalHold: { $ne: true }, deletionState: { $nin: ["Deleting"] } },
    { $set: { deletionState: "Deleting" }, $inc: { __v: 1 } },
    { new: true }
  ).select("+documents.storageKey +legalHold");
  if (!locked) throw new Error("Verification data changed before deletion could be locked");
  try {
    await removeVerificationObjects(locked);
  } catch (error) {
    await BusinessVerification.updateOne({ _id: locked._id, deletionState: "Deleting" }, { $set: { deletionState: "Deletion Error" } });
    throw error;
  }
  const snapshot = {
    id: String(locked._id),
    ownerEmail: locked.ownerEmail,
    companyId: locked.companyId,
    version: locked.verificationVersion,
    previousStatus: locked.verificationStatus
  };
  await BusinessVerification.deleteOne({ _id: locked._id, deletionState: "Deleting" });
  await AuditLog.create({
    ownerEmail: snapshot.ownerEmail,
    companyId: snapshot.companyId,
    userId: actor.userId || null,
    module: "Business Verification",
    action: "VERIFICATION_DATA_DELETED",
    message: "Verification data and private objects deleted under retention process",
    entityType: "BusinessVerification",
    entityId: snapshot.id,
    severity: "Critical",
    metadata: {
      verificationVersion: snapshot.version,
      previousStatus: snapshot.previousStatus,
      reasonCategory: actor.reasonCategory || "Retention policy"
    }
  });
  return snapshot;
}

async function runBusinessVerificationRetentionSweep({ dryRun = true, now = new Date() } = {}) {
  const cutoffs = retentionCutoffs(now);
  const candidates = await BusinessVerification.find({
    legalHold: { $ne: true },
    $or: [
      { verificationStatus: "Draft", updatedAt: { $lte: cutoffs.draft } },
      { verificationStatus: "Rejected", reviewedAt: { $lte: cutoffs.rejected } },
      { verificationStatus: "Expired", reviewedAt: { $lte: cutoffs.expired } }
    ]
  }).select("+documents.storageKey +legalHold");
  if (dryRun) return { dryRun: true, candidateCount: candidates.length, deletedCount: 0 };
  let deletedCount = 0;
  for (const verification of candidates) {
    await deleteVerificationData(verification, { reasonCategory: "Scheduled retention" });
    deletedCount += 1;
  }
  return { dryRun: false, candidateCount: candidates.length, deletedCount };
}

module.exports = {
  deleteVerificationData,
  getRetentionPolicy,
  retentionCutoffs,
  runBusinessVerificationRetentionSweep
};
