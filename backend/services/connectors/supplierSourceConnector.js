/* TradeFlow Supplier Source Connector V1.1
   Provider-ready supplier discovery connector.
   Discovery only. No outreach. No auto-contact.
*/

const axios = require("axios");

const CONNECTOR_VERSION = "V1.1";

const SOURCE_TYPES = new Set([
  "Manufacturer",
  "Exporter",
  "Wholesaler",
  "Distributor",
  "Trading Company",
  "Potential Supplier"
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

const BLOG_DOMAIN_MARKERS = [
  "blogspot.",
  "wordpress.",
  "medium.com",
  "substack.com",
  "blogger.com"
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

function includesAny(value = "", terms = []) {
  const text = String(value || "").toLowerCase();
  return terms.some((term) => text.includes(term));
}

function isLinkedInPost(website = "") {
  const normalized = normalizeWebsite(website);

  return (
    normalized.includes("linkedin.com/posts") ||
    normalized.includes("linkedin.com/feed") ||
    normalized.includes("linkedin.com/pulse")
  );
}

function hasCompanySignal(raw = {}) {
  const text = [
    raw.sourceType,
    raw.supplierType,
    raw.type,
    raw.companyName,
    raw.name,
    raw.title,
    raw.website,
    raw.link,
    raw.url,
    raw.description,
    raw.snippet
  ].join(" ").toLowerCase();

  return includesAny(text, [
    "manufacturer",
    "factory",
    "exporter",
    "supplier",
    "distributor",
    "wholesale",
    "trading",
    "mills",
    "foods",
    "pharma",
    "textile",
    "commodity"
  ]);
}

function isJunkDomain(website = "", raw = {}) {
  const normalized = normalizeWebsite(website);
  const host = getWebsiteHost(normalized);

  if (!host) return false;
  if (isLinkedInPost(normalized)) return true;

  const junkDomain = [
    ...JUNK_DOMAIN_MARKERS,
    ...DIRECTORY_DOMAIN_MARKERS
  ].some((marker) => host.includes(marker));

  if (junkDomain) return true;

  const blogDomain = BLOG_DOMAIN_MARKERS.some((marker) =>
    host.includes(marker)
  );

  return blogDomain && !hasCompanySignal(raw);
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

function classifySourceType(raw = {}) {
  const text = [
    raw.sourceType,
    raw.supplierType,
    raw.type,
    raw.companyName,
    raw.name,
    raw.title,
    raw.website,
    raw.link,
    raw.url
  ].join(" ").toLowerCase();

  if (includesAny(text, ["manufacturer", "factory", "mills", "producer"])) {
    return "Manufacturer";
  }

  if (includesAny(text, ["exporter", "export", "exporters"])) {
    return "Exporter";
  }

  if (includesAny(text, ["wholesaler", "wholesale", "bulk supplier"])) {
    return "Wholesaler";
  }

  if (includesAny(text, ["distributor", "distribution", "authorized distributor"])) {
    return "Distributor";
  }

  if (includesAny(text, ["trading", "trader", "commodity trader", "commodities"])) {
    return "Trading Company";
  }

  return SOURCE_TYPES.has(raw.sourceType) ? raw.sourceType : "Potential Supplier";
}

function isPreferredSupplier(raw = {}) {
  const text = [
    raw.sourceType,
    raw.supplierType,
    raw.type,
    raw.companyName,
    raw.name,
    raw.title,
    raw.website,
    raw.link,
    raw.url,
    raw.description,
    raw.snippet
  ].join(" ").toLowerCase();

  return includesAny(text, [
    "manufacturer",
    "factory",
    "exporter",
    "supplier",
    "food exporter",
    "commodity exporter",
    "pharma exporter",
    "textile exporter",
    "trading company",
    "mills",
    "agro",
    "foods",
    "pharma",
    "textile"
  ]);
}

function hasProductMatch(supplier = {}, ctx = {}) {
  if (typeof supplier.productMatch === "boolean") {
    return supplier.productMatch;
  }

  const product = String(ctx.product || "").toLowerCase();
  const primaryTerm = product.split(" ")[0];
  const text = [
    supplier.product,
    supplier.companyName,
    supplier.name,
    supplier.title,
    supplier.description,
    supplier.snippet
  ].join(" ").toLowerCase();

  return Boolean(product && primaryTerm && text.includes(primaryTerm));
}

function scoreSupplier(supplier = {}, ctx = {}) {
  let score = 0;

  if (supplier.companyName) score += 10;
  if (supplier.country && supplier.country !== "Unknown") score += 10;
  if (supplier.website && !isJunkDomain(supplier.website, supplier)) score += 20;
  if (supplier.email) score += 20;
  if (supplier.phone) score += 10;
  if (supplier.supplierType || supplier.sourceType) score += 10;
  if (hasProductMatch(supplier, ctx)) score += 20;
  if (isPreferredSupplier(supplier)) score += 10;

  return Math.min(score, 100);
}

function riskSupplier(supplier = {}, ctx = {}) {
  let risk = 0;

  if (!supplier.website) risk += 25;
  else if (isJunkDomain(supplier.website, supplier)) risk += 30;

  if (!supplier.email) risk += 25;
  if (!supplier.phone) risk += 15;
  if (!supplier.country || supplier.country === "Unknown") risk += 15;
  if (!hasProductMatch(supplier, ctx)) risk += 20;
  if (!isPreferredSupplier(supplier)) risk += 10;

  return Math.min(risk, 100);
}

function scoreSupplierQuality(supplier = {}, ctx = {}) {
  const confidenceScore = Number(supplier.confidenceScore || scoreSupplier(supplier, ctx));
  const riskScore = Number(
    typeof supplier.riskScore === "number"
      ? supplier.riskScore
      : riskSupplier(supplier, ctx)
  );
  const productMatch = hasProductMatch(supplier, ctx) ? 1 : 0;

  return Math.min(
    Math.round(
      confidenceScore * 0.65 +
      (100 - riskScore) * 0.25 +
      productMatch * 10
    ),
    100
  );
}

function getVerificationStatus(confidenceScore, riskScore, supplierQualityScore = confidenceScore) {
  if (supplierQualityScore >= 85 && riskScore <= 25) return "Verified";
  if (supplierQualityScore >= 75 && riskScore <= 40) return "Network Ready";
  if (confidenceScore >= 50) return "Needs Verification";
  return "Unverified";
}

function normalizeSupplier(raw = {}, ctx = {}) {
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
    "Unknown Supplier"
  );

  const sourceType = classifySourceType({
    ...raw,
    companyName,
    website
  });

  const supplier = {
    companyName,
    country: raw.country || "India",
    product: raw.product || ctx.product || "",
    website,
    email: raw.email || "",
    phone: raw.phone || "",
    supplierType: sourceType,
    sourceType,
    productMatch: hasProductMatch(raw, ctx),
    source: raw.source || "Supplier Source Connector",
    sourceUrl: normalizeWebsite(raw.sourceUrl || raw.website || raw.link || raw.url || ""),
    discoveredAt: new Date().toISOString()
  };

  const confidenceScore = scoreSupplier(supplier, ctx);
  const riskScore = riskSupplier(supplier, ctx);
  const supplierQualityScore = scoreSupplierQuality(
    {
      ...supplier,
      confidenceScore,
      riskScore
    },
    ctx
  );

  return {
    ...supplier,
    confidenceScore,
    riskScore,
    supplierQualityScore,
    verificationStatus: getVerificationStatus(
      confidenceScore,
      riskScore,
      supplierQualityScore
    ),
    connectorVersion: CONNECTOR_VERSION,
    outreachAllowed: false,
    humanApprovalRequired: true
  };
}

function deduplicateSuppliers(suppliers = []) {
  const byKey = new Map();

  suppliers.forEach((supplier) => {
    const websiteHost = getWebsiteHost(supplier.website);
    const key = websiteHost ||
      `${normalizeCompanyName(supplier.companyName).toLowerCase()}::${String(
        supplier.country || ""
      ).toLowerCase()}`;

    const existing = byKey.get(key);

    if (
      !existing ||
      Number(supplier.supplierQualityScore || 0) >
        Number(existing.supplierQualityScore || 0) ||
      (
        Number(supplier.supplierQualityScore || 0) ===
          Number(existing.supplierQualityScore || 0) &&
        Number(supplier.confidenceScore || 0) >
          Number(existing.confidenceScore || 0)
      )
    ) {
      byKey.set(key, supplier);
    }
  });

  return Array.from(byKey.values());
}

function mockSupplierSource(ctx) {
  const productSlug = ctx.product.toLowerCase().replace(/\s+/g, "-");

  return [
    {
      companyName: `India ${ctx.product} Exporters Collective`,
      country: "India",
      product: ctx.product,
      website: `https://india-${productSlug}-exporters.example`,
      email: `sales@india-${productSlug}-exporters.example`,
      phone: "+91-80-000-2001",
      supplierType: "Exporter",
      source: "Mock Supplier Source"
    },
    {
      companyName: `India Premium ${ctx.product} Mills`,
      country: "India",
      product: ctx.product,
      website: `https://premium-${productSlug}-mills.example`,
      email: `exports@premium-${productSlug}-mills.example`,
      phone: "+91-80-000-2002",
      supplierType: "Manufacturer",
      source: "Mock Supplier Source"
    },
    {
      companyName: `${ctx.product} Wholesale Supply Desk`,
      country: "India",
      product: ctx.product,
      website: `https://${productSlug}-wholesale-supply.example`,
      email: "",
      phone: "+91-80-000-2003",
      supplierType: "Wholesaler",
      source: "Mock Supplier Source"
    }
  ];
}

async function serpApiSupplierSource(ctx) {
  if (!process.env.SERP_API_KEY) return [];

  const query = `${ctx.product} exporters suppliers manufacturers India`;

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
    companyName: item.title || "Supplier Result",
    country: "India",
    product: ctx.product,
    website: item.link || "",
    email: "",
    phone: "",
    supplierType: item.title || "Potential Supplier",
    description: item.snippet || "",
    snippet: item.snippet || "",
    source: "SerpAPI",
    sourceUrl: item.link || ""
  }));
}

async function discoverSuppliers(input = {}) {
  const ctx = normalizeInput(input);

  let rawSuppliers = [];

  try {
    const serpResults = await serpApiSupplierSource(ctx);
    rawSuppliers = rawSuppliers.concat(serpResults);
  } catch (error) {
    console.warn("Supplier SerpAPI source failed:", error.message);
  }

  if (!rawSuppliers.length) {
    rawSuppliers = mockSupplierSource(ctx);
  }

  const suppliers = rawSuppliers
    .filter((supplier) => !isJunkDomain(
      supplier.website ||
      supplier.link ||
      supplier.url ||
      supplier.sourceUrl ||
      "",
      supplier
    ))
    .map((supplier) => normalizeSupplier(supplier, ctx))
    .filter((supplier) => !isJunkDomain(supplier.website, supplier))
    .filter((supplier) => supplier.companyName !== "Unknown Supplier" || supplier.website)
    .filter((supplier) => isPreferredSupplier(supplier) || supplier.productMatch)
    .sort((a, b) => {
      if (b.supplierQualityScore !== a.supplierQualityScore) {
        return b.supplierQualityScore - a.supplierQualityScore;
      }

      if (b.confidenceScore !== a.confidenceScore) {
        return b.confidenceScore - a.confidenceScore;
      }

      return a.riskScore - b.riskScore;
    });

  const dedupedSuppliers = deduplicateSuppliers(suppliers);
  const finalSuppliers = dedupedSuppliers.length
    ? dedupedSuppliers
    : mockSupplierSource(ctx).map((supplier) => normalizeSupplier(supplier, ctx));

  return {
    connectorVersion: CONNECTOR_VERSION,
    sourceMode: process.env.SERP_API_KEY ? "provider" : "mock",
    product: ctx.product,
    market: ctx.market,
    total: finalSuppliers.length,
    suppliers: finalSuppliers,
    networkReadySuppliers: finalSuppliers.filter(
      (supplier) =>
        Number(supplier.supplierQualityScore || 0) >= 75 &&
        Number(supplier.riskScore || 0) <= 40
    ),
    humanApprovalRequired: true,
    note: "Discovery only. Outreach is disabled until user approval."
  };
}

module.exports = {
  deduplicateSuppliers,
  discoverSuppliers,
  normalizeCompanyName,
  normalizeWebsite,
  normalizeSupplier,
  scoreSupplier,
  scoreSupplierQuality,
  riskSupplier
};
