const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  ownerEmail:{type:String,required:true,lowercase:true,trim:true,index:true},
  companyId:{type:mongoose.Schema.Types.ObjectId,ref:"Company",default:null,index:true},
  workspaceId:{type:mongoose.Schema.Types.ObjectId,ref:"Workspace",required:true,index:true},
  providerKey:{type:String,required:true,index:true},
  eventId:{type:String,required:true,trim:true},
  eventType:{type:String,required:true,trim:true},
  status:{type:String,enum:["received","processed","duplicate","failed"],default:"received",index:true},
  executionId:{type:mongoose.Schema.Types.ObjectId,ref:"TradeExecution",default:null,index:true},
  externalReference:{type:String,default:""},
  payloadHash:{type:String,required:true},
  payload:{type:mongoose.Schema.Types.Mixed,default:{}},
  processedAt:{type:Date,default:null},
  error:{type:String,default:""}
},{timestamps:true});
schema.index({workspaceId:1,providerKey:1,eventId:1},{unique:true});
module.exports=mongoose.model("TradeIntegrationEvent",schema);
