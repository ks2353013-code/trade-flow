/* TradeFlow Lead Verification Engine V2
   Verifies buyer/supplier candidates before CRM/network promotion.
   No outreach. No sending. No calling.
*/

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeWebsite(value = "") {
  let site = normalizeText(value).toLowerCase();

  if (!site) return "";

  site = site.replace(/^http:\/\//, "https://");

  if (!site.startsWith("https://")) {
    site = "https://" + site;
  }

  return site.replace(/\/+$/, "");
}

function hasValidEmail(email = "") {
  const value = normalizeText(email).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasValidPhone(phone = "") {
  const digits = normalizeText(phone).replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

function isJunkWebsite(website = "") {
  const site = normalizeWebsite(website);

  if (!site) return false;

  const junk = [
    "facebook.com",
    "instagram.com",
    "youtube.com",
    "youtu.be",
    "linkedin.com/posts",
    "pinterest.com",
    "twitter.com",
    "x.com"
  ];

  return junk.some((domain) => site.includes(domain));
}

function productMatches(lead = {}, ctx = {}) {
  const product = normalizeText(ctx.product || lead.product).toLowerCase();
  const leadProduct = normalizeText(lead.product || "").toLowerCase();
  const company = normalizeText(lead.companyName || "").toLowerCase();

  if (!product || product === "general product") return false;

  const keyword = product.split(" ")[0];

  return leadProduct.includes(keyword) || company.includes(keyword);
}

function countryMatches(lead = {}, ctx = {}) {
  const market = normalizeText(ctx.market).toLowerCase();
  const country = normalizeText(lead.country).toLowerCase();

  if (!market || market === "global market") return false;

  return country.includes(market) || market.includes(country);
}

function getSourceQuality(source = "") {
  const s = normalizeText(source).toLowerCase();

  if (!s) return 8;
  if (s.includes("serpapi")) return 18;
  if (s.includes("connector")) return 15;
  if (s.includes("mock")) return 10;
  if (s.includes("manual")) return 12;

  return 10;
}

function getLeadType(lead = {}) {
  if (lead.buyerType || lead.sourceType === "Importer") return "Buyer";
  if (lead.supplierType || lead.sourceType === "Exporter") return "Supplier";
  return "Lead";
}

function verifyLead(lead = {}, context = {}) {
  const ctx = {
    product: context.product || lead.product || "General Product",
    market: context.market || lead.country || "Global Market"
  };

  const website = normalizeWebsite(lead.website || lead.sourceUrl || "");
  const emailValid = hasValidEmail(lead.email);
  const phoneValid = hasValidPhone(lead.phone);
  const junkWebsite = isJunkWebsite(website);
  const productMatch = productMatches(lead, ctx);
  const countryMatch = countryMatches(lead, ctx);

  let score = 0;
  const signals = [];
  const warnings = [];

  if (lead.companyName) {
    score += 12;
    signals.push("Company name present");
  } else {
    warnings.push("Company name missing");
  }

  if (website && !junkWebsite) {
    score += 18;
    signals.push("Website present");
  } else if (junkWebsite) {
    warnings.push("Junk/social website detected");
  } else {
    warnings.push("Website missing");
  }

  if (emailValid) {
    score += 18;
    signals.push("Valid email format");
  } else if (lead.email) {
    warnings.push("Email format invalid");
  } else {
    warnings.push("Email missing");
  }

  if (phoneValid) {
    score += 12;
    signals.push("Phone present");
  } else if (lead.phone) {
    warnings.push("Phone format weak");
  } else {
    warnings.push("Phone missing");
  }

  if (lead.country) {
    score += 10;
    signals.push("Country present");
  } else {
    warnings.push("Country missing");
  }

  if (productMatch) {
    score += 14;
    signals.push("Product match");
  } else {
    warnings.push("Product match not confirmed");
  }

  if (countryMatch) {
    score += 8;
    signals.push("Market/country match");
  } else {
    warnings.push("Market/country match not confirmed");
  }

  score += getSourceQuality(lead.source);

  score = Math.min(score, 100);

  let verificationStatus = "Unverified";

  if (score >= 85) verificationStatus = "Verified";
  else if (score >= 70) verificationStatus = "CRM Ready";
  else if (score >= 50) verificationStatus = "Needs Verification";

  const duplicateKey = [
    normalizeText(lead.companyName).toLowerCase(),
    website,
    normalizeText(lead.email).toLowerCase()
  ]
    .filter(Boolean)
    .join("|");

  return {
    ...lead,
    leadType: getLeadType(lead),
    website,
    emailValid,
    phoneValid,
    productMatch,
    countryMatch,
    verificationScore: score,
    verificationStatus,
    verificationSignals: signals,
    verificationWarnings: warnings,
    duplicateKey,
    verifiedAt: new Date().toISOString(),
    outreachAllowed: false,
    humanApprovalRequired: true
  };
}

function dedupeVerifiedLeads(leads = []) {
  const seen = new Set();

  return leads.filter((lead) => {
    const key =
      lead.duplicateKey ||
      [
        normalizeText(lead.companyName).toLowerCase(),
        normalizeWebsite(lead.website || lead.sourceUrl || ""),
        normalizeText(lead.email).toLowerCase()
      ]
        .filter(Boolean)
        .join("|");

    if (!key) return true;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function verifyLeads(leads = [], context = {}) {
  const verified = leads.map((lead) => verifyLead(lead, context));
  const deduped = dedupeVerifiedLeads(verified);

  const sorted = deduped.sort(
    (a, b) => Number(b.verificationScore || 0) - Number(a.verificationScore || 0)
  );

  return {
    total: sorted.length,
    verifiedLeads: sorted,
    crmReadyLeads: sorted.filter((lead) => Number(lead.verificationScore || 0) >= 70),
    rejectedLeads: sorted.filter((lead) => Number(lead.verificationScore || 0) < 50),
    humanApprovalRequired: true,
    outreachAllowed: false
  };
}

module.exports = {
  verifyLead,
  verifyLeads,
  dedupeVerifiedLeads,
  hasValidEmail,
  hasValidPhone,
  normalizeWebsite
};