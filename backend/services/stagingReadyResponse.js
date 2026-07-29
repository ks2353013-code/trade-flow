"use strict";

const { validateStagingRuntimeConfiguration } = require("./stagingReadinessConfiguration");
const {
  TOTAL_RESIDUE_TIMEOUT_MS,
  calculateStagingAcceptanceResidue,
  unverifiableResidue,
  withTimeout
} = require("./stagingAcceptanceResidue");

const READY_RESIDUE_TIMEOUT_MS = TOTAL_RESIDUE_TIMEOUT_MS + 100;

async function addStagingVerification(payload, {
  env = process.env,
  activeDatabaseName = "",
  acceptanceReady = false,
  calculateResidue = calculateStagingAcceptanceResidue,
  residueTimeoutMs = READY_RESIDUE_TIMEOUT_MS
} = {}) {
  if (env.NODE_ENV !== "staging") return { payload, ready: true };

  const stagingVerification = validateStagingRuntimeConfiguration({ env, activeDatabaseName });
  stagingVerification.acceptance.ready = Boolean(acceptanceReady);
  try {
    stagingVerification.acceptanceResidue = await withTimeout(calculateResidue(), residueTimeoutMs);
  } catch {
    stagingVerification.acceptanceResidue = unverifiableResidue();
  }
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

module.exports = { READY_RESIDUE_TIMEOUT_MS, addStagingVerification };
