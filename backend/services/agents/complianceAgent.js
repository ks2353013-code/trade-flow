/* TradeFlow Compliance Agent V1
   Compliance guidance only. Not legal advice. No filings or submissions.
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

function productSpecificDocuments(product = "") {
  const p = product.toLowerCase();

  if (p.includes("rice") || p.includes("food") || p.includes("jaggery")) {
    return [
      "FSSAI / food safety documentation where applicable",
      "Phytosanitary Certificate where required",
      "Quality certificate",
      "Batch/lot details",
      "Packaging and labeling compliance"
    ];
  }

  if (p.includes("medicine") || p.includes("pharma")) {
    return [
      "Drug license / pharma export permission where applicable",
      "Certificate of Analysis",
      "Product registration documents",
      "Batch certificate",
      "MSDS where applicable",
      "Temperature/shipping compliance documents"
    ];
  }

  return [
    "Product specification sheet",
    "Quality certificate where applicable",
    "Packaging details",
    "HS code confirmation"
  ];
}

function run(input = {}) {
  const ctx = normalizeInput(input);

  return {
    agent: "Compliance Agent",
    status: "Completed",

    requiredDocuments: [
      "Commercial Invoice",
      "Packing List",
      "Certificate of Origin",
      "Shipping Bill",
      "Bill of Lading / Airway Bill",
      "Insurance Certificate",
      "Purchase Order / Sales Contract",
      ...productSpecificDocuments(ctx.product)
    ],

    certificates: [
      "Certificate of Origin",
      "Product quality certificate",
      "Inspection certificate where required",
      "Product-specific regulatory certificate if applicable"
    ],

    complianceRisks: [
      "Wrong HS code classification",
      "Missing product certificate",
      "Mismatch between invoice and packing list",
      "Buyer country import restriction",
      "Incorrect labeling or packaging",
      "Payment terms not aligned with risk level"
    ],

    shipmentConsiderations: [
      "Confirm Incoterms",
      "Confirm port of loading and destination",
      "Check freight cost and transit time",
      "Confirm packaging suitability",
      "Confirm insurance coverage",
      "Keep shipment documents consistent"
    ],

    paymentConsiderations: [
      "Prefer secure payment terms for new buyers",
      "Use LC or advance/partial advance when risk is high",
      "Avoid unsecured credit for unverified buyers",
      "Check bank details carefully before transfer"
    ],

    approvalWarnings: [
      "Human review required before submitting documents",
      "Human approval required before sharing price quotation",
      "Human approval required before contract signing",
      "Human approval required before payment commitment"
    ],

    recommendedNextActions: [
      "Confirm HS code",
      "Prepare document checklist",
      "Verify buyer/supplier compliance needs",
      "Ask buyer for destination-country import requirements",
      "Review payment terms before negotiation"
    ]
  };
}

module.exports = {
  run
};