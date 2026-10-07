/* TradeFlow Lead Intelligence V1
   Clean-room competitive improvement layer:
   verification evidence + freshness + explainable trade intent.
   No external network calls and no autonomous outreach.
*/

function normalize(value = "") {
  return String(value || "").trim();
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(value, now = new Date()) {
  const date = parseDate(value);
  if (!date) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86400000));
}

function calculateFreshnessScore(lead = {}, now = new Date()) {
  const reference = lead.lastVerifiedAt || lead.verifiedAt || lead.sourceUpdatedAt || lead.createdAt;
  const ageDays = daysSince(reference, now);

  if (ageDays === null) return { score: 25, ageDays: null, status: "Unknown" };
  if (ageDays <= 7) return { score: 100, ageDays, status: "Fresh" };
  if (ageDays <= 30) return { score: 90, ageDays, status: "Fresh" };
  if (ageDays <= 90) return { score: 75, ageDays, status: "Aging" };
  if (ageDays <= 180) return { score: 55, ageDays, status: "Stale" };
  if (ageDays <= 365) return { score: 30, ageDays, status: "Stale" };
  return { score: 10, ageDays, status: "Very Stale" };
}

function calculateTradeIntentScore(lead = {}, context = {}, now = new Date()) {
  const evidence = [];
  const product = normalize(context.product || lead.product).toLowerCase();
  const market = normalize(context.market || lead.country).toLowerCase();
  const leadProduct = normalize(lead.product || lead.description || lead.snippet).toLowerCase();
  const leadCountry = normalize(lead.country).toLowerCase();

  let productFit = 0;
  if (product && product !== "general product") {
    const tokens = product.split(/\s+/).filter(token => token.length >= 4).slice(0, 5);
    const matches = tokens.filter(token => leadProduct.includes(token));
    productFit = tokens.length ? clamp((matches.length / tokens.length) * 100) : 0;
    if (productFit > 0) evidence.push(`Product fit ${Math.round(productFit)}%`);
  }

  let geographyFit = 0;
  if (market && market !== "global market" && leadCountry) {
    geographyFit = leadCountry.includes(market) || market.includes(leadCountry) ? 100 : 0;
    if (geographyFit) evidence.push("Target market matches lead country");
  } else if (market === "global market") {
    geographyFit = 60;
  }

  const verification = clamp(lead.verificationScore);
  const confidence = clamp(lead.confidenceScore);
  const freshness = calculateFreshnessScore(lead, now);
  const contact = lead.emailValid || lead.phoneValid || lead.email || lead.phone ? 100 : 20;
  const seniority = clamp(lead.contactSeniorityScore ?? lead.seniorityScore ?? 0);
  const activity = clamp(lead.activityScore ?? lead.intentActivityScore ?? 0);

  const score = Math.round(
    productFit * 0.22 +
    geographyFit * 0.12 +
    verification * 0.20 +
    confidence * 0.12 +
    freshness.score * 0.14 +
    contact * 0.08 +
    seniority * 0.05 +
    activity * 0.07
  );

  if (verification >= 70) evidence.push(`Verification ${Math.round(verification)}%`);
  if (freshness.status !== "Unknown") evidence.push(`Data freshness: ${freshness.status}`);
  if (contact >= 100) evidence.push("Usable contact detail present");

  const status = score >= 80 ? "High Intent" : score >= 60 ? "Promising" : score >= 40 ? "Watch" : "Low Intent";

  return {
    score: clamp(score),
    status,
    freshnessScore: freshness.score,
    freshnessStatus: freshness.status,
    freshnessAgeDays: freshness.ageDays,
    evidence
  };
}

function buildVerificationEvidence(lead = {}) {
  const evidence = [];
  const warnings = [];

  if (lead.website) evidence.push({ type: "business_website", label: "Business website", value: lead.website });
  if (lead.sourceUrl) evidence.push({ type: "source", label: "Source evidence", value: lead.sourceUrl });
  if (lead.registryUrl || lead.companyRegistryUrl) {
    evidence.push({ type: "registry", label: "Registry evidence", value: lead.registryUrl || lead.companyRegistryUrl });
  }
  if (lead.emailValid || lead.email) evidence.push({ type: "contact", label: "Email", value: lead.email || "" });
  if (lead.phoneValid || lead.phone) evidence.push({ type: "contact", label: "Phone", value: lead.phone || "" });

  for (const warning of lead.verificationWarnings || []) warnings.push(warning);
  if (Number(lead.verificationScore || 0) < 70) warnings.push("Verification score is below CRM confidence threshold.");
  if (!lead.sourceUrl) warnings.push("No source URL is attached to the current verification result.");

  return {
    verificationScore: clamp(lead.verificationScore),
    verificationStatus: normalize(lead.verificationStatus || "Unverified"),
    verifiedAt: lead.verifiedAt || null,
    evidence,
    warnings
  };
}

function buildLeadIntelligence(lead = {}, context = {}, now = new Date()) {
  const verification = buildVerificationEvidence(lead);
  const intent = calculateTradeIntentScore(lead, context, now);

  return {
    verification,
    intent,
    freshness: {
      score: intent.freshnessScore,
      status: intent.freshnessStatus,
      ageDays: intent.freshnessAgeDays
    },
    generatedAt: now.toISOString()
  };
}

module.exports = {
  clamp,
  daysSince,
  calculateFreshnessScore,
  calculateTradeIntentScore,
  buildVerificationEvidence,
  buildLeadIntelligence
};
