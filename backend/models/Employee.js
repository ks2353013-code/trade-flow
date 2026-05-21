const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },

    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: [
        "Admin",
        "Sales Manager",
        "Operations",
        "Documentation",
        "Viewer",
      ],
      default: "Viewer",
    },

    permissions: {
      dashboard: {
        type: Boolean,
        default: true,
      },

      suppliers: {
        type: Boolean,
        default: false,
      },

      crm: {
        type: Boolean,
        default: false,
      },

      tasks: {
        type: Boolean,
        default: false,
      },

      analytics: {
        type: Boolean,
        default: false,
      },

      documents: {
        type: Boolean,
        default: false,
      },

      outreach: {
        type: Boolean,
        default: false,
      },

      ai: {
        type: Boolean,
        default: false,
      },
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Employee", employeeSchema);