/* TradeFlow Supplier Discovery Agent V1
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

function run(input = {}) {
  const ctx = normalizeInput(input);

  const estimatedSupplierFitScore =
    ctx.product !== "General Product"
      ? 84
      : 60;

  return {
    agent: "Supplier Discovery Agent",
    status: "Completed",

    supplierProfile: `Ideal suppliers for ${ctx.product} should be verified manufacturers, exporters, wholesalers, or trading companies with clear product capability, contact details, and reliable fulfillment history.`,

    supplierTypes: [
      "Manufacturers",
      "Exporters",
      "Wholesale suppliers",
      "Trading companies",
      "Authorized distributors"
    ],

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