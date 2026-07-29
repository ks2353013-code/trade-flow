"use strict";

const { validateStagingRuntimeConfiguration } = require("./stagingReadinessConfiguration");
const { calculateStagingAcceptanceResidue } = require("./stagingAcceptanceResidue");

async function addStagingVerification(payload, {
  env = process.env,
  activeDatabaseName = "",
  acceptanceReady = false,
  calculateResidue = calculateStagingAcceptanceResidue
} = {}) {
  if (env.NODE_ENV !== "staging") return { payload, ready: true };

  const stagingVerification = validateStagingRuntimeConfiguration({ env, activeDatabaseName });
  stagingVerification.acceptance.ready = Boolean(acceptanceReady);
  stagingVerification.acceptanceResidue = await calculateResidue();
  payload.stagingVerification = stagingVerification;

  return {
    payload,
    ready: stagingVerification.database.isolated &&
      stagingVerification.database.connected &&
      !stagingVerification.externalAutomation.enabled &&
      stagingVerification.emailMode === "dry-run" &&
      stagingVerification.acceptanceResidue.clean === true
  };
}

module.exports = { addStagingVerification };
