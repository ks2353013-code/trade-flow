"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const { configuredToken, constantTimeTokenEqual, createControl } = require("../services/stagingAcceptanceControl");

function createRouter(control = createControl()) {
  const router = express.Router();
  router.use((req, res, next) => Number(req.headers["content-length"] || 0) > 2048
    ? res.status(413).json({ success: false, message: "Request unavailable" })
    : next());
  router.use(express.json({ limit: "2kb", strict: true }));
  router.use(rateLimit({ windowMs: 60_000, max: 12, standardHeaders: true, legacyHeaders: false, message: { success: false, message: "Request unavailable" } }));
  router.use((req, res, next) => {
    res.set({ "Cache-Control": "no-store, no-cache, must-revalidate, private", Pragma: "no-cache", Expires: "0", "Referrer-Policy": "no-referrer" });
    if (req.headers.origin) return res.status(403).json({ success: false, message: "Request unavailable" });
    const match = /^Bearer ([^\s]+)$/.exec(String(req.headers.authorization || ""));
    if (!match || !constantTimeTokenEqual(match[1], configuredToken())) return res.status(401).json({ success: false, message: "Unauthorized" });
    return next();
  });
  router.post("/runs", async (_req, res) => {
    try { const run = await control.start(); return run ? res.status(202).json(run) : res.status(409).json({ success: false, message: "An acceptance run is already active" }); }
    catch { return res.status(500).json({ success: false, message: "Acceptance request failed" }); }
  });
  router.get("/runs/:runId", async (req, res) => {
    try { const run = await control.find(req.params.runId); return run ? res.json(run) : res.status(404).json({ success: false, message: "Run not found" }); }
    catch { return res.status(500).json({ success: false, message: "Acceptance request failed" }); }
  });
  router.get("/runs/:runId/artifact", async (req, res) => {
    try { const run = await control.find(req.params.runId, true); if (!run) return res.status(404).json({ success: false, message: "Run not found" }); if (!["Passed", "Failed", "CleanupFailed"].includes(run.status)) return res.status(409).json({ success: false, message: "Run is incomplete" }); return res.json(run.artifact); }
    catch { return res.status(500).json({ success: false, message: "Acceptance request failed" }); }
  });
  router.post("/runs/:runId/verify-cleanup", async (req, res) => {
    try { const result = await control.verifyCleanup(req.params.runId); if (result.missing) return res.status(404).json({ success: false, message: "Run not found" }); if (result.incomplete) return res.status(409).json({ success: false, message: "Run is incomplete" }); return res.json(result); }
    catch { return res.status(500).json({ status: "FAIL", failureReason: "Independent cleanup verification failed" }); }
  });
  router.delete("/runs/:runId", async (req, res) => {
    try { return (await control.remove(req.params.runId)) ? res.json({ success: true, deleted: true }) : res.status(404).json({ success: false, message: "Run not found" }); }
    catch { return res.status(500).json({ success: false, message: "Acceptance request failed" }); }
  });
  return router;
}

module.exports = { createRouter };
