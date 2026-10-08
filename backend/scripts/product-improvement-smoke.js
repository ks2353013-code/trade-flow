const assert = require("assert");
const fs = require("fs");

assert(fs.existsSync("backend/models/TradeOpportunity.js"));
assert(fs.existsSync("backend/routes/tradeOpportunityRoutes.js"));
assert(fs.existsSync("frontend/js/tradeflow-opportunity-layer-v1.js"));

const model = fs.readFileSync("backend/models/TradeOpportunity.js","utf8");
const route = fs.readFileSync("backend/routes/tradeOpportunityRoutes.js","utf8");
const ui = fs.readFileSync("frontend/js/tradeflow-opportunity-layer-v1.js","utf8");
const server = fs.readFileSync("backend/server.js","utf8");

for (const required of [
  "workspaceId",
  "verificationScore",
  "confidenceScore",
  "freshness",
  "nextBestAction",
  "evidence"
]) assert(model.includes(required), "model missing " + required);

assert(route.includes("find(s)"), "route must query scoped opportunities");
assert(route.includes("findOneAndUpdate"), "route must update scoped opportunities");
assert(server.includes('/api/opportunities'), "server route not mounted");
assert(ui.includes("/api/opportunities"), "UI does not consume opportunity API");
assert(ui.includes("Next best action"), "UI does not expose next-best-action");
console.log("TradeFlow product improvement smoke: PASS");
