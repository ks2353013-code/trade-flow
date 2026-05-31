/* TradeFlow Buyer Source Connector V1.1
   Provider-ready buyer discovery connector.
   No outreach. No auto-contact. Discovery only.
*/

const axios = require("axios");

const CONNECTOR_VERSION = "V1.1";

const SOURCE_TYPES = new Set([
  "Importer",
  "Distributor",
  "Wholesaler",
  "Trading Company",
  "Buying House"
]);

const JUNK_DOMAIN_MARKERS = [
  "facebook.com",
  "instagram.com",
  "youtube.com",
  "youtu.be",
  "pinterest.com",
  "pin.it"
];

const DIRECTORY_DOMAIN_MARKERS = [
  "yellowpages",
  "justdial",
  "sulekha",
  "yelp.",
  "indiamart",
  "tradeindia",
  "exportersindia",
  "go4worldbusiness",
  "kompass",
  "europages",
  "importgenius",
  "volza",
  "panjiva",
  "zauba",
  "zoominfo",
  "crunchbase"
];

function normalizeInput(input = {}) {
  return {
    product: input.product || "General Product",
    market: input.market || "Global Market",
    direction: input.direction || "Export"
  };
}

function normalizeCompanyName(value = "") {
  return String(value || "")
    .replace(/\s+\|\s+.*$/g, "")
    .replace(/\s+-\s+(official|home|homepage|profile|contact).*$/gi, "")
    .replace(/\b(official website|homepage|home page|contact us)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWebsite(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    parsed.hash = "";
    parsed.search = "";
    parsed.hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();

    const path = parsed.pathname.replace(/\/+$/g, "");
    return `${parsed.protocol}//${parsed.hostname}${path === "/" ? "" : path}`;
  } catch {
    return "";
  }
}

function getWebsiteHost(website = "") {
  try {
    return new URL(normalizeWebsite(website)).hostname;
  } catch {
    return "";
  }
}

function isLinkedInPost(website = "") {
  const normalized = normalizeWebsite(website);

  return (
    normalized.includes("linkedin.com/posts") ||
    normalized.includes("linkedin.com/feed") ||
    normalized.includes("linkedin.com/pulse")
  );
}

function isJunkDomain(website = "") {
  const normalized = normalizeWebsite(website);
  const host = getWebsiteHost(normalized);

  if (!host) return false;
  if (isLinkedInPost(normalized)) return true;

  return [...JUNK_DOMAIN_MARKERS, ...DIRECTORY_DOMAIN_MARKERS].some(
    (marker) => host.includes(marker)
  );
}

function inferCompanyFromWebsite(website = "") {
  const host = getWebsiteHost(website);
  const base = host.split(".")[0] || "";

  return normalizeCompanyName(
    base
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

function includesAny(value = "", terms = []) {
  const text = String(value || "").toLowerCase();
  return terms.some((term) => text.includes(term));
}

function classifySourceType(raw = {}) {
  const text = [
    raw.sourceType,
    raw.buyerType,
    raw.type,
    raw.companyName,
    raw.name,
    raw.title,
    raw.website,
    raw.link,
    raw.url
  ].join(" ").toLowerCase();

  if (includesAny(text, ["distributor", "distribution", "food distribution"])) {
    return "Distributor";
  }

  if (includesAny(text, ["wholesaler", "wholesale", "bulk buyer"])) {
    return "Wholesaler";
  }

  if (includesAny(text, ["trading", "trader", "commodity trader", "commodities"])) {
    return "Trading Company";
  }

  if (includesAny(text, ["buying house", "buying desk", "procurement", "sourcing"])) {
    return "Buying House";
  }

  if (includesAny(text, ["importer", "import", "importers"])) {
    return "Importer";
  }

  return SOURCE_TYPES.has(raw.sourceType) ? raw.sourceType : "Importer";
}

function isPreferredBuyer(raw = {}) {
  const text = [
    raw.sourceType,
    raw.buyerType,
    raw.type,
    raw.companyName,
    raw.name,
    raw.title,
    raw.website,
    raw.link,
    raw.url
  ].join(" ").toLowerCase();

  return includesAny(text, [
    "import",
    "export",
    "distributor",
    "distribution",
    "food",
    "commodity",
    "trading",
    "buying desk",
    "buying house",
    "manufacturer",
    "procurement",
    "sourcing"
  ]);
}

function hasProductMatch(buyer = {}, ctx = {}) {
  if (typeof buyer.productMatch === "boolean") {
    return buyer.productMatch;
  }

  const product = String(ctx.product || "").toLowerCase();
  const primaryTerm = product.split(" ")[0];
  const text = [
    buyer.product,
    buyer.companyName,
    buyer.name,
    buyer.title,
    buyer.description,
    buyer.snippet
  ].join(" ").toLowerCase();

  return Boolean(product && primaryTerm && text.includes(primaryTerm));
}

function scoreBuyer(buyer = {}, ctx = {}) {
  let score = 0;

  if (buyer.companyName) score += 10;
  if (buyer.website && !isJunkDomain(buyer.website)) score += 20;
  if (buyer.email) score += 20;
  if (buyer.phone) score += 15;
  if (buyer.country) score += 15;
  if (hasProductMatch(buyer, ctx)) score += 15;
  if (buyer.sourceType || buyer.buyerType) score += 5;
  if (isPreferredBuyer(buyer)) score += 5;

  return Math.min(score, 100);
}

function scoreBuyerQuality(buyer = {}, ctx = {}) {
  const confidenceScore = Number(buyer.confidenceScore || scoreBuyer(buyer, ctx));
  const websitePresent = buyer.website && !isJunkDomain(buyer.website) ? 1 : 0;
  const emailPresent = buyer.email ? 1 : 0;
  const productMatch = hasProductMatch(buyer, ctx) ? 1 : 0;

  return Math.min(
    Math.round(
      confidenceScore * 0.7 +
      websitePresent * 10 +
      emailPresent * 10 +
      productMatch * 10
    ),
    100
  );
}

function getVerificationStatus(score, qualityScore = score) {
  if (qualityScore >= 85) return "High Confidence";
  if (qualityScore >= 75) return "CRM Ready";
  if (score >= 50) return "Needs Verification";
  return "Unverified";
}

function normalizeBuyer(raw = {}, ctx = {}) {
  const website = normalizeWebsite(
    raw.website ||
    raw.link ||
    raw.url ||
    raw.sourceUrl ||
    ""
  );

  const companyName = normalizeCompanyName(
    raw.companyName ||
    raw.name ||
    raw.title ||
    inferCompanyFromWebsite(website) ||
    "Unknown Buyer"
  );

  const sourceType = classifySourceType({
    ...raw,
    companyName,
    website
  });

  const buyer = {
    companyName,

    country:
      raw.country ||
      ctx.market ||
      "",

    product:
      raw.product ||
      ctx.product ||
      "",

    website,

    email:
      raw.email ||
      "",

    phone:
      raw.phone ||
      "",

    buyerType: sourceType,

    sourceType,

    productMatch: hasProductMatch(raw, ctx),

    source:
      raw.source ||
      "Buyer Source Connector",

    sourceUrl:
      normalizeWebsite(raw.sourceUrl || raw.website || raw.link || raw.url || ""),

    discoveredAt: new Date().toISOString()
  };

  const confidenceScore = scoreBuyer(buyer, ctx);
  const buyerQualityScore = scoreBuyerQuality(
    {
      ...buyer,
      confidenceScore
    },
    ctx
  );

  return {
    ...buyer,
    confidenceScore,
    buyerQualityScore,
    verificationStatus: getVerificationStatus(confidenceScore, buyerQualityScore),
    connectorVersion: CONNECTOR_VERSION,
    outreachAllowed: false,
    humanApprovalRequired: true
  };
}

function deduplicateBuyers(buyers = []) {
  const byKey = new Map();

  buyers.forEach((buyer) => {
    const websiteHost = getWebsiteHost(buyer.website);
    const key = websiteHost ||
      `${normalizeCompanyName(buyer.companyName).toLowerCase()}::${String(
        buyer.country || ""
      ).toLowerCase()}`;

    const existing = byKey.get(key);

    if (
      !existing ||
      Number(buyer.buyerQualityScore || 0) >
        Number(existing.buyerQualityScore || 0) ||
      (
        Number(buyer.buyerQualityScore || 0) ===
          Number(existing.buyerQualityScore || 0) &&
        Number(buyer.confidenceScore || 0) >
          Number(existing.confidenceScore || 0)
      )
    ) {
      byKey.set(key, buyer);
    }
  });

  return Array.from(byKey.values());
}

function mockBuyerSource(ctx) {
  const productSlug = ctx.product.toLowerCase().replace(/\s+/g, "-");
  const marketSlug = ctx.market.toLowerCase().replace(/\s+/g, "-");

  return [
    {
      companyName: `${ctx.market} ${ctx.product} Import Network`,
      country: ctx.market,
      product: ctx.product,
      website: `https://${marketSlug}-${productSlug}-import-network.example`,
      email: `sourcing@${marketSlug}-${productSlug}-import-network.example`,
      phone: "+971-50-000-1001",
      buyerType: "Importer",
      source: "Mock Buyer Source"
    },
    {
      companyName: `${ctx.market} Food Distribution Group`,
      country: ctx.market,
      product: ctx.product,
      website: `https://${marketSlug}-food-distribution.example`,
      email: `procurement@${marketSlug}-food-distribution.example`,
      phone: "+971-50-000-1002",
      buyerType: "Distributor",
      source: "Mock Buyer Source"
    },
    {
      companyName: `${ctx.market} Wholesale Trade Desk`,
      country: ctx.market,
      product: ctx.product,
      website: `https://${marketSlug}-wholesale-trade.example`,
      email: "",
      phone: "+971-50-000-1003",
      buyerType: "Wholesaler",
      source: "Mock Buyer Source"
    }
  ];
}

async function serpApiBuyerSource(ctx) {
  if (!process.env.SERP_API_KEY) return [];

  const query = `${ctx.product} importers buyers distributors ${ctx.market}`;

  const response = await axios.get("https://serpapi.com/search.json", {
    params: {
      engine: "google",
      q: query,
      api_key: process.env.SERP_API_KEY,
      num: 10
    },
    timeout: 15000
  });

  const results = response.data?.organic_results || [];

  return results.map((item) => ({
    companyName: item.title || "Buyer Result",
    country: ctx.market,
    product: ctx.product,
    website: item.link || "",
    email: "",
    phone: "",
    buyerType: item.title || "Potential Buyer",
    description: item.snippet || "",
    snippet: item.snippet || "",
    source: "SerpAPI",
    sourceUrl: item.link || ""
  }));
}

async function discoverBuyers(input = {}) {
  const ctx = normalizeInput(input);

  let rawBuyers = [];

  try {
    const serpResults = await serpApiBuyerSource(ctx);
    rawBuyers = rawBuyers.concat(serpResults);
  } catch (error) {
    console.warn("Buyer SerpAPI source failed:", error.message);
  }

  if (!rawBuyers.length) {
    rawBuyers = mockBuyerSource(ctx);
  }

  const buyers = rawBuyers
    .filter((buyer) => !isJunkDomain(
      buyer.website ||
      buyer.link ||
      buyer.url ||
      buyer.sourceUrl ||
      ""
    ))
    .map((buyer) => normalizeBuyer(buyer, ctx))
    .filter((buyer) => !isJunkDomain(buyer.website))
    .filter((buyer) => buyer.companyName !== "Unknown Buyer" || buyer.website)
    .filter((buyer) => isPreferredBuyer(buyer) || buyer.productMatch)
    .sort((a, b) => b.buyerQualityScore - a.buyerQualityScore);

  const dedupedBuyers = deduplicateBuyers(buyers);
  const finalBuyers = dedupedBuyers.length
    ? dedupedBuyers
    : mockBuyerSource(ctx).map((buyer) => normalizeBuyer(buyer, ctx));

  return {
    connectorVersion: CONNECTOR_VERSION,
    sourceMode: process.env.SERP_API_KEY ? "provider" : "mock",
    product: ctx.product,
    market: ctx.market,
    total: finalBuyers.length,
    buyers: finalBuyers,
    crmReadyBuyers: finalBuyers.filter(
      (buyer) => Number(buyer.buyerQualityScore || 0) >= 75
    ),
    humanApprovalRequired: true,
    note: "Discovery only. Outreach is disabled until user approval."
  };
}

module.exports = {
  deduplicateBuyers,
  discoverBuyers,
  normalizeCompanyName,
  normalizeWebsite,
  normalizeBuyer,
  scoreBuyer,
  scoreBuyerQuality
};
