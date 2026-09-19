const test=require("node:test");
const assert=require("node:assert/strict");
const {STAGES}=require("../backend/services/tradeExecutionService");

test("trade execution contains a complete commercial-to-realisation chain",()=>{
  assert.deepEqual(STAGES,["qualification","negotiation","deal","documents","compliance","government","logistics","shipment","invoice","payment","realisation","closed"]);
});
test("execution stages are sequential",()=>{
  for(let i=1;i<STAGES.length;i++) assert.equal(STAGES.indexOf(STAGES[i]),i);
});
