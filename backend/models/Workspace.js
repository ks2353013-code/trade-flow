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

    subscriptionPlan: {
      type: String,
      enum: ["Starter", "Pro Exporter", "Enterprise AI OS"],
      default: "Starter"
    },

    subscriptionPrice: {
      type: Number,
      default: 1999
    },

    subscriptionStatus: {
      type: String,
      enum: ["Trial", "Active", "Past Due", "Cancelled"],
      default: "Active"
    },

    planLimits: {
      maxSuppliers: {
        type: Number,
        default: 200
      },
      maxBuyerSearches: {
        type: Number,
        default: 50
      },
      maxEmployees: {
        type: Number,
        default: 3
      },
      maxWorkspaces: {
        type: Number,
        default: 1
      }
    },

    features: {
      aiTools: {
        type: Boolean,
        default: false
      },
      analytics: {
        type: Boolean,
        default: false
      },
      buyerDiscovery: {
        type: Boolean,
        default: false
      },
      automation: {
        type: Boolean,
        default: false
      },
      documents: {
        type: Boolean,
        default: false
      },
      tradeRiskEngine: {
        type: Boolean,
        default: false
      },
      executiveControlTower: {
        type: Boolean,
        default: false
      },
      autonomousAI: {
        type: Boolean,
        default: false
      },
      whiteLabel: {
        type: Boolean,
        default: false
      },
      liveSupplierNetwork: {
        type: Boolean,
        default: false
      }
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
      default: false
    }
  },
  { timestamps: true }
);

workspaceSchema.pre("save", function (next) {
  if (this.subscriptionPlan === "Starter") {
    this.subscriptionPrice = 1999;

    this.planLimits = {
      maxSuppliers: 200,
      maxBuyerSearches: 50,
      maxEmployees: 3,
      maxWorkspaces: 1
    };

    this.features = {
      aiTools: false,
      analytics: false,
      buyerDiscovery: false,
      automation: false,
      documents: false,
      tradeRiskEngine: false,
      executiveControlTower: false,
      autonomousAI: false,
      whiteLabel: false,
      liveSupplierNetwork: false
    };

    this.automationEnabled = false;
  }

  if (this.subscriptionPlan === "Pro Exporter") {
    this.subscriptionPrice = 8999;

    this.planLimits = {
      maxSuppliers: 2000,
      maxBuyerSearches: 1000,
      maxEmployees: 25,
      maxWorkspaces: 5
    };

    this.features = {
      aiTools: true,
      analytics: true,
      buyerDiscovery: true,
      automation: true,
      documents: true,
      tradeRiskEngine: true,
      executiveControlTower: false,
      autonomousAI: false,
      whiteLabel: false,
      liveSupplierNetwork: false
    };

    this.automationEnabled = true;
  }

  if (this.subscriptionPlan === "Enterprise AI OS") {
    this.subscriptionPrice = 49999;

    this.planLimits = {
      maxSuppliers: 999999,
      maxBuyerSearches: 999999,
      maxEmployees: 999999,
      maxWorkspaces: 999999
    };

    this.features = {
      aiTools: true,
      analytics: true,
      buyerDiscovery: true,
      automation: true,
      documents: true,
      tradeRiskEngine: true,
      executiveControlTower: true,
      autonomousAI: true,
      whiteLabel: true,
      liveSupplierNetwork: true
    };

    this.automationEnabled = true;
  }

  next();
});

module.exports = mongoose.model("Workspace", workspaceSchema);