/* TradeFlow Supplier Source Connector V1
   Provider-ready supplier discovery connector.
   Discovery only. No outreach. No auto-contact.
*/

const axios = require("axios");

function normalizeInput(input = {}) {
  return {
    product: input.product || "General Product",
    market: input.market || "Global Market",
    direction: input.direction || "Export"
  };
}

function scoreSupplier(supplier = {}, ctx = {}) {
  let score = 0;

  if (supplier.companyName) score += 10;
  if (supplier.country) score += 10;
  if (supplier.website) score += 20;
  if (supplier.email) score += 20;
  if (supplier.phone) score += 10;
  if (supplier.supplierType) score += 10;

  const productMatch =
    supplier.product &&
    ctx.product &&
    supplier.product
      .toLowerCase()
      .includes(ctx.product.toLowerCase().split(" ")[0]);

  if (productMatch) score += 20;

  return Math.min(score, 100);
}

function riskSupplier(supplier = {}, ctx = {}) {
  let risk = 0;

  if (!supplier.website) risk += 25;
  if (!supplier.email) risk += 25;
  if (!supplier.phone) risk += 15;
  if (!supplier.country || supplier.country === "Unknown") risk += 15;

  const productMatch =
    supplier.product &&
    ctx.product &&
    supplier.product
      .toLowerCase()
      .includes(ctx.product.toLowerCase().split(" ")[0]);

  if (!productMatch) risk += 20;

  return Math.min(risk, 100);
}

function getVerificationStatus(confidenceScore, riskScore) {
  if (confidenceScore >= 85 && riskScore <= 25) return "Verified";
  if (confidenceScore >= 70 && riskScore <= 40) return "Network Ready";
  if (confidenceScore >= 50) return "Needs Verification";
  return "Unverified";
}

function normalizeSupplier(raw = {}, ctx = {}) {
  const supplier = {
    companyName:
      raw.companyName ||
      raw.name ||
      raw.title ||
      "Unknown Supplier",

    country:
      raw.country ||
      "India",

    product:
      raw.product ||
      ctx.product ||
      "",

    website:
      raw.website ||
      raw.link ||
      raw.url ||
      "",

    email:
      raw.email ||
      "",

    phone:
      raw.phone ||
      "",

    supplierType:
      raw.supplierType ||
      raw.type ||
      "Exporter",

    source:
      raw.source ||
      "Supplier Source Connector",

    sourceUrl:
      raw.sourceUrl ||
      raw.website ||
      raw.link ||
      "",

    discoveredAt: new Date().toISOString()
  };

  const confidenceScore = scoreSupplier(supplier, ctx);
  const riskScore = riskSupplier(supplier, ctx);

  return {
    ...supplier,
    confidenceScore,
    riskScore,
    verificationStatus: getVerificationStatus(confidenceScore, riskScore),
    outreachAllowed: false,
    humanApprovalRequired: true
  };
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
    supplierType: "Potential Supplier",
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
    .map((supplier) => normalizeSupplier(supplier, ctx))
    .sort((a, b) => {
      if (b.confidenceScore !== a.confidenceScore) {
        return b.confidenceScore - a.confidenceScore;
      }

      return a.riskScore - b.riskScore;
    });

  return {
    sourceMode: process.env.SERP_API_KEY ? "provider" : "mock",
    product: ctx.product,
    market: ctx.market,
    total: suppliers.length,
    suppliers,
    networkReadySuppliers: suppliers.filter(
      (supplier) =>
        Number(supplier.confidenceScore || 0) >= 70 &&
        Number(supplier.riskScore || 0) <= 40
    ),
    humanApprovalRequired: true,
    note: "Discovery only. Outreach is disabled until user approval."
  };
}

module.exports = {
  discoverSuppliers,
  normalizeSupplier,
  scoreSupplier,
  riskSupplier
};