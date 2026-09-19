const crypto = require("crypto");
const https = require("https");
const http = require("http");
const TradeIntegrationConnection = require("../models/TradeIntegrationConnection");

const PROVIDERS = {
  dgft: { category: "government", mode: "api", capabilities: ["ebrc_status", "ebrc_generate", "irm_fetch", "orm_fetch", "official_api", "official_portal"], officialUrl: "https://www.dgft.gov.in/" },
  icegate: { category: "government", mode: "api", capabilities: ["shipping_bill", "bill_of_entry", "customs_status", "open_api_filing", "official_portal"], officialUrl: "https://www.icegate.gov.in/" },
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
  return Object.entries(PROVIDERS).map(([providerKey, value]) => ({ providerKey, ...value, configured: false }));
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

function getProvider(providerKey) {
  const provider = PROVIDERS[providerKey];
  if (!provider) throw new Error("Unsupported integration provider.");
  return provider;
}

async function upsertConnection(req, input = {}) {
  const c = ctx(req);
  if (!c.ownerEmail || !c.workspaceId) throw new Error("Authenticated workspace is required.");
  const provider = getProvider(input.providerKey);
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
  if (direction === "Import") requirements.push({ key: "import_pga", title: "Participating Government Agency / product controls", owner: "government", status: "to_verify", officialSource: "https://www.icegate.gov.in/", reason: "Import controls vary by commodity and may involve partner government agencies." });
  return { direction, product, hsCode, origin, destination, requirements };
}

async function createComplianceSnapshot(req, input = {}) {
  const c = ctx(req);
  if (!c.ownerEmail || !c.workspaceId) throw new Error("Authenticated workspace is required.");
  if (!input.missionId) throw new Error("missionId is required.");
  const plan = buildComplianceRequirements(input);
  const TradeComplianceSnapshot = require("../models/TradeComplianceSnapshot");
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
  const provided = String(signature).replace(/^sha256=/i, "").trim();
  if (!/^[a-f0-9]{64}$/i.test(provided)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
}

function resolveSecret(connection) {
  const envKey = String(connection.metadata?.credentialEnvKey || "").trim();
  if (!envKey || !/^[A-Z0-9_]+$/.test(envKey)) return "";
  return process.env[envKey] || "";
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) return reject(new Error("Unsupported integration protocol."));
    const transport = parsed.protocol === "https:" ? https : http;
    const req = transport.request(parsed, {
      method: options.method || "GET",
      headers: { Accept: "application/json", ...(options.headers || {}) },
      timeout: Number(options.timeoutMs || 12000)
    }, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", chunk => { body += chunk; if (body.length > 2_000_000) req.destroy(new Error("Integration response too large.")); });
      res.on("end", () => {
        let data = body;
        try { data = JSON.parse(body); } catch {}
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const error = new Error("Provider returned HTTP " + res.statusCode);
          error.statusCode = res.statusCode; error.providerBody = data;
          return reject(error);
        }
        resolve({ statusCode: res.statusCode, data });
      });
    });
    req.on("timeout", () => req.destroy(new Error("Provider request timed out.")));
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function testConnection(req, providerKey) {
  const c = ctx(req);
  const provider = getProvider(providerKey);
  const connection = await TradeIntegrationConnection.findOne({ ...c, providerKey });
  if (!connection) throw new Error("Integration is not configured.");
  if (provider.mode !== "api") {
    return { providerKey, mode: provider.mode, status: "ready", message: "This provider is executed through its official portal or webhook contract; no unsupported API call was attempted." };
  }
  if (!connection.endpoint) throw new Error("API endpoint is required.");
  const secret = resolveSecret(connection);
  if (!secret) throw new Error("Credential environment reference is not configured on the server.");
  const headers = { Authorization: "Bearer " + secret };
  try {
    const result = await requestJson(connection.endpoint, { headers, timeoutMs: 10000 });
    await TradeIntegrationConnection.updateOne({ _id: connection._id }, { $set: { status: "active", lastCheckedAt: new Date(), lastError: "" } });
    return { providerKey, mode: provider.mode, status: "active", httpStatus: result.statusCode };
  } catch (error) {
    await TradeIntegrationConnection.updateOne({ _id: connection._id }, { $set: { status: "error", lastCheckedAt: new Date(), lastError: error.message } });
    throw error;
  }
}

async function executeProvider(req, providerKey, input = {}) {
  const c = ctx(req);
  const provider = getProvider(providerKey);
  const connection = await TradeIntegrationConnection.findOne({ ...c, providerKey });
  if (!connection) throw new Error("Integration is not configured.");
  if (provider.mode !== "api") {
    return { providerKey, mode: provider.mode, execution: "manual_or_webhook", message: "TradeFlow prepared the operation but will not impersonate a user or claim an official submission." };
  }
  if (!connection.endpoint) throw new Error("API endpoint is required.");
  const secret = resolveSecret(connection);
  if (!secret) throw new Error("Credential environment reference is not configured on the server.");
  const body = JSON.stringify(input || {});
  const result = await requestJson(connection.endpoint, {
    method: input.method || "POST",
    headers: { Authorization: "Bearer " + secret, "Content-Type": "application/json" },
    body: input.method === "GET" ? undefined : body
  });
  await TradeIntegrationConnection.updateOne({ _id: connection._id }, { $set: { status: "active", lastCheckedAt: new Date(), lastError: "" } });
  return { providerKey, mode: provider.mode, execution: "api", httpStatus: result.statusCode, data: result.data };
}

async function recordWebhookPublic(providerKey, workspaceId, rawBody, signature, payload) {
  if (!workspaceId) throw new Error("workspaceId is required.");
  const connection = await TradeIntegrationConnection.findOne({ workspaceId, providerKey, mode: "webhook" }).lean();
  if (!connection) throw new Error("Webhook integration is not configured for this workspace.");
  const secret = resolveSecret(connection);
  if (!verifyWebhookSignature(rawBody, signature, secret)) throw new Error("Invalid webhook signature.");
  await TradeIntegrationConnection.updateOne({ _id: connection._id }, {
    $set: { status: "active", lastCheckedAt: new Date(), lastError: "", "metadata.lastWebhookAt": new Date(), "metadata.lastWebhookType": String(payload?.type || "event") }
  });
  return { accepted: true, providerKey, receivedAt: new Date().toISOString(), type: payload?.type || "event" };
}

async function recordWebhook(req, providerKey, rawBody, signature, payload) {
  const c = ctx(req);
  const connection = await TradeIntegrationConnection.findOne({ ...c, providerKey }).lean();
  if (!connection) throw new Error("Webhook integration is not configured for this workspace.");
  const secret = resolveSecret(connection);
  if (!verifyWebhookSignature(rawBody, signature, secret)) throw new Error("Invalid webhook signature.");
  await TradeIntegrationConnection.updateOne({ _id: connection._id }, {
    $set: { status: "active", lastCheckedAt: new Date(), lastError: "", "metadata.lastWebhookAt": new Date(), "metadata.lastWebhookType": String(payload?.type || "event") }
  });
  return { accepted: true, providerKey, receivedAt: new Date().toISOString(), type: payload?.type || "event" };
}

module.exports = { PROVIDERS, ctx, catalog, listConnections, upsertConnection, buildComplianceRequirements, createComplianceSnapshot, verifyWebhookSignature, testConnection, executeProvider, recordWebhook, recordWebhookPublic };