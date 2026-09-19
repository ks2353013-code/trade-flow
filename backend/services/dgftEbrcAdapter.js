const crypto = require("crypto");
const https = require("https");

const BASE = "https://apiservices.dgft.gov.in/genebrc";

function required(value, name) {
  if (!value) throw new Error(name + " is required for DGFT eBRC API.");
  return String(value);
}

function validateCredentials(c) {
  if (!c || typeof c !== "object") throw new Error("DGFT API credentials are required.");
  for (const key of ["client_Id","client_secret","dgftpublicKey","userprivateKey","x-Api-Key","iecCode"]) required(c[key], key);
  return c;
}

function loadCredentials() {
  const raw = process.env.TRADEFLOW_DGFT_CREDENTIALS_JSON || "";
  if (!raw) throw new Error("DGFT API credentials are not configured.");
  try { return validateCredentials(JSON.parse(raw)); }
  catch (e) { if (e.message.includes("credentials are required")) throw e; throw new Error("TRADEFLOW_DGFT_CREDENTIALS_JSON is not valid JSON."); }
}

function pbkdf2ClientSecret(clientSecret) {
  const salt = crypto.randomBytes(32);
  const hash = crypto.pbkdf2Sync(Buffer.from(clientSecret, "utf8"), salt, 65536, 32, "sha256");
  return Buffer.concat([salt, hash]).toString("base64");
}

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...(options.headers || {}) },
      timeout: 15000
    }, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", chunk => {
        body += chunk;
        if (body.length > 5_000_000) req.destroy(new Error("DGFT response too large."));
      });
      res.on("end", () => {
        let data;
        try { data = JSON.parse(body); } catch { data = body; }
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const e = new Error("DGFT HTTP " + res.statusCode);
          e.statusCode = res.statusCode; e.providerBody = data; return reject(e);
        }
        resolve(data);
      });
    });
    req.on("timeout", () => req.destroy(new Error("DGFT request timed out.")));
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function encryptPayload(payload, credentials) {
  validateCredentials(credentials);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const b64 = plaintext.toString("base64");
  const secret = crypto.randomBytes(24).toString("base64url").slice(0, 32);
  const salt = crypto.randomBytes(32);
  const key = crypto.createHash("sha256").update(Buffer.from(secret, "utf8")).update(salt).digest();
  const iv = key.subarray(0, 12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(b64, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  const data = Buffer.concat([iv, salt, ciphertext, tag]).toString("base64");

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(b64);
  signer.end();
  const sign = signer.sign(crypto.createPrivateKey(credentials.userprivateKey)).toString("base64");

  const secretVal = crypto.publicEncrypt({
    key: crypto.createPublicKey(credentials.dgftpublicKey),
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256"
  }, Buffer.from(secret, "utf8")).toString("base64");

  return { body: { data, sign }, secretVal, secret, salt };
}

function decryptResponse(response, credentials, secret) {
  if (!response?.data || !response?.sign) return response;
  const encoded = Buffer.from(response.data, "base64");
  const iv = encoded.subarray(0, 12);
  const salt = encoded.subarray(12, 44);
  const tag = encoded.subarray(encoded.length - 16);
  const ciphertext = encoded.subarray(44, encoded.length - 16);
  const key = crypto.createHash("sha256").update(Buffer.from(secret, "utf8")).update(salt).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decodedB64 = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(decodedB64);
  verifier.end();
  if (credentials.dgftpublicKey && !verifier.verify(crypto.createPublicKey(credentials.dgftpublicKey), Buffer.from(response.sign, "base64"))) {
    throw new Error("DGFT response signature verification failed.");
  }
  return JSON.parse(Buffer.from(decodedB64, "base64").toString("utf8"));
}

async function accessToken(credentials) {
  validateCredentials(credentials);
  const response = await requestJson(BASE + "/getAccessToken", {
    headers: { "x-api-key": credentials["x-Api-Key"] },
    body: JSON.stringify({
      client_id: credentials.client_Id,
      client_secret: pbkdf2ClientSecret(credentials.client_secret)
    })
  });
  if (!response.accessToken) throw new Error("DGFT did not return an accessToken.");
  return response.accessToken;
}

async function callApi(path, payload, credentials, baseOverride = BASE) {
  validateCredentials(credentials);
  const token = await accessToken(credentials);
  const encrypted = encryptPayload(payload, credentials);
  const response = await requestJson(baseOverride + path, {
    headers: {
      accessToken: token,
      client_id: credentials.client_Id,
      secretVal: encrypted.secretVal
    },
    body: JSON.stringify(encrypted.body)
  });
  return decryptResponse(response, credentials, encrypted.secret);
}

async function test(credentials = loadCredentials()) {
  validateCredentials(credentials);
  await accessToken(credentials);
  return {
    provider: "dgft",
    status: "active",
    authenticated: true,
    tokenExpiresInSeconds: 300,
    clientId: credentials.client_Id,
    iecCode: credentials.iecCode,
    accessToken: "redacted"
  };
}

async function fetchIRM(input = {}, credentials = loadCredentials()) {
  return callApi("/fetchIRMDetails", {
    irmFromDate: input.irmFromDate || "",
    irmToDate: input.irmToDate || "",
    irmNumber: input.irmNumber || "",
    iecCode: required(input.iecCode || credentials.iecCode, "iecCode")
  }, credentials);
}

async function fetchORM(input = {}, credentials = loadCredentials()) {
  return callApi("/fetchORMDetails", {
    ormFromDate: input.ormFromDate || "",
    ormToDate: input.ormToDate || "",
    ormNumber: input.ormNumber || "",
    iecCode: required(input.iecCode || credentials.iecCode, "iecCode")
  }, credentials);
}

async function generateEBRC(input = {}, credentials = loadCredentials()) {
  const request = { ...input, iecNumber: input.iecNumber || credentials.iecCode };
  const base = input.sandbox ? BASE + "/sandbox" : BASE;
  delete request.sandbox;
  return callApi("/pushIRMToGenEBRC", request, credentials, base);
}

module.exports = { test, fetchIRM, fetchORM, generateEBRC, pbkdf2ClientSecret, encryptPayload, validateCredentials };