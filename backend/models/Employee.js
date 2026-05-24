const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: false
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: false
    },

    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
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
        "Operations",
        "Documentation",
        "Viewer"
      ],
      default: "Viewer"
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Invited", "Removed"],
      default: "Active"
    },

    permissions: {
      dashboard: { type: Boolean, default: true },
      suppliers: { type: Boolean, default: false },
      crm: { type: Boolean, default: false },
      tasks: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      documents: { type: Boolean, default: false },
      outreach: { type: Boolean, default: false },
      ai: { type: Boolean, default: false },
      billing: { type: Boolean, default: false },
      admin: { type: Boolean, default: false }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", employeeSchema);