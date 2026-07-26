const MASTER_ADMIN_ROLE = "Master Admin";

const MASTER_ADMIN_EMAILS = new Set([
  "contact@tradeflowai.in",
  "ks2353013@gmail.com"
]);

function normalizeIdentityEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isMasterAdminEmail(email) {
  return MASTER_ADMIN_EMAILS.has(normalizeIdentityEmail(email));
}

function applyMasterAdminIdentity(user) {
  if (!user) return false;

  const normalizedEmail = normalizeIdentityEmail(user.email);
  let changed = false;

  if (user.email !== normalizedEmail) {
    user.email = normalizedEmail;
    changed = true;
  }

  if (isMasterAdminEmail(normalizedEmail)) {
    if (user.role !== MASTER_ADMIN_ROLE) {
      user.role = MASTER_ADMIN_ROLE;
      changed = true;
    }
    if (user.isMasterAdmin !== true) {
      user.isMasterAdmin = true;
      changed = true;
    }
  } else {
    if (user.role === MASTER_ADMIN_ROLE) {
      user.role = "Founder";
      changed = true;
    }
    if (user.isMasterAdmin === true) {
      user.isMasterAdmin = false;
      changed = true;
    }
  }

  return changed;
}

function hasMasterAdminRole(user) {
  return user?.role === MASTER_ADMIN_ROLE;
}

module.exports = {
  MASTER_ADMIN_EMAILS,
  MASTER_ADMIN_ROLE,
  normalizeIdentityEmail,
  isMasterAdminEmail,
  applyMasterAdminIdentity,
  hasMasterAdminRole
};
