const mongoose = require("mongoose");

const STAGES = [
  "qualification",
  "negotiation",
  "deal",
  "documents",
  "compliance",
  "government",
  "logistics",
  "shipment",
  "invoice",
  "payment",
  "realisation",
  "closed"
];

const tradeExecutionSchema = new mongoose.Schema({
  ownerEmail:{type:String,required:true,lowercase:true,trim:true,index:true},
  companyId:{type:mongoose.Schema.Types.ObjectId,ref:"Company",default:null,index:true},
  workspaceId:{type:mongoose.Schema.Types.ObjectId,ref:"Workspace",required:true,index:true},
  missionId:{type:mongoose.Schema.Types.ObjectId,ref:"TradeMission",required:true,index:true},
  crmLeadId:{type:mongoose.Schema.Types.ObjectId,ref:"CRMLead",default:null,index:true},
  direction:{type:String,enum:["Export","Import"],required:true},
  product:{type:String,required:true,trim:true},
  market:{type:String,required:true,trim:true},
  stage:{type:String,enum:STAGES,default:"qualification",index:true},
  status:{type:String,enum:["active","blocked","completed","cancelled"],default:"active",index:true},
  commercial:{
    quantity:{type:Number,default:null},
    unit:{type:String,default:""},
    currency:{type:String,default:"USD"},
    unitPrice:{type:Number,default:null},
    incoterm:{type:String,default:""},
    paymentTerms:{type:String,default:""},
    expectedMargin:{type:Number,default:null}
  },
  checklist:[{
    key:{type:String,required:true},
    title:{type:String,required:true},
    status:{type:String,enum:["pending","in_progress","completed","blocked"],default:"pending"},
    notes:{type:String,default:""},
    completedAt:{type:Date,default:null}
  }],
  events:[{
    event:{type:String,required:true},
    detail:{type:String,default:""},
    actorEmail:{type:String,default:""},
    at:{type:Date,default:Date.now}
  }],
  blockers:{type:[String],default:[]},
  metadata:{type:mongoose.Schema.Types.Mixed,default:{}}
},{timestamps:true});

tradeExecutionSchema.index({ownerEmail:1,workspaceId:1,missionId:1,updatedAt:-1});
tradeExecutionSchema.statics.STAGES=STAGES;

module.exports=mongoose.model("TradeExecution",tradeExecutionSchema);
