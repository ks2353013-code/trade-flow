const crypto = require("crypto");
const https = require("https");

function requestJson(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: options.method || "POST", headers: { "Content-Type": "application/json", Accept: "application/json", ...(options.headers || {}) }, timeout: 15000 }, res => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", c => { body += c; if (body.length > 5_000_000) req.destroy(new Error("ICEGATE response too large.")); });
      res.on("end", () => {
        let data; try { data = JSON.parse(body); } catch { data = body; }
        if (res.statusCode < 200 || res.statusCode >= 300) { const e = new Error("ICEGATE HTTP " + res.statusCode); e.statusCode = res.statusCode; e.providerBody = data; return reject(e); }
        resolve(data);
      });
    });
    req.on("timeout", () => req.destroy(new Error("ICEGATE request timed out.")));
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function encryptCredentials(credentials) {
  if (!credentials?.icegateID || !credentials?.password || !credentials?.publicCertificate) throw new Error("ICEGATE credentials require icegateID, password and publicCertificate.");
  const aesKey = crypto.randomBytes(16);
  const encryptedKey = crypto.publicEncrypt({ key: crypto.createPublicKey(credentials.publicCertificate), padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, aesKey);
  const cipher = crypto.createCipheriv("aes-128-ecb", aesKey, null);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(JSON.stringify({ icegateID: credentials.icegateID, password: credentials.password }), "utf8")), cipher.final()]);
  return Buffer.from(encryptedKey).toString("base64") + ":" + Buffer.from(encrypted).toString("base64");
}

async function authenticate(credentials, endpoint) {
  if (!endpoint) throw new Error("ICEGATE authentication endpoint is required; use the endpoint issued in the current ICEGATE API onboarding contract.");
  const response = await requestJson(endpoint, { body: JSON.stringify({ data: encryptCredentials(credentials) }) });
  if (String(response?.status || "").toUpperCase() !== "SUCCESS" || !response?.accessToken) throw new Error(response?.message || "ICEGATE authentication failed.");
  return response;
}

async function test(credentials, authEndpoint) {
  const response = await authenticate(credentials, authEndpoint);
  return { provider: "icegate", status: "active", authenticated: true, tokenExpiresIn: response.tokenExpiresIn || null, accessToken: "redacted" };
}

module.exports = { encryptCredentials, authenticate, test };
