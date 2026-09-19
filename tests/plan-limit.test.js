const test = require("node:test");
const assert = require("node:assert/strict");
const { getLimit } = require("../backend/middleware/planLimitMiddleware");

test("plan limits remain explicit and fail closed for unsupported features", () => {
  assert.equal(getLimit("Starter", "mission_create"), 20);
  assert.equal(getLimit("Starter", "email_send"), 25);
  assert.equal(getLimit("Free", "mission_create"), 0);
  assert.equal(getLimit("Enterprise AI OS", "mission_create"), 10000);
  assert.equal(getLimit("Unknown", "mission_create"), undefined);
});
