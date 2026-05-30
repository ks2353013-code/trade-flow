/* TradeFlow Production Tenant Middleware
   Identity comes ONLY from verified JWT req.user.
*/

function tenantMiddleware(req, res, next) {
  if (!req.user || !req.user.email) {
    return res.status(401).json({
      success: false,
      message: "Authentication required before tenant resolution"
    });
  }

  const ownerEmail = String(req.user.email).toLowerCase().trim();

  const companyId =
    req.headers["x-company-id"] ||
    req.body?.companyId ||
    req.query?.companyId ||
    null;

  const workspaceId =
    req.headers["x-workspace-id"] ||
    req.body?.workspaceId ||
    req.query?.workspaceId ||
    null;

  req.ownerEmail = ownerEmail;

  req.tenant = {
    ownerEmail,
    companyId,
    workspaceId
  };

  next();
}

module.exports = tenantMiddleware;