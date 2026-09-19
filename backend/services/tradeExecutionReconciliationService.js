const crypto=require("crypto");
const TradeExecution=require("../models/TradeExecution");
const TradeIntegrationEvent=require("../models/TradeIntegrationEvent");

const STAGES=TradeExecution.STAGES;
const STAGE_ORDER=new Map(STAGES.map((s,i)=>[s,i]));

function context(req){
  return {
    ownerEmail:String(req.tenant?.ownerEmail||req.user?.email||"").toLowerCase().trim(),
    companyId:req.tenant?.companyId||null,
    workspaceId:req.tenant?.workspaceId||req.headers["x-workspace-id"]||null
  };
}

function normalizeEvent(providerKey,payload){
  const p=payload||{};
  const eventType=String(p.eventType||p.type||p.event||p.status||"external.event");
  const eventId=String(p.eventId||p.id||p.referenceId||p.reference||crypto.createHash("sha256").update(JSON.stringify(p)).digest("hex"));
  const externalReference=String(p.externalReference||p.referenceNumber||p.acknowledgement||p.ackNo||p.acknowledgmentNumber||"");
  let stage=null;
  const text=(eventType+" "+JSON.stringify(p)).toLowerCase();
  if(providerKey==="payment_webhook"||/payment|settlement|credited|paid/.test(text)) stage="payment";
  else if(/realisation|ebrc|irm|export realization/.test(text)) stage="realisation";
  else if(providerKey==="logistics_webhook"||/shipment|dispatched|in_transit|delivered|cargo|container/.test(text)) stage="shipment";
  else if(/customs|shipping bill|bill of entry|icegate|clearance/.test(text)) stage="government";
  else if(/invoice/.test(text)) stage="invoice";
  return {eventId,eventType,externalReference,stage};
}

async function reconcile(req,providerKey,payload,rawBody=""){
  const c=context(req);
  if(!c.ownerEmail||!c.workspaceId) throw new Error("Authenticated workspace is required.");
  const n=normalizeEvent(providerKey,payload);
  const payloadHash=crypto.createHash("sha256").update(rawBody||JSON.stringify(payload||{})).digest("hex");
  let event;
  try{
    event=await TradeIntegrationEvent.create({...c,providerKey,eventId:n.eventId,eventType:n.eventType,externalReference:n.externalReference,payloadHash,payload,status:"received"});
  }catch(e){
    if(e?.code===11000) return {accepted:true,duplicate:true,eventId:n.eventId};
    throw e;
  }
  let execution=null;
  const explicitExecutionId=payload?.executionId||payload?.tradeExecutionId;
  if(explicitExecutionId){
    execution=await TradeExecution.findOne({...c,_id:explicitExecutionId});
  }
  if(!execution && n.externalReference){
    execution=await TradeExecution.findOne({...c,$or:[
      {"metadata.externalReference":n.externalReference},
      {"metadata.providerReference":n.externalReference}
    ]});
  }
  if(!execution && n.stage){
    execution=await TradeExecution.findOne({...c,status:{$in:["active","blocked"]}}).sort({updatedAt:-1});
  }
  if(!execution){
    event.status="failed";event.error="No matching TradeExecution was found.";await event.save();
    return {accepted:true,processed:false,eventId:n.eventId,reason:event.error};
  }
  const patch={
    $set:{"metadata.lastExternalEventAt":new Date(),"metadata.lastProviderEventType":n.eventType},
    $push:{events:{event:"external_event_reconciled",detail:providerKey+" / "+n.eventType+(n.externalReference?" / "+n.externalReference:""),actorEmail:"system",at:new Date()}}
  };
  if(n.externalReference){
    patch.$set["metadata.externalReference"]=n.externalReference;
    patch.$set["metadata.providerReference"]=n.externalReference;
  }
  if(n.stage && STAGE_ORDER.get(n.stage)>STAGE_ORDER.get(execution.stage)){
    patch.$set.stage=n.stage;
    patch.$set.status="active";
  }
  await TradeExecution.updateOne({_id:execution._id,...c},patch);
  event.executionId=execution._id;event.status="processed";event.processedAt=new Date();await event.save();
  return {accepted:true,processed:true,eventId:n.eventId,executionId:String(execution._id),stage:n.stage,externalReference:n.externalReference};
}

async function reconcilePublic(connection,providerKey,payload,rawBody=""){ return reconcile({ownerEmail:connection.ownerEmail,companyId:connection.companyId,workspaceId:connection.workspaceId},providerKey,payload,rawBody); }\nmodule.exports={reconcile,reconcilePublic,normalizeEvent};
