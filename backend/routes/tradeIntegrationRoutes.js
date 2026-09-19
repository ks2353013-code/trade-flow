const express = require("express");
const router = express.Router();
const service = require("../services/tradeIntegrationService");

router.get("/", async (req, res) => {
  try { res.json({ success: true, integrations: await service.listConnections(req) }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post("/connections", async (req, res) => {
  try { res.json({ success: true, connection: await service.upsertConnection(req, req.body || {}) }); }
  catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

router.post("/compliance/snapshot", async (req, res) => {
  try { res.status(201).json({ success: true, snapshot: await service.createComplianceSnapshot(req, req.body || {}) }); }
  catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

router.get("/catalog", (req, res) => res.json({ success: true, providers: service.catalog() }));

router.post("/connections/:providerKey/test", async (req, res) => {
  try { res.json({ success: true, result: await service.testConnection(req, req.params.providerKey) }); }
  catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

router.post("/connections/:providerKey/execute", async (req, res) => {
  try { res.json({ success: true, result: await service.executeProvider(req, req.params.providerKey, req.body || {}) }); }
  catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

module.exports = router;
