const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true
    },

    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    workspaceName: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    type: {
      type: String,
      enum: [
        "Sales",
        "Export",
        "Import",
        "Marketing",
        "Operations",
        "Finance",
        "Management"
      ],
      default: "Sales"
    },

    visibility: {
      type: String,
      enum: ["Private", "Company", "Public"],
      default: "Company"
    },

    status: {
      type: String,
      enum: ["Active", "Archived"],
      default: "Active"
    },

    members: [
      {
        email: {
          type: String,
          lowercase: true,
          trim: true
        },

        role: {
          type: String,
          enum: [
            "Owner",
            "Admin",
            "Manager",
            "Sales",
            "Support",
            "Viewer"
          ],
          default: "Viewer"
        }
      }
    ],

    aiMemoryEnabled: {
      type: Boolean,
      default: true
    },

    automationEnabled: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Workspace", workspaceSchema);