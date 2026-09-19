/* TradeFlow Supplier Discovery Agent V3 */
const { discoverSuppliers } = require("../connectors/supplierSourceConnector");
const { verifyLeads } = require("../leadVerificationEngine");

function normalizeInput(input = {}) {
  return { direction: input.direction || "Import", product: input.product || "General Product", market: input.market || "Global Market", ownerEmail: input.ownerEmail || "", workspaceId: input.workspaceId || null, companyId: input.companyId || null };
}
function isNetworkReadyVerifiedSupplier(supplier = {}) {
  return Number(supplier.verificationScore || 0) >= 70 && Number(supplier.riskScore || 0) <= 40;
}
function buildLeaderboard(suppliers = []) {
  return [...suppliers].sort((a,b) => Number(b.verificationScore || b.confidenceScore || 0) - Number(a.verificationScore || a.confidenceScore || 0) || Number(a.riskScore || 0) - Number(b.riskScore || 0)).map((supplier,index) => ({ rank:index+1, companyName:supplier.companyName, country:supplier.country, supplierType:supplier.supplierType, website:supplier.website, sourceUrl:supplier.sourceUrl || supplier.website, confidenceScore:supplier.confidenceScore, riskScore:supplier.riskScore, verificationScore:supplier.verificationScore, verificationStatus:supplier.verificationStatus }));
}
async function getDiscoveredSuppliers(ctx) {
  try { const result = await discoverSuppliers(ctx); return Array.isArray(result?.suppliers) ? result.suppliers : []; }
  catch (error) { console.warn("Supplier source connector failed:", error.message); return []; }
}
async function run(input = {}) {
  const ctx = normalizeInput(input);
  const discoveredSuppliers = await getDiscoveredSuppliers(ctx);
  const verification = verifyLeads(discoveredSuppliers, ctx);
  const verifiedSupplierLeads = Array.isArray(verification.verifiedLeads) ? verification.verifiedLeads : [];
  const rejectedSupplierLeads = Array.isArray(verification.rejectedLeads) ? verification.rejectedLeads : [];
  const networkReadyVerifiedSuppliers = verifiedSupplierLeads.filter(isNetworkReadyVerifiedSupplier);
  const estimatedSupplierFitScore = discoveredSuppliers.length ? Math.round(discoveredSuppliers.reduce((sum,s) => sum + Number(s.confidenceScore || s.supplierQualityScore || 0),0) / discoveredSuppliers.length) : null;
  return {
    agent:"Supplier Discovery Agent", version:"V3", status:discoveredSuppliers.length ? "Completed" : "Source Unavailable", sourceMode:discoveredSuppliers.length ? "provider" : "unavailable",
    supplierProfile:"Potential suppliers for " + ctx.product + " are evaluated for product fit, business identity, contactability, country, and verification signals in " + ctx.market + ".",
    estimatedSupplierFitScore, discoveredSuppliers, supplierLeaderboard:buildLeaderboard(verifiedSupplierLeads), networkReadySuppliers:networkReadyVerifiedSuppliers, verifiedSupplierLeads, networkReadyVerifiedSuppliers, rejectedSupplierLeads,
    supplierVerificationSummary:{ totalDiscovered:discoveredSuppliers.length, verifiedSupplierLeads:verifiedSupplierLeads.length, networkReadyVerifiedSuppliers:networkReadyVerifiedSuppliers.length, rejectedSupplierLeads:rejectedSupplierLeads.length, humanApprovalRequired:true, outreachAllowed:false },
    humanApprovalRequired:true, outreachAllowed:false,
    recommendedNextActions:discoveredSuppliers.length ? ["Review live supplier candidates and source evidence","Verify company identity and contact details","Request catalogue, quotation, MOQ and certificates","Approve supplier shortlist before contact"] : ["Connect a live supplier/search provider","Re-run supplier discovery","Do not treat unavailable results as real suppliers"]
  };
}
module.exports={getDiscoveredSuppliers,run};