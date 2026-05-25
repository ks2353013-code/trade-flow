const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    companyName: {
      type: String,
      default: "TradeFlow Company"
    },

    role: {
      type: String,
      enum: [
        "Master Admin",
        "Founder",
        "Admin",
        "Manager",
        "Sales",
        "Support",
        "Viewer"
      ],
      default: "Founder"
    },

    subscriptionPlan: {
      type: String,
      enum: [
        "Starter",
        "Pro Exporter",
        "Enterprise AI OS"
      ],
      default: "Starter"
    },

    subscriptionPrice: {
      type: Number,
      default: 1999
    },

    subscriptionStatus: {
      type: String,
      enum: [
        "Trial",
        "Active",
        "Past Due",
        "Cancelled"
      ],
      default: "Active"
    },

    trialEndsAt: {
      type: Date,
      default: null
    },

    isMasterAdmin: {
      type: Boolean,
      default: false
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

    limits: {
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
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre("save", async function (next) {

  if (!this.isModified("password")) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);

  next();
});

userSchema.pre("save", function (next) {

  if (this.email === "ks2353013@gmail.com") {
    this.isMasterAdmin = true;
    this.role = "Master Admin";
  }

  if (this.subscriptionPlan === "Starter") {

    this.subscriptionPrice = 1999;

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

    this.limits = {
      maxSuppliers: 200,
      maxBuyerSearches: 50,
      maxEmployees: 3,
      maxWorkspaces: 1
    };
  }

  if (this.subscriptionPlan === "Pro Exporter") {

    this.subscriptionPrice = 8999;

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

    this.limits = {
      maxSuppliers: 2000,
      maxBuyerSearches: 1000,
      maxEmployees: 25,
      maxWorkspaces: 5
    };
  }

  if (this.subscriptionPlan === "Enterprise AI OS") {

    this.subscriptionPrice = 49999;

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

    this.limits = {
      maxSuppliers: 999999,
      maxBuyerSearches: 999999,
      maxEmployees: 999999,
      maxWorkspaces: 999999
    };
  }

  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(
    enteredPassword,
    this.password
  );
};

module.exports = mongoose.model("User", userSchema);