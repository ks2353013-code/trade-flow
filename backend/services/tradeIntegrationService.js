const crypto = require("crypto");
const TradeIntegrationConnection = require("../models/TradeIntegrationConnection");
const TradeComplianceSnapshot = require("../models/TradeComplianceSnapshot");

const PROVIDERS = {
  dgft: { category: "government", mode: "api", capabilities: ["ebrc_status", "official_api"], officialUrl: "https://www.dgft.gov.in/" },
  icegate: { category: "government", mode: "api", capabilities: ["shipping_bill", "bill_of_entry", "customs_status"], officialUrl: "https://www.icegate.gov.in/" },
  trade_connect: { category: "government", mode: "official_portal", capabilities: ["market_access", "buyer_discovery"], officialUrl: "https://www.trade.gov.in/" },
  apeda: { category: "government", mode: "official_portal", capabilities: ["agri_export_requirements"], officialUrl: "https://apeda.gov.in/" },
  logistics_webhook: { category: "logistics", mode: "webhook", capabilities: ["shipment_status", "milestones"] },
  payment_webhook: { category: "payment", mode: "webhook", capabilities: ["payment_status", "settlement_events"] },
  trade_data_provider: { category: "trade_data", mode: "api", capabilities: ["trade_flows", "market_data"] }
};

function ctx(req) {
  return {
    ownerEmail: String(req.tenant?.ownerEmail || req.user?.email || "").toLowerCase().trim(),
    companyId: req.tenant?.companyId || null,
    workspaceId: req.tenant?.workspaceId || req.headers["x-workspace-id"] || null
  };
}

function catalog() {
  return Object.entries(PROVIDERS).map(([providerKey, value]) => ({
    providerKey, ...value, configured: false
  }));
}

function redactConnection(doc) {
  const item = doc.toObject ? doc.toObject() : { ...doc };
  delete item.credentialRef;
  return item;
}

async function listConnections(req) {
  const c = ctx(req);
  const configured = await TradeIntegrationConnection.find(c).lean();
  const byKey = new Map(configured.map(x => [x.providerKey, x]));
  return catalog().map(item => ({
    ...item,
    configured: byKey.has(item.providerKey),
    connection: byKey.has(item.providerKey) ? redactConnection(byKey.get(item.providerKey)) : null
  }));
}

async function upsertConnection(req, input = {}) {
  const c = ctx(req);
  if (!c.ownerEmail || !c.workspaceId) throw new Error("Authenticated workspace is required.");
  const provider = PROVIDERS[input.providerKey];
  if (!provider) throw new Error("Unsupported integration provider.");
  const update = {
    ...c, providerKey: input.providerKey, category: provider.category, mode: provider.mode,
    status: input.status || "ready", endpoint: String(input.endpoint || "").trim(),
    credentialRef: String(input.credentialRef || "").trim(), capabilities: provider.capabilities,
    metadata: input.metadata || {}, lastCheckedAt: new Date(), lastError: ""
  };
  const doc = await TradeIntegrationConnection.findOneAndUpdate(
    { ownerEmail: c.ownerEmail, workspaceId: c.workspaceId, providerKey: input.providerKey },
    update, { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return redactConnection(doc);
}

function buildComplianceRequirements(input = {}) {
  const direction = input.direction === "Import" ? "Import" : "Export";
  const product = String(input.product || "General Product");
  const hsCode = String(input.hsCode || "");
  const destination = String(input.destination || input.market || "Global Market");
  const origin = String(input.origin || "India");
  const text = (product + " " + hsCode).toLowerCase();
  const requirements = [
    { key: "identity", title: "Importer/exporter identity and registration", owner: "customer", status: "to_verify", officialSource: "https://www.dgft.gov.in/", reason: "Confirm the business is eligible and registered for the transaction." },
    { key: "hs_classification", title: "HS classification", owner: "customer", status: hsCode ? "ready" : "blocked", officialSource: "https://www.icegate.gov.in/", reason: hsCode ? "HS code supplied; verify the applicable tariff and controls." : "HS code is required before precise compliance can be determined." },
    { key: "customs", title: "Customs filing and document requirements", owner: "government", status: "to_verify", officialSource: "https://www.icegate.gov.in/", reason: "Requirements depend on the exact commodity, route and filing." },
    { key: "destination", title: "Destination-country requirements for " + destination, owner: "government", status: "to_verify", officialSource: "https://www.trade.gov.in/", reason: "Destination rules must be verified against current official requirements." },
    { key: "commercial_docs", title: "Commercial invoice, packing and contract/PO", owner: "customer", status: "ready", officialSource: "", reason: "TradeFlow can prepare and track these documents." },
    { key: "banking", title: "Bank/payment and realisation readiness", owner: "bank", status: "to_verify", officialSource: "https://www.dgft.gov.in/", reason: "Payment and realisation requirements depend on the transaction and banking setup." }
  ];
  if (direction === "Export" && /rice|food|agri|spice|fruit|vegetable|jaggery/.test(text)) {
    requirements.push({ key: "agri_export", title: "Agricultural/food export authority requirements", owner: "government", status: "to_verify", officialSource: "https://apeda.gov.in/", reason: "Agricultural and food products may require product-specific registrations, certificates or controls." });
  }
  if (direction === "Import") {
    requirements.push({ key: "import_pga", title: "Participating Government Agency / product controls", owner: "government", status: "to_verify", officialSource: "https://www.icegate.gov.in/", reason: "Import controls vary by commodity and may involve partner government agencies." });
  }
  return { direction, product, hsCode, origin, destination, requirements };
}

async function createComplianceSnapshot(req, input = {}) {
  const c = ctx(req);
  if (!c.ownerEmail || !c.workspaceId) throw new Error("Authenticated workspace is required.");
  if (!input.missionId) throw new Error("missionId is required.");
  const plan = buildComplianceRequirements(input);
  const snapshot = await TradeComplianceSnapshot.findOneAndUpdate(
    { ...c, missionId: input.missionId },
    { ...c, missionId: input.missionId, ...plan, transactionType: input.transactionType || "commercial",
      status: plan.requirements.some(x => x.status === "blocked") ? "blocked" : "preliminary",
      sourceEvidence: input.sourceEvidence || [] },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return snapshot.toObject();
}

function verifyWebhookSignature(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody || "").digest("hex");
  try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature))); } catch { return false; }
}

module.exports = { PROVIDERS, ctx, catalog, listConnections, upsertConnection, buildComplianceRequirements, createComplianceSnapshot, verifyWebhookSignature };
