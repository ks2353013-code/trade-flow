const express=require("express");
const router=express.Router();
const service=require("../services/tradeExecutionService");
const {enforceLimit}=require("../middleware/planLimitMiddleware");
const {usageTracker}=require("../middleware/usageMiddleware");

router.get("/",async(req,res)=>{try{res.json({success:true,executions:await service.listExecutions(req)});}catch(e){res.status(500).json({success:false,message:e.message});}});
router.post("/",enforceLimit("mission_create"),usageTracker("trade_execution_create"),async(req,res)=>{try{res.status(201).json({success:true,execution:await service.createExecution(req,req.body||{})});}catch(e){res.status(400).json({success:false,message:e.message});}});
router.get("/:executionId",async(req,res)=>{try{res.json({success:true,execution:await service.getExecution(req,req.params.executionId)});}catch(e){res.status(404).json({success:false,message:e.message});}});
router.post("/:executionId/stage",async(req,res)=>{try{res.json({success:true,execution:await service.advance(req,req.params.executionId,req.body?.stage,req.body||{})});}catch(e){res.status(400).json({success:false,message:e.message});}});
router.post("/:executionId/checklist/:itemKey",async(req,res)=>{try{res.json({success:true,execution:await service.updateChecklist(req,req.params.executionId,req.params.itemKey,req.body?.status,req.body?.notes||"")});}catch(e){res.status(400).json({success:false,message:e.message});}});
module.exports=router;
