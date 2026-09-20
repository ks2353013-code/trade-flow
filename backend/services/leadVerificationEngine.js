/* TradeFlow Lead Verification Engine V3
   Evidence-first verification. Discovery is not verification.
   No outreach. No sending. No calling.
*/

function normalizeText(value = "") {
  return String(value || "").trim();
}

function normalizeWebsite(value = "") {
  let site = normalizeText(value).toLowerCase();
  if (!site) return "";
  site = site.replace(/^http:\/\//, "https://");
  if (!site.startsWith("https://")) site = "https://" + site;
  return site.replace(/\/+$/, "");
}

function hostname(value = "") {
  try { return new URL(normalizeWebsite(value)).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function hasValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(email).toLowerCase());
}

function hasValidPhone(phone = "") {
  const digits = normalizeText(phone).replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

function isJunkWebsite(website = "") {
  const host = hostname(website);
  return [
    "facebook.com", "instagram.com", "youtube.com", "youtu.be",
    "linkedin.com", "pinterest.com", "twitter.com", "x.com"
  ].some(domain => host === domain || host.endsWith("." + domain));
}

function productMatches(lead = {}, ctx = {}) {
  const product = normalizeText(ctx.product || lead.product).toLowerCase();
  const leadProduct = normalizeText(lead.product || "").toLowerCase();
  const snippet = normalizeText(lead.snippet || lead.description || "").toLowerCase();
  if (!product || product === "general product") return false;
  const tokens = product.split(/\s+/).filter(token => token.length >= 4).slice(0, 4);
  return tokens.some(token => leadProduct.includes(token) || snippet.includes(token));
}

function countryMatches(lead = {}, ctx = {}) {
  const market = normalizeText(ctx.market).toLowerCase();
  const country = normalizeText(lead.country).toLowerCase();
  if (!market || market === "global market") return false;
  return country.includes(market) || market.includes(country);
}

function getSourceQuality(source = "") {
  const s = normalizeText(source).toLowerCase();
  if (!s) return 0;
  if (s.includes("serpapi")) return 12;
  if (s.includes("wits")) return 14;
  if (s.includes("comtrade")) return 14;
  if (s.includes("connector")) return 10;
  if (s.includes("manual")) return 8;
  return 6;
}

function verifyLead(lead = {}, context = {}) {
  const ctx = {
    product: context.product || lead.product || "General Product",
    market: context.market || lead.country || "Global Market"
  };

  const website = normalizeWebsite(lead.website || "");
  const sourceUrl = normalizeWebsite(lead.sourceUrl || lead.sourceEvidenceUrl || "");
  const websiteHost = hostname(website);
  const sourceHost = hostname(sourceUrl);
  const emailValid = hasValidEmail(lead.email);
  const phoneValid = hasValidPhone(lead.phone);
  const junkWebsite = isJunkWebsite(website);
  const productMatch = productMatches(lead, ctx);
  const countryMatch = countryMatches(lead, ctx);
  const registryEvidence = Boolean(
    lead.registryEvidence ||
    lead.registrationNumber ||
    lead.registryUrl ||
    lead.companyRegistryUrl
  );
  const independentSourceEvidence = Boolean(
    sourceUrl &&
    sourceHost &&
    websiteHost &&
    sourceHost !== websiteHost
  );
  const contactEvidence = emailValid || phoneValid;

  let score = 0;
  const signals = [];
  const warnings = [];

  if (lead.companyName) { score += 15; signals.push("Company name present"); }
  else warnings.push("Company name missing");

  if (website && !junkWebsite) { score += 20; signals.push("Business website present"); }
  else warnings.push(junkWebsite ? "Social/junk website rejected" : "Business website missing");

  if (emailValid) { score += 15; signals.push("Valid email format"); }
  else if (phoneValid) { score += 10; signals.push("Valid phone"); }
  else warnings.push("No valid direct contact");

  if (lead.country) { score += 8; signals.push("Country present"); }
  else warnings.push("Country missing");

  if (productMatch) { score += 14; signals.push("Product evidence match"); }
  else warnings.push("Product match not independently confirmed");

  if (countryMatch) { score += 8; signals.push("Market/country match"); }
  else warnings.push("Market/country match not confirmed");

  if (independentSourceEvidence) { score += 12; signals.push("Independent source evidence"); }
  else if (sourceUrl) warnings.push("Source URL is not independent of company domain");

  if (registryEvidence) { score += 8; signals.push("Company registry evidence"); }

  score += getSourceQuality(lead.source);
  score = Math.min(score, 100);

  const strongVerification =
    Boolean(lead.companyName) &&
    Boolean(website && !junkWebsite) &&
    Boolean(sourceUrl) &&
    independentSourceEvidence &&
    contactEvidence &&
    productMatch &&
    countryMatch;

  const verificationStatus = strongVerification
    ? "Verified"
    : score >= 70
      ? "CRM Ready"
      : score >= 50
        ? "Needs Verification"
        : "Unverified";

  const duplicateKey = [
    normalizeText(lead.companyName).toLowerCase(),
    websiteHost,
    normalizeText(lead.email).toLowerCase()
  ].filter(Boolean).join("|");

  return {
    ...lead,
    website,
    sourceUrl,
    leadType: lead.buyerType || lead.sourceType === "Importer" ? "Buyer" : lead.supplierType || lead.sourceType === "Exporter" ? "Supplier" : "Lead",
    emailValid,
    phoneValid,
    productMatch,
    countryMatch,
    domainEvidence: Boolean(websiteHost && !junkWebsite),
    contactEvidence,
    independentSourceEvidence,
    registryEvidence,
    verificationScore: score,
    verificationStatus,
    verificationCriteriaMet: strongVerification,
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
  return leads.filter(lead => {
    const key = lead.duplicateKey || [
      normalizeText(lead.companyName).toLowerCase(),
      hostname(lead.website || lead.sourceUrl || ""),
      normalizeText(lead.email).toLowerCase()
    ].filter(Boolean).join("|");
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function verifyLeads(leads = [], context = {}) {
  const sorted = dedupeVerifiedLeads(leads.map(lead => verifyLead(lead, context)))
    .sort((a, b) => Number(b.verificationScore || 0) - Number(a.verificationScore || 0));

  return {
    total: sorted.length,
    verifiedLeads: sorted.filter(lead => lead.verificationStatus === "Verified"),
    crmReadyLeads: sorted.filter(lead => lead.verificationStatus === "Verified" || lead.verificationStatus === "CRM Ready"),
    rejectedLeads: sorted.filter(lead => Number(lead.verificationScore || 0) < 50),
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
