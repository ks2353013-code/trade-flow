const DEFAULT_BLOCKED_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "zoho.com",
  "gmx.com",
  "mail.com",
  "yandex.com",
  "hey.com",
  "fastmail.com",
  "tutanota.com",
  "mailinator.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "guerrillamail.com",
  "throwawaymail.com",
  "trashmail.com",
  "example.com",
  "test.com",
  "localhost"
]);

function splitList(value = "") {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeEmail(email = "") {
  return String(email || "").trim().toLowerCase();
}

function getEmailDomain(email = "") {
  const normalized = normalizeEmail(email);
  const parts = normalized.split("@");
  return parts.length === 2 ? parts[1] : "";
}

function isValidEmailSyntax(email = "") {
  const normalized = normalizeEmail(email);
  if (!normalized || normalized.length > 254) return false;
  if (/\s/.test(normalized)) return false;

  const parts = normalized.split("@");
  if (parts.length !== 2) return false;

  const [local, domain] = parts;
  if (!local || local.length > 64 || !domain) return false;
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
  if (domain.startsWith(".") || domain.endsWith(".") || domain.includes("..")) return false;
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/.test(local)) return false;
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) return false;
  if (domain.split(".").some((part) => !part || part.startsWith("-") || part.endsWith("-"))) {
    return false;
  }

  return true;
}

function validateCorporateSignupEmail(email = "") {
  const normalized = normalizeEmail(email);
  const domain = getEmailDomain(normalized);

  if (!isValidEmailSyntax(normalized)) {
    return {
      valid: false,
      email: normalized,
      domain,
      message: "Enter a valid business email address."
    };
  }

  const allowedDomains = splitList(process.env.TRADEFLOW_ALLOWED_SIGNUP_DOMAINS);
  if (allowedDomains.length && !allowedDomains.includes(domain)) {
    return {
      valid: false,
      email: normalized,
      domain,
      message: "This domain is not approved for TradeFlow account creation."
    };
  }

  const blockedDomains = new Set([
    ...DEFAULT_BLOCKED_DOMAINS,
    ...splitList(process.env.TRADEFLOW_BLOCKED_SIGNUP_DOMAINS)
  ]);

  if (blockedDomains.has(domain)) {
    return {
      valid: false,
      email: normalized,
      domain,
      message: "Use a company email address to create a TradeFlow account."
    };
  }

  return {
    valid: true,
    email: normalized,
    domain,
    message: "Email accepted"
  };
}

module.exports = {
  normalizeEmail,
  getEmailDomain,
  isValidEmailSyntax,
  validateCorporateSignupEmail
};
