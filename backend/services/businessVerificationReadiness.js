const { getEncryptionReadiness } = require("../utils/businessVerificationSecurity");
const { getStorageReadiness } = require("./businessVerificationStorage");
const { getScannerReadiness } = require("./businessVerificationScanner");

const LIVE_READINESS_TIMEOUT_MS = 2000;

function withTimeout(promise, timeoutMs, fallback) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
    timer.unref?.();
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

function isBusinessVerificationEnabled() {
  const configured = process.env.BUSINESS_VERIFICATION_ENABLED;
  if (configured !== undefined) return configured === "true";
  return ["development", "test"].includes(String(process.env.NODE_ENV || "development").toLowerCase());
}

async function getBusinessVerificationReadiness({ live = false } = {}) {
  const enabled = isBusinessVerificationEnabled();
  const encryption = getEncryptionReadiness();
  const [configuredStorage, configuredScanner] = await Promise.all([
    getStorageReadiness({ live: false }),
    getScannerReadiness({ live: false })
  ]);
  const [storage, scanner] = live
    ? await Promise.all([
        withTimeout(
          getStorageReadiness({ live: true }),
          LIVE_READINESS_TIMEOUT_MS,
          { ...configuredStorage, ready: false, error: "storage-unavailable" }
        ),
        withTimeout(
          getScannerReadiness({ live: true }),
          LIVE_READINESS_TIMEOUT_MS,
          { ...configuredScanner, ready: false }
        )
      ])
    : [configuredStorage, configuredScanner];
  return {
    enabled,
    ready: enabled && encryption.ready && storage.ready && scanner.ready,
    encryption,
    storage,
    scanner
  };
}

module.exports = {
  LIVE_READINESS_TIMEOUT_MS,
  getBusinessVerificationReadiness,
  isBusinessVerificationEnabled,
  withTimeout
};
