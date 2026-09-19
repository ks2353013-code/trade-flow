const mongoose=require("mongoose");
const TradeExecution=require("../models/TradeExecution");
const TradeMission=require("../models/TradeMission");
const CRMLead=require("../models/CRMLead");

const STAGES=TradeExecution.STAGES;
const stageIndex=s=>STAGES.indexOf(s);

function ctx(req){
  return {
    ownerEmail:String(req.tenant?.ownerEmail||req.user?.email||"").toLowerCase().trim(),
    companyId:req.tenant?.companyId||null,
    workspaceId:req.tenant?.workspaceId||req.headers["x-workspace-id"]||null
  };
}
function event(req,event,detail){return {event,detail,actorEmail:String(req.user?.email||"").toLowerCase(),at:new Date()};}
function checklistFor(stage){
  const map={
    qualification:["Verify commercial lead","Confirm product and destination","Confirm buyer/supplier contact"],
    negotiation:["Record offer","Record counteroffer","Agree commercial terms"],
    deal:["Confirm quantity and price","Confirm Incoterm","Confirm payment terms","Confirm contract/PO"],
    documents:["Commercial invoice","Packing list","Sales contract / PO","Certificate requirements"],
    compliance:["HS code review","Destination requirements","Product certifications","Insurance review"],
    government:["DGFT requirements","Trade Connect review","ICEGATE/customs readiness","Other applicable official steps"],
    logistics:["Freight mode","Forwarder / carrier","Pickup and destination","Shipment plan"],
    shipment:["Booking","Customs clearance","Dispatch","Delivery tracking"],
    invoice:["Final invoice","Invoice reconciliation"],
    payment:["Payment due date","Payment received","Bank reconciliation"],
    realisation:["Export realisation tracking","eBRC / bank documentation"],
    closed:["Commercial closure","Lessons and follow-up"]
  };
  return (map[stage]||[]).map((title,i)=>({key:`${stage}_${i+1}`,title,status:"pending"}));
}
async function getExecution(req,id){
  const c=ctx(req);
  if(!mongoose.isValidObjectId(id)) throw new Error("Invalid execution id.");
  const doc=await TradeExecution.findOne({...c,_id:id}).lean();
  if(!doc) throw new Error("Trade execution not found.");
  return doc;
}
async function createExecution(req,input={}){
  const c=ctx(req);
  if(!c.ownerEmail||!c.workspaceId) throw new Error("Authenticated workspace is required.");
  if(!mongoose.isValidObjectId(input.missionId)) throw new Error("Valid missionId is required.");
  const mission=await TradeMission.findOne({...c,_id:input.missionId});
  if(!mission) throw new Error("Mission not found.");
  let lead=null;
  if(input.crmLeadId){
    lead=await CRMLead.findOne({...c,_id:input.crmLeadId});
    if(!lead) throw new Error("CRM lead not found in this workspace.");
  }
  const existing=await TradeExecution.findOne({...c,missionId:mission._id,crmLeadId:lead?._id||null,status:{$in:["active","blocked"]}});
  if(existing) return existing.toObject();
  const execution=await TradeExecution.create({
    ...c,missionId:mission._id,crmLeadId:lead ? lead._id : null,
    direction:mission.direction,product:mission.product,market:mission.market,
    stage:lead?"qualification":"deal",
    checklist:checklistFor(lead?"qualification":"deal"),
    events:[event(req,"execution_created","Trade execution workspace created from mission.")]
  });
  return execution.toObject();
}
async function advance(req,id,targetStage,patch={}){
  const c=ctx(req);
  const execution=await TradeExecution.findOne({...c,_id:id});
  if(!execution) throw new Error("Trade execution not found.");
  if(!STAGES.includes(targetStage)) throw new Error("Invalid trade execution stage.");
  const current=stageIndex(execution.stage),target=stageIndex(targetStage);
  if(target>current+1) throw new Error("Complete the current stage before advancing.");
  if(target<current) throw new Error("Trade execution stages cannot move backwards.");
  if(target===current) return execution.toObject();
  const incomplete=execution.checklist.some(x=>x.status!=="completed");
  if(incomplete) throw new Error("Complete the current stage checklist before advancing.");
  execution.stage=targetStage;
  execution.checklist=checklistFor(targetStage);
  execution.blockers=[];
  execution.events.push(event(req,"stage_advanced",`Moved from ${STAGES[current]} to ${targetStage}.`));
  if(targetStage==="closed"){execution.status="completed";execution.checklist.forEach(x=>x.status="completed");}
  await execution.save();
  await TradeMission.updateOne({...c,_id:execution.missionId},{
    $push:{timeline:{at:new Date(),event:"Trade execution advanced",detail:`Execution moved to ${targetStage}.`}}
  });
  return execution.toObject();
}
async function updateChecklist(req,id,key,status,notes=""){
  const c=ctx(req);
  const execution=await TradeExecution.findOne({...c,_id:id});
  if(!execution) throw new Error("Trade execution not found.");
  const item=execution.checklist.find(x=>x.key===key);
  if(!item) throw new Error("Checklist item not found.");
  if(!["pending","in_progress","completed","blocked"].includes(status)) throw new Error("Invalid checklist status.");
  item.status=status;item.notes=notes;
  item.completedAt=status==="completed"?new Date():null;
  if(status==="blocked") execution.status="blocked";
  else if(execution.status==="blocked" && !execution.checklist.some(x=>x.status==="blocked")) execution.status="active";
  execution.events.push(event(req,"checklist_updated",`${item.title}: ${status}`));
  await execution.save();
  return execution.toObject();
}
async function listExecutions(req){
  return TradeExecution.find(ctx(req)).sort({updatedAt:-1}).limit(100).lean();
}
module.exports={createExecution,getExecution,listExecutions,advance,updateChecklist,STAGES};
