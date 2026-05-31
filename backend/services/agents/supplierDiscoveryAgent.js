/* TradeFlow Supplier Discovery Agent V2
   Supplier strategy and verification only. No external outreach.
*/

function normalizeInput(input = {}) {
  return {
    direction: input.direction || "Export",
    product: input.product || "General Product",
    market: input.market || "Global Market",
    ownerEmail: input.ownerEmail || "",
    workspaceId: input.workspaceId || null,
    companyId: input.companyId || null
  };
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "trade-supplier";
}

function getSourceCountry(ctx) {
  const product = String(ctx.product || "").toLowerCase();

  if (
    product.includes("basmati") ||
    product.includes("rice") ||
    product.includes("jaggery") ||
    product.includes("medicine") ||
    product.includes("pharma") ||
    product.includes("textile")
  ) {
    return "India";
  }

  if (ctx.market && ctx.market !== "Global Market") {
    return ctx.market;
  }

  return "Unknown";
}

function scoreSupplierConfidence(supplier) {
  let score = 0;

  if (supplier.companyName) score += 10;
  if (supplier.country && supplier.country !== "Unknown") score += 10;
  if (supplier.website) score += 20;
  if (supplier.email) score += 20;
  if (supplier.phone) score += 10;
  if (supplier.productMatch) score += 20;
  if (supplier.supplierType) score += 10;

  return Math.min(score, 100);
}

function scoreSupplierRisk(supplier) {
  let score = 0;

  if (!supplier.website) score += 25;
  if (!supplier.email) score += 25;
  if (!supplier.phone) score += 15;
  if (!supplier.country || supplier.country === "Unknown") score += 15;
  if (!supplier.productMatch) score += 20;

  return Math.min(score, 100);
}

function getVerificationStatus(confidenceScore, riskScore) {
  if (confidenceScore >= 85 && riskScore <= 20) return "Verified";
  if (confidenceScore >= 70 && riskScore <= 40) return "Needs Review";
  return "Unverified";
}

function createSupplier(sample) {
  const confidenceScore = scoreSupplierConfidence(sample);
  const riskScore = scoreSupplierRisk(sample);

  return {
    ...sample,
    confidenceScore,
    riskScore,
    verificationStatus: getVerificationStatus(confidenceScore, riskScore)
  };
}

function generateSampleSuppliers(ctx, supplierTypes) {
  const sourceCountry = getSourceCountry(ctx);
  const productSlug = slugify(ctx.product);

  const [
    primaryType,
    secondaryType,
    tertiaryType,
    fourthType,
    fifthType
  ] = supplierTypes;

  const templates = [
    {
      companyName: `${sourceCountry} ${ctx.product} Exporters Collective`,
      country: sourceCountry,
      supplierType: secondaryType,
      productMatch: true,
      hasWebsite: true,
      hasEmail: true,
      hasPhone: true
    },
    {
      companyName: `${sourceCountry} Premium ${ctx.product} Mills`,
      country: sourceCountry,
      supplierType: primaryType,
      productMatch: true,
      hasWebsite: true,
      hasEmail: true,
      hasPhone: true
    },
    {
      companyName: `${sourceCountry} Wholesale ${ctx.product} Hub`,
      country: sourceCountry,
      supplierType: tertiaryType,
      productMatch: true,
      hasWebsite: true,
      hasEmail: true,
      hasPhone: false
    },
    {
      companyName: `${sourceCountry} Trade Supply Partners`,
      country: sourceCountry,
      supplierType: fourthType,
      productMatch: true,
      hasWebsite: true,
      hasEmail: false,
      hasPhone: true
    },
    {
      companyName: "Regional Commodity Source Desk",
      country: "Unknown",
      supplierType: fifthType,
      productMatch: false,
      hasWebsite: false,
      hasEmail: true,
      hasPhone: false
    }
  ];

  return templates.map((template, index) => {
    const companySlug = slugify(template.companyName);

    return createSupplier({
      companyName: template.companyName,
      country: template.country,
      website: template.hasWebsite
        ? `https://${companySlug}.example`
        : "",
      email: template.hasEmail
        ? `sales.${productSlug}@${companySlug}.example`
        : "",
      phone: template.hasPhone
        ? `+91-80-000-02${index + 1}${productSlug.length % 10}`
        : "",
      supplierType: template.supplierType,
      productMatch: template.productMatch
    });
  });
}

function run(input = {}) {
  const ctx = normalizeInput(input);

  const estimatedSupplierFitScore =
    ctx.product !== "General Product"
      ? 84
      : 60;

  const supplierTypes = [
    "Manufacturers",
    "Exporters",
    "Wholesale suppliers",
    "Trading companies",
    "Authorized distributors"
  ];
  const discoveredSuppliers = generateSampleSuppliers(ctx, supplierTypes);
  const supplierLeaderboard = [...discoveredSuppliers].sort(
    (a, b) =>
      b.confidenceScore - a.confidenceScore ||
      a.riskScore - b.riskScore
  );
  const networkReadySuppliers = supplierLeaderboard.filter(
    (supplier) =>
      supplier.confidenceScore >= 70 &&
      supplier.riskScore <= 40
  );

  return {
    agent: "Supplier Discovery Agent",
    status: "Completed",

    supplierProfile: `Ideal suppliers for ${ctx.product} should be verified manufacturers, exporters, wholesalers, or trading companies with clear product capability, contact details, and reliable fulfillment history.`,

    supplierTypes,

    verificationChecklist: [
      "Company name verified",
      "Website available",
      "Email available",
      "Phone available",
      "Product category match",
      "Country/location identified",
      "Export capability visible",
      "Certifications or compliance documents available",
      "Past trade activity or buyer references checked"
    ],

    riskSignals: [
      "No website",
      "No verified email",
      "No company registration details",
      "Unclear product catalogue",
      "Very low pricing compared to market",
      "No export documentation support",
      "No business address",
      "Pressure for advance payment without verification"
    ],

    preferredSupplierCriteria: [
      `Clear supply capability for ${ctx.product}`,
      "Transparent quotation",
      "Export/import documentation support",
      "Stable communication",
      "Product samples available",
      "Certifications available where required",
      "Consistent delivery timeline",
      "Reasonable MOQ and payment terms"
    ],

    estimatedSupplierFitScore,
    discoveredSuppliers,
    supplierLeaderboard,
    networkReadySuppliers,

    recommendedNextActions: [
      "Build supplier shortlist",
      "Verify website and contact details",
      "Request catalogue and quotation",
      "Check compliance certificates",
      "Score suppliers by trust and risk",
      "Push qualified suppliers into Verified Supplier Network"
    ]
  };
}

module.exports = {
  run
};
