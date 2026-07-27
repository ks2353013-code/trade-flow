const crypto = require("node:crypto");
const path = require("node:path");
const { createRequire } = require("node:module");
const { spawn } = require("node:child_process");
const http = require("node:http");

const root = path.resolve(__dirname, "..");
const backendRoot = path.join(root, "backend");
const backendRequire = createRequire(path.join(backendRoot, "package.json"));
const { MongoMemoryServer } = backendRequire("mongodb-memory-server");
const port = 5000;
let apiProcess;
let mongo;

function environment(uri) {
  return {
    ...process.env,
    NODE_ENV: "test",
    PORT: String(port),
    MONGO_URI: uri,
    TRADEFLOW_E2E_BASE_URL: `http://127.0.0.1:${port}`,
    JWT_SECRET: "synthetic-playwright-access-secret-with-32-chars",
    JWT_REFRESH_SECRET: "synthetic-playwright-refresh-secret-with-32-chars",
    BUSINESS_VERIFICATION_ENCRYPTION_KEY: crypto.randomBytes(32).toString("base64"),
    BUSINESS_VERIFICATION_HASH_KEY: crypto.randomBytes(32).toString("base64"),
    BUSINESS_VERIFICATION_ENABLED: "true",
    BUSINESS_VERIFICATION_SCANNER_DRIVER: "test",
    BUSINESS_VERIFICATION_STORAGE_DRIVER: "local",
    ENABLE_SCHEDULERS: "false",
    EMAIL_USER: "",
    EMAIL_PASS: "",
    SMTP_HOST: "",
    SMTP_USER: "",
    SMTP_PASS: "",
    OPENAI_API_KEY: "",
    SERP_API_KEY: "",
    HUNTER_API_KEY: "",
    TWILIO_ACCOUNT_SID: "",
    TWILIO_AUTH_TOKEN: "",
    WHATSAPP_FROM: "",
    CI: "true"
  };
}

async function waitForReady() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const ready = await new Promise((resolve) => {
      const request = http.get(`http://localhost:${port}/api/health`, (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      });
      request.setTimeout(1000, () => request.destroy());
      request.on("error", () => resolve(false));
    });
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Isolated Playwright API did not become ready");
}

function runPlaywright(env) {
  const filters = process.argv.slice(2);
  const windows = process.platform === "win32";
  const command = windows ? process.env.ComSpec || "cmd.exe" : "npx";
  const args = windows
    ? ["/d", "/s", "/c", "npx.cmd", "playwright", "test", ...filters, "--reporter=list"]
    : ["playwright", "test", ...filters, "--reporter=list"];
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: "inherit",
      shell: false
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

async function cleanup() {
  if (apiProcess && !apiProcess.killed) {
    apiProcess.kill();
    await new Promise((resolve) => {
      apiProcess.once("exit", resolve);
      setTimeout(resolve, 3000);
    });
  }
  if (mongo) await mongo.stop();
}

async function main() {
  mongo = await MongoMemoryServer.create({
    binary: { downloadDir: path.join(root, ".cache/mongodb-binaries") },
    instance: { dbName: "tradeflow_playwright_isolated", launchTimeout: 60000 }
  });
  const env = environment(mongo.getUri());
  apiProcess = spawn(process.execPath, ["server.js"], {
    cwd: backendRoot,
    env,
    stdio: ["ignore", "inherit", "inherit"],
    shell: false
  });
  await waitForReady();
  process.exitCode = await runPlaywright(env);
}

main()
  .catch((error) => {
    console.error(`Isolated Playwright run failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(cleanup);
