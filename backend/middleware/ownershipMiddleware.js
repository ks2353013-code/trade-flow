function getRequestEmail(req) {
  return (
    req.user?.email ||
    req.headers["x-user-email"] ||
    req.body?.ownerEmail ||
    req.body?.email ||
    req.query?.email ||
    ""
  )
    .toLowerCase()
    .trim();
}

function attachOwnerEmail(req, res, next) {
  const email = getRequestEmail(req);

  if (!email) {
    return res.status(401).json({
      success: false,
      message: "User email required for tenant isolation"
    });
  }

  req.ownerEmail = email;
  next();
}

function forceOwnerOnCreate(req, res, next) {
  const email = getRequestEmail(req);

  if (!email) {
    return res.status(401).json({
      success: false,
      message: "User email required"
    });
  }

  req.ownerEmail = email;
  req.body.ownerEmail = email;
  req.body.email = req.body.email || email;

  next();
}

module.exports = {
  attachOwnerEmail,
  forceOwnerOnCreate,
  getRequestEmail
};