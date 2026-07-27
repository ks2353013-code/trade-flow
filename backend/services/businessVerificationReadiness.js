const { getEncryptionReadiness } = require("../utils/businessVerificationSecurity");
const { getStorageReadiness } = require("./businessVerificationStorage");
const { getScannerReadiness } = require("./businessVerificationScanner");

function isBusinessVerificationEnabled() {
  const configured = process.env.BUSINESS_VERIFICATION_ENABLED;
  if (configured !== undefined) return configured === "true";
  return ["development", "test"].includes(String(process.env.NODE_ENV || "development").toLowerCase());
}

async function getBusinessVerificationReadiness({ live = false } = {}) {
  const enabled = isBusinessVerificationEnabled();
  const encryption = getEncryptionReadiness();
  const [storage, scanner] = await Promise.all([
    getStorageReadiness({ live }),
    getScannerReadiness({ live })
  ]);
  return {
    enabled,
    ready: enabled && encryption.ready && storage.ready && scanner.ready,
    encryption,
    storage,
    scanner
  };
}

module.exports = { getBusinessVerificationReadiness, isBusinessVerificationEnabled };
