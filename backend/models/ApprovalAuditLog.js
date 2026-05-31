const mongoose = require("mongoose");

const approvalAuditLogSchema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
      index: true
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true
    },

    outreachApprovalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutreachApproval",
      required: true,
      index: true
    },

    action: {
      type: String,
      enum: ["Approve", "Reject", "Edit", "Create Draft"],
      required: true,
      index: true
    },

    actorEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    oldStatus: {
      type: String,
      default: ""
    },

    newStatus: {
      type: String,
      default: ""
    },

    oldSubject: {
      type: String,
      default: ""
    },

    newSubject: {
      type: String,
      default: ""
    },

    oldMessage: {
      type: String,
      default: ""
    },

    newMessage: {
      type: String,
      default: ""
    },

    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,
      index: true
    }
  },
  {
    versionKey: false
  }
);

approvalAuditLogSchema.index({
  ownerEmail: 1,
  companyId: 1,
  workspaceId: 1,
  outreachApprovalId: 1,
  timestamp: -1
});

function blockMutation(next) {
  next(new Error("Approval audit logs are append-only"));
}

approvalAuditLogSchema.pre("updateOne", blockMutation);
approvalAuditLogSchema.pre("updateMany", blockMutation);
approvalAuditLogSchema.pre("findOneAndUpdate", blockMutation);
approvalAuditLogSchema.pre("deleteOne", blockMutation);
approvalAuditLogSchema.pre("deleteMany", blockMutation);
approvalAuditLogSchema.pre("findOneAndDelete", blockMutation);

module.exports = mongoose.model("ApprovalAuditLog", approvalAuditLogSchema);
