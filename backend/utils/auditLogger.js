const AuditLog = require("../models/AuditLog");

function getOwnerEmail(req) {
  return (
    req.tenant?.ownerEmail ||
    req.user?.email ||
    req.headers["x-user-email"] ||
    req.body?.ownerEmail ||
    req.body?.email ||
    req.query?.email ||
    "unknown@tradeflow.local"
  )
    .toLowerCase()
    .trim();
}

async function writeAuditLog(req, data = {}) {
  try {
    await AuditLog.create({
      ownerEmail: getOwnerEmail(req),

      companyId:
        req.tenant?.companyId ||
        req.body?.companyId ||
        null,

      workspaceId:
        req.tenant?.workspaceId ||
        req.body?.workspaceId ||
        null,

      userId:
        req.user?.id ||
        null,

      employeeId:
        req.user?.employee?._id ||
        null,

      module:
        data.module ||
        "General",

      action:
        data.action ||
        "Unknown Action",

      entityType:
        data.entityType ||
        "",

      entityId:
        data.entityId ||
        "",

      severity:
        data.severity ||
        "Low",

      ipAddress:
        req.ip ||
        req.headers["x-forwarded-for"] ||
        "",

      userAgent:
        req.headers["user-agent"] ||
        "",

      metadata:
        data.metadata ||
        {}
    });
  } catch (error) {
    console.warn("Audit log failed:", error.message);
  }
}

module.exports = {
  writeAuditLog
};