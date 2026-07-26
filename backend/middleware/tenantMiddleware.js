/* TradeFlow Production Tenant Middleware
   Identity comes from the verified JWT/session only. Tenant selectors from
   requests are accepted only after ownership or workspace membership checks.
*/

const mongoose = require("mongoose");
const Company = require("../models/Company");
const Workspace = require("../models/Workspace");
const { hasMasterAdminRole } = require("../utils/masterAdminIdentity");

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function normalizeObjectId(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;

  const id = String(raw).trim();
  return mongoose.isValidObjectId(id) ? id : false;
}

async function resolveCompany(companyId, ownerEmail, masterAdmin) {
  if (!companyId) return null;

  const filter = masterAdmin
    ? { _id: companyId }
    : { _id: companyId, ownerEmail };

  return Company.findOne(filter).select("_id ownerEmail").lean();
}

async function resolveWorkspace(workspaceId, ownerEmail, masterAdmin) {
  if (!workspaceId) return null;

  const filter = masterAdmin
    ? { _id: workspaceId }
    : {
        _id: workspaceId,
        $or: [
          { ownerEmail },
          { "members.email": ownerEmail }
        ]
      };

  return Workspace.findOne(filter).select("_id companyId ownerEmail members").lean();
}

async function tenantMiddleware(req, res, next) {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({
        success: false,
        message: "Authentication required before tenant resolution"
      });
    }

    const userEmail = normalizeEmail(req.user.email);
    const ownerEmail = normalizeEmail(req.user.ownerEmail || userEmail);
    const masterAdmin = hasMasterAdminRole(req.user);

    const requestedCompanyId = normalizeObjectId(
      req.headers["x-company-id"] || req.body?.companyId || req.query?.companyId
    );

    const requestedWorkspaceId = normalizeObjectId(
      req.headers["x-workspace-id"] || req.body?.workspaceId || req.query?.workspaceId
    );

    if (requestedCompanyId === false || requestedWorkspaceId === false) {
      return res.status(400).json({
        success: false,
        message: "Invalid company or workspace id"
      });
    }

    let companyId = requestedCompanyId || normalizeObjectId(req.user.companyId) || null;
    let workspaceId = requestedWorkspaceId || normalizeObjectId(req.user.workspaceId) || null;

    const workspace = await resolveWorkspace(workspaceId, ownerEmail, masterAdmin);

    if (workspaceId && !workspace) {
      return res.status(403).json({
        success: false,
        message: "Workspace access denied"
      });
    }

    if (workspace) {
      const workspaceCompanyId = String(workspace.companyId || "");

      if (companyId && workspaceCompanyId && String(companyId) !== workspaceCompanyId) {
        return res.status(403).json({
          success: false,
          message: "Workspace does not belong to selected company"
        });
      }

      companyId = workspaceCompanyId || companyId;
      workspaceId = String(workspace._id);
    }

    const company = await resolveCompany(companyId, ownerEmail, masterAdmin);

    if (companyId && !company) {
      return res.status(403).json({
        success: false,
        message: "Company access denied"
      });
    }

    req.ownerEmail = ownerEmail;

    req.tenant = {
      ownerEmail,
      userEmail,
      companyId: company ? String(company._id) : companyId || null,
      workspaceId: workspaceId || null,
      isMasterAdmin: masterAdmin
    };

    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Tenant resolution failed",
      error: error.message
    });
  }
}

module.exports = tenantMiddleware;
