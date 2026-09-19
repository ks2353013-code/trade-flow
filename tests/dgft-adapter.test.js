const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const adapter = require("../backend/services/dgftEbrcAdapter");

test("DGFT PBKDF2 credential format is 64 bytes before base64", () => {
  const value = adapter.pbkdf2ClientSecret("example-secret");
  assert.equal(Buffer.from(value, "base64").length, 64);
});

test("DGFT payload envelope has encrypted data, signature and secretVal", () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const pub = publicKey.export({ type: "spki", format: "pem" });
  const priv = privateKey.export({ type: "pkcs8", format: "pem" });
  const encrypted = adapter.encryptPayload({ iecNumber: "1234567890" }, {
    client_Id: "test", client_secret: "test", "x-Api-Key": "test", iecCode: "1234567890", dgftpublicKey: pub, userprivateKey: priv
  });
  assert.equal(typeof encrypted.body.data, "string");
  assert.equal(typeof encrypted.body.sign, "string");
  assert.equal(typeof encrypted.secretVal, "string");
});
