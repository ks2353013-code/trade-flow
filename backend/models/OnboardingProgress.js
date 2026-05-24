const mongoose = require("mongoose");

const onboardingProgressSchema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace"
    },

    completedSteps: {
      type: [String],
      default: []
    },

    currentStep: {
      type: Number,
      default: 1
    },

    onboardingCompleted: {
      type: Boolean,
      default: false
    },

    completionPercentage: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "OnboardingProgress",
  onboardingProgressSchema
);