const mongoose = require("mongoose");

const emailDeliverySchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true, lowercase: true, trim: true },
    companyId: { type: String, default: null },
    workspaceId: { type: String, required: true },

    outreachApprovalId: { type: mongoose.Schema.Types.ObjectId, ref: "OutreachApproval", required: true },
    missionId: { type: mongoose.Schema.Types.ObjectId, default: null },
    crmLeadId: { type: mongoose.Schema.Types.ObjectId, default: null },

    to: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },

    status: {
      type: String,
      enum: ["Queued", "Sent", "Failed", "Dry Run"],
      default: "Queued"
    },

    provider: { type: String, default: "SMTP" },
    providerMessageId: { type: String, default: "" },
    providerResponse: { type: Object, default: {} },
    errorMessage: { type: String, default: "" },

    sentBy: { type: String, default: "" },
    sentAt: { type: Date, default: null },

    humanApproved: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailDelivery", emailDeliverySchema);