function tenantMiddleware(req, res, next) {
  const ownerEmail =
    req.user?.email ||
    req.headers["x-user-email"] ||
    req.body?.ownerEmail ||
    req.query?.ownerEmail ||
    "unknown@tradeflow.local";

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

  req.tenant = {
    ownerEmail: ownerEmail.toString().toLowerCase().trim(),
    companyId,
    workspaceId
  };

  next();
}

module.exports = tenantMiddleware;