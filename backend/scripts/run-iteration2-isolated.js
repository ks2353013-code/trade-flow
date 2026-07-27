const crypto = require("node:crypto");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { MongoMemoryServer } = require("mongodb-memory-server");

const backendRoot = path.resolve(__dirname, "..");
const port = 5055;
let apiProcess;
let mongo;

function safeEnvironment(uri) {
  return {
    ...process.env,
    NODE_ENV: "test",
    PORT: String(port),
    MONGO_URI: uri,
    TEST_API_BASE: `http://127.0.0.1:${port}`,
    JWT_SECRET: "synthetic-iteration2-access-secret-with-32-chars",
    JWT_REFRESH_SECRET: "synthetic-iteration2-refresh-secret-with-32-chars",
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
    WHATSAPP_FROM: ""
  };
}

function runChild(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: backendRoot,
      env,
      stdio: "inherit",
      shell: false
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

async function waitForApi() {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/ready`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Isolated TradeFlow API did not become ready");
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
    binary: { downloadDir: path.resolve(backendRoot, "../.cache/mongodb-binaries") },
    instance: { dbName: "tradeflow_iteration2_isolated", launchTimeout: 60000 }
  });
  const env = safeEnvironment(mongo.getUri());
  apiProcess = spawn(process.execPath, ["server.js"], {
    cwd: backendRoot,
    env,
    stdio: ["ignore", "inherit", "inherit"],
    shell: false
  });
  await waitForApi();
  const code = await runChild(process.execPath, ["scripts/iteration2-regression-tests.js"], env);
  if (code !== 0) process.exitCode = code;
}

main()
  .catch((error) => {
    console.error(`Isolated Iteration 2 regression failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(cleanup);
