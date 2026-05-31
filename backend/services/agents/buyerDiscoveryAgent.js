/* TradeFlow Buyer Discovery Agent V2
   Analysis and strategy only. No external outreach.
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

function getBuyerTypes(ctx) {
  if (ctx.direction === "Import") {
    return [
      "Domestic distributors",
      "Wholesale buyers",
      "Retail chains",
      "Industrial users",
      "Trading companies"
    ];
  }

  return [
    "Importers",
    "Distributors",
    "Wholesale buyers",
    "Buying houses",
    "Retail chains",
    "Trading companies"
  ];
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "trade-buyer";
}

function marketCountry(market = "") {
  const normalized = String(market).trim();

  if (!normalized || normalized === "Global Market") {
    return "Global";
  }

  return normalized;
}

function marketDialingCode(market = "") {
  const normalized = String(market).toLowerCase();

  if (normalized.includes("uae") || normalized.includes("dubai")) {
    return "+971";
  }

  if (normalized.includes("usa") || normalized.includes("america")) {
    return "+1";
  }

  if (normalized.includes("europe")) {
    return "+44";
  }

  if (normalized.includes("africa")) {
    return "+27";
  }

  return "+00";
}

function getPrimaryBuyerTypes(targetBuyerTypes = []) {
  return targetBuyerTypes.slice(0, 3);
}

function scoreBuyerConfidence(buyer, ctx, targetBuyerTypes) {
  let score = 30;

  if (ctx.product !== "General Product") score += 10;
  if (ctx.market !== "Global Market") score += 10;
  if (buyer.country === marketCountry(ctx.market)) score += 8;
  if (buyer.website) score += 7;
  if (buyer.email) score += 8;
  if (buyer.phone) score += 5;

  const priorityIndex = targetBuyerTypes.indexOf(buyer.buyerType);

  if (priorityIndex === 0) score += 10;
  else if (priorityIndex === 1) score += 8;
  else if (priorityIndex === 2) score += 6;
  else if (priorityIndex >= 0) score += 4;

  if (getPrimaryBuyerTypes(targetBuyerTypes).includes(buyer.buyerType)) {
    score += 5;
  }

  return Math.min(score, 95);
}

function getVerificationStatus(confidenceScore) {
  if (confidenceScore >= 85) return "Verified";
  if (confidenceScore >= 70) return "Needs Review";
  return "Unverified";
}

function createBuyer({
  companyName,
  country,
  website,
  email,
  phone,
  buyerType
}, ctx, targetBuyerTypes) {
  const buyer = {
    companyName,
    country,
    website,
    email,
    phone,
    buyerType
  };

  const confidenceScore = scoreBuyerConfidence(
    buyer,
    ctx,
    targetBuyerTypes
  );

  return {
    ...buyer,
    confidenceScore,
    verificationStatus: getVerificationStatus(confidenceScore)
  };
}

function generateSampleBuyers(ctx, targetBuyerTypes) {
  const country = marketCountry(ctx.market);
  const productSlug = slugify(ctx.product);
  const marketSlug = slugify(ctx.market);
  const dialCode = marketDialingCode(ctx.market);

  const [
    primaryType,
    secondaryType,
    tertiaryType,
    fourthType,
    fifthType
  ] = targetBuyerTypes;

  const templates = [
    {
      companyName: `${country} ${ctx.product} Import Network`,
      buyerType: primaryType,
      hasEmail: true,
      hasPhone: true
    },
    {
      companyName: `${country} Food Distribution Group`,
      buyerType: secondaryType || primaryType,
      hasEmail: true,
      hasPhone: true
    },
    {
      companyName: `${country} Wholesale Trade House`,
      buyerType: tertiaryType || secondaryType || primaryType,
      hasEmail: true,
      hasPhone: false
    },
    {
      companyName: `${country} Retail Sourcing Co`,
      buyerType: fourthType || tertiaryType || primaryType,
      hasEmail: true,
      hasPhone: true
    },
    {
      companyName: `${country} Global Agro Buyers`,
      buyerType: fifthType || secondaryType || primaryType,
      hasEmail: false,
      hasPhone: true
    }
  ];

  return templates.map((template, index) => {
    const companySlug = slugify(template.companyName);
    const website = `https://${companySlug}.example`;
    const email = template.hasEmail
      ? `sourcing.${productSlug}@${companySlug}.example`
      : "";
    const phone = template.hasPhone
      ? `${dialCode}-50-000-01${index + 1}${marketSlug.length % 10}`
      : "";

    return createBuyer(
      {
        companyName: template.companyName,
        country,
        website,
        email,
        phone,
        buyerType: template.buyerType
      },
      ctx,
      targetBuyerTypes
    );
  });
}

function run(input = {}) {
  const ctx = normalizeInput(input);

  const targetBuyerTypes = getBuyerTypes(ctx);
  const discoveredBuyers = generateSampleBuyers(ctx, targetBuyerTypes);
  const buyerLeaderboard = [...discoveredBuyers].sort(
    (a, b) => b.confidenceScore - a.confidenceScore
  );
  const crmReadyBuyers = buyerLeaderboard.filter(
    (buyer) => buyer.confidenceScore >= 70
  );

  const estimatedBuyerFitScore =
    ctx.product !== "General Product" && ctx.market !== "Global Market"
      ? 86
      : 62;

  return {
    agent: "Buyer Discovery Agent",
    status: "Completed",
    buyerProfile: `Ideal buyers for ${ctx.product} in ${ctx.market} are companies already importing, distributing, wholesaling, or sourcing similar products.`,
    targetBuyerTypes,
    buyerSearchStrategy: [
      `Search importers and distributors of ${ctx.product} in ${ctx.market}`,
      "Prioritize companies with active websites and trade contact details",
      "Check product category match before outreach",
      "Prefer buyers with repeat purchasing behavior",
      "Rank buyers by contact availability and product fit"
    ],
    qualificationCriteria: [
      "Company website available",
      "Business category matches product",
      "Country/market match confirmed",
      "Email or phone available",
      "Import/distribution activity visible",
      "MOQ or buying requirement can be identified"
    ],
    outreachPriority:
      estimatedBuyerFitScore >= 80
        ? "High priority buyer discovery recommended"
        : "Moderate priority. Improve product and market details first.",
    estimatedBuyerFitScore,
    discoveredBuyers,
    buyerLeaderboard,
    crmReadyBuyers,
    recommendedNextActions: [
      "Generate buyer lead list",
      "Verify buyer contact details",
      "Score buyer fit",
      "Prepare outreach message",
      "Push qualified buyers into CRM"
    ]
  };
}

module.exports = {
  run
};
