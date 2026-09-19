const express = require("express");
const router = express.Router();
const service = require("../services/tradeIntegrationService");
const credentialService = require("../services/tradeIntegrationCredentialService");
const dgft = require("../services/dgftEbrcAdapter");
const icegate = require("../services/icegateApiAdapter");
const reconciliation = require("../services/tradeExecutionReconciliationService");

router.get("/", async (req, res) => {
  try { res.json({ success: true, integrations: await service.listConnections(req) }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post("/connections", async (req, res) => {
  try { res.json({ success: true, connection: await service.upsertConnection(req, req.body || {}) }); }
  catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

router.post("/connections/:providerKey/credentials", async (req, res) => {
  try {
    const result = await credentialService.save(req, req.params.providerKey, req.body?.credentials, req.body?.expiresAt || null);
    res.status(201).json({ success: true, credential: result });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

router.post("/compliance/snapshot", async (req, res) => {
  try { res.status(201).json({ success: true, snapshot: await service.createComplianceSnapshot(req, req.body || {}) }); }
  catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

router.get("/catalog", (req, res) => res.json({ success: true, providers: service.catalog() }));

router.post("/connections/:providerKey/test", async (req, res) => {
  try {
    if (req.params.providerKey === "icegate" && req.body?.live === true) {
      const credentials = await credentialService.load(req, "icegate");
      const connection = await service.listConnections(req);
      const configured = connection.find(x => x.providerKey === "icegate")?.connection;
      return res.json({ success: true, result: await icegate.test(credentials, configured?.endpoint || "") });
    }
    if (req.params.providerKey === "dgft" && req.body?.live === true) {
      const credentials = await credentialService.load(req, "dgft");
      return res.json({ success: true, result: await dgft.test(credentials) });
    }
    res.json({ success: true, result: await service.testConnection(req, req.params.providerKey) });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

router.post("/connections/:providerKey/execute", async (req, res) => {
  try {
    if (req.params.providerKey === "icegate" && req.body?.operation === "submit_json") { const credentials=await credentialService.load(req,"icegate"); const connection=(await service.listConnections(req)).find(x=>x.providerKey==="icegate")?.connection; const result=await icegate.submitJsonFile(credentials,connection?.endpoint||"",req.body?.file,req.body?.submitEndpoint); return res.json({success:true,result}); }
    if (req.params.providerKey === "dgft") {
      const credentials = await credentialService.load(req, "dgft");
      const operation = String(req.body?.operation || "");
      if (operation === "fetch_irm") return res.json({ success: true, result: await dgft.fetchIRM(req.body, credentials) });
      if (operation === "fetch_orm") return res.json({ success: true, result: await dgft.fetchORM(req.body, credentials) });
      if (operation === "generate_ebrc") return res.json({ success: true, result: await dgft.generateEBRC(req.body, credentials) });
      throw new Error("Unsupported DGFT operation. Use fetch_irm, fetch_orm or generate_ebrc.");
    }
    res.json({ success: true, result: await service.executeProvider(req, req.params.providerKey, req.body || {}) });
  } catch (e) { res.status(400).json({ success: false, message: e.message }); }
});

module.exports = router;

router.post("/events/:providerKey/reconcile", async (req,res)=>{try{res.json({success:true,result:await reconciliation.reconcile(req,req.params.providerKey,req.body||"",JSON.stringify(req.body||{}))})}catch(e){res.status(400).json({success:false,message:e.message})}});
