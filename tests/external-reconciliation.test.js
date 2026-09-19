const test=require("node:test"); const assert=require("node:assert/strict"); const {normalizeEvent}=require("../backend/services/tradeExecutionReconciliationService");
test("payment events map to payment stage",()=>{const e=normalizeEvent("payment_webhook",{eventId:"p1",type:"payment.settled",referenceNumber:"PAY-1"});assert.equal(e.eventId,"p1");assert.equal(e.stage,"payment");assert.equal(e.externalReference,"PAY-1")});
test("logistics events map to shipment stage",()=>{assert.equal(normalizeEvent("logistics_webhook",{id:"s1",status:"delivered"}).stage,"shipment")});
test("government acknowledgement maps to government stage",()=>{assert.equal(normalizeEvent("icegate",{id:"a1",type:"customs.clearance",ackNo:"ACK1"}).stage,"government")});
