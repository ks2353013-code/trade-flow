const fs = require("node:fs");
const path = require("node:path");

const value = String(process.env.TRADEFLOW_STAGING_API_BASE_URL || "").trim();
if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(value)) {
  throw new Error("TRADEFLOW_STAGING_API_BASE_URL must be an HTTPS origin");
}
if (/tradeflow-backend\.onrender\.com/i.test(value)) {
  throw new Error("The production backend origin is forbidden in the staging frontend build");
}

const output = `window.TRADEFLOW_API_BASE_URL=${JSON.stringify(value)};\n`;
fs.writeFileSync(path.resolve(__dirname, "../../frontend/js/runtime-config.js"), output, {
  encoding: "utf8",
  mode: 0o644
});
