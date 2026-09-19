const crypto = require("crypto");
const https = require("https");

const BASE = "https://apiservices.dgft.gov.in/genebrc";

function required(value, name) {
  if (!value) throw new Error(name + " is required for DGFT eBRC API.");
  return String(value);
}

function loadCredentials() {
  const raw = process.env.TRADEFLOW_DGFT_CREDENTIALS_JSON || "";
  if (!raw) throw new Error("DGFT API credentials are not configured.");
  let c;
  try { c = JSON.parse(raw); } catch { throw new Error("TRADEFLOW_DGFT_CREDENTIALS_JSON is not valid JSON."); }
  for (const key of ["client_Id","client_secret","dgftpublicKey","userprivateKey","x-Api-Key","iecCode"]) required(c[key], key);
  return c;
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
        if (body.length > 5_000_000) res.destroy(new Error("DGFT response too large."));
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

function publicKey(pem) {
  return crypto.createPublicKey(pem);
}

function privateKey(pem) {
  return crypto.createPrivateKey(pem);
}

function encryptPayload(payload, credentials) {
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const b64 = plaintext.toString("base64");
  const secret = crypto.randomBytes(32).toString("base64url").slice(0, 32);
  const salt = crypto.randomBytes(32);
  const key = crypto.createHash("sha256").update(Buffer.from(secret, "utf8")).update(salt).digest();
  const iv = key.subarray(0, 12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(b64, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  const data = Buffer.concat([iv, salt, encrypted, tag]).toString("base64");
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(b64);
  signer.end();
  const sign = signer.sign(privateKey(credentials.userprivateKey)).toString("base64");
  const secretVal = crypto.publicEncrypt({
    key: publicKey(credentials.dgftpublicKey),
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
    oaepHash: "sha256"
  }, Buffer.from(secret, "utf8")).toString("base64");
  return { body: { data, sign }, secretVal };
}

function decryptResponse(response, credentials, secret, salt) {
  const data = Buffer.from(response.data, "base64");
  const iv = data.subarray(0, 12);
  const responseSalt = data.subarray(12, 44);
  const tag = data.subarray(data.length - 16);
  const ciphertext = data.subarray(44, data.length - 16);
  const key = crypto.createHash("sha256").update(Buffer.from(secret, "utf8")).update(responseSalt || salt).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decodedB64 = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(Buffer.from(decodedB64, "base64").toString("utf8"));
}

async function accessToken(credentials) {
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

async function callApi(path, payload, credentials) {
  const token = await accessToken(credentials);
  const encrypted = encryptPayload(payload, credentials);
  const response = await requestJson(BASE + path, {
    headers: {
      accessToken: token,
      client_id: credentials.client_Id,
      secretVal: encrypted.secretVal
    },
    body: JSON.stringify(encrypted.body)
  });
  if (response && response.data && response.sign) {
    try {
      return decryptResponse(response, credentials, "", "");
    } catch {
      return response;
    }
  }
  return response;
}

async function test() {
  const credentials = loadCredentials();
  const token = await accessToken(credentials);
  return { provider: "dgft", status: "active", authenticated: true, tokenExpiresInSeconds: 300, clientId: credentials.client_Id, iecCode: credentials.iecCode, accessToken: "redacted" };
}

async function fetchIRM(input = {}) {
  const c = loadCredentials();
  return callApi("/fetchIRMDetails", {
    irmFromDate: input.irmFromDate || "",
    irmToDate: input.irmToDate || "",
    irmNumber: input.irmNumber || "",
    iecCode: required(input.iecCode || c.iecCode, "iecCode")
  }, c);
}

async function fetchORM(input = {}) {
  const c = loadCredentials();
  return callApi("/fetchORMDetails", {
    ormFromDate: input.ormFromDate || "",
    ormToDate: input.ormToDate || "",
    ormNumber: input.ormNumber || "",
    iecCode: required(input.iecCode || c.iecCode, "iecCode")
  }, c);
}

async function generateEBRC(input = {}) {
  const c = loadCredentials();
  const request = { ...input, iecNumber: input.iecNumber || c.iecCode };
  return callApi("/pushIRMToGenEBRC", request, c);
}

module.exports = { test, fetchIRM, fetchORM, generateEBRC, pbkdf2ClientSecret, encryptPayload };
