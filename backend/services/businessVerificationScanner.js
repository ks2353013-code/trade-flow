const net = require("node:net");

const MAX_SCAN_BYTES = 8 * 1024 * 1024;

function scannerDriver() {
  const configured = String(process.env.BUSINESS_VERIFICATION_SCANNER_DRIVER || "").toLowerCase();
  if (configured) return configured;
  if (process.env.NODE_ENV === "test") return "test";
  if (process.env.NODE_ENV === "development") return "local";
  return "unconfigured";
}

function boundedTimeout() {
  return Math.min(Math.max(Number(process.env.BUSINESS_VERIFICATION_SCANNER_TIMEOUT_MS) || 10000, 1000), 30000);
}

function testScan(buffer) {
  const content = buffer.toString("latin1");
  if (content.includes("SCAN_TIMEOUT")) return new Promise((_, reject) => setTimeout(() => reject(new Error("Scanner timeout")), 25));
  if (content.includes("EICAR") || content.includes("SYNTHETIC_INFECTED")) return Promise.resolve({ status: "Infected", engine: "deterministic-test" });
  if (content.includes("SCAN_ERROR")) return Promise.resolve({ status: "Error", engine: "deterministic-test" });
  return Promise.resolve({ status: "Clean", engine: "deterministic-test" });
}

function clamAvScan(buffer, { local = false } = {}) {
  const host = String(process.env.BUSINESS_VERIFICATION_CLAMAV_HOST || (local ? "127.0.0.1" : "")).trim();
  const port = Number(process.env.BUSINESS_VERIFICATION_CLAMAV_PORT || 3310);
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Private ClamAV scanner is not configured");
  }
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host, port });
    let response = "";
    const finish = (error, result) => {
      socket.destroy();
      if (error) reject(error);
      else resolve(result);
    };
    socket.setTimeout(boundedTimeout(), () => finish(new Error("Scanner timeout")));
    socket.on("error", () => finish(new Error("Scanner unavailable")));
    socket.on("data", (chunk) => { response += chunk.toString("utf8"); });
    socket.on("end", () => {
      if (response.includes(" FOUND")) return finish(null, { status: "Infected", engine: "private-clamav" });
      if (response.includes(" OK")) return finish(null, { status: "Clean", engine: "private-clamav" });
      return finish(null, { status: "Error", engine: "private-clamav" });
    });
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let offset = 0; offset < buffer.length; offset += 64 * 1024) {
        const chunk = buffer.subarray(offset, offset + 64 * 1024);
        const length = Buffer.alloc(4);
        length.writeUInt32BE(chunk.length);
        socket.write(length);
        socket.write(chunk);
      }
      socket.end(Buffer.alloc(4));
    });
  });
}

async function scanDocument(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_SCAN_BYTES) {
    return { status: "Error", engine: "validation" };
  }
  const driver = scannerDriver();
  try {
    const result = driver === "test"
      ? await Promise.race([
          testScan(buffer),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Scanner timeout")), boundedTimeout()))
        ])
      : driver === "clamav"
        ? await clamAvScan(buffer)
        : driver === "local"
          ? await clamAvScan(buffer, { local: true })
        : { status: "Error", engine: "unconfigured" };
    return ["Clean", "Infected"].includes(result.status) ? result : { status: "Error", engine: result.engine || driver };
  } catch {
    return { status: "Error", engine: driver };
  }
}

async function getScannerReadiness({ live = false } = {}) {
  const driver = scannerDriver();
  if (driver === "test") return { ready: process.env.NODE_ENV === "test", driver, private: true, failClosed: true };
  if (!["clamav", "local"].includes(driver)) return { ready: false, driver, private: false, failClosed: true };
  if (driver === "local" && process.env.NODE_ENV !== "development") {
    return { ready: false, driver, private: true, failClosed: true };
  }
  const configured = driver === "local"
    ? true
    : Boolean(process.env.BUSINESS_VERIFICATION_CLAMAV_HOST && process.env.BUSINESS_VERIFICATION_CLAMAV_PORT);
  if (!configured || !live) return { ready: configured, driver, private: true, failClosed: true };
  const probe = await scanDocument(Buffer.from("%PDF-1.7 TradeFlow scanner readiness"));
  return { ready: probe.status === "Clean", driver, private: true, failClosed: true };
}

module.exports = { getScannerReadiness, scanDocument, scannerDriver };
