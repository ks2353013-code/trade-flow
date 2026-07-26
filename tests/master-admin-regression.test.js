const assert = require("node:assert/strict");
const test = require("node:test");

const {
  MASTER_ADMIN_ROLE,
  applyMasterAdminIdentity,
  hasMasterAdminRole,
  isMasterAdminEmail,
  normalizeIdentityEmail
} = require("../backend/utils/masterAdminIdentity");
const { masterOnly } = require("../backend/middleware/authMiddleware");

test("both normalized allowlisted identities receive the canonical role", () => {
  for (const email of [
    " CONTACT@TRADEFLOWAI.IN ",
    " KS2353013@GMAIL.COM "
  ]) {
    const user = { email, role: "Founder", isMasterAdmin: false };
    assert.equal(applyMasterAdminIdentity(user), true);
    assert.equal(isMasterAdminEmail(email), true);
    assert.equal(user.email, normalizeIdentityEmail(email));
    assert.equal(user.role, MASTER_ADMIN_ROLE);
    assert.equal(user.isMasterAdmin, true);
  }
});

test("non-allowlisted records cannot retain the Master Admin role", () => {
  const user = {
    email: "ordinary@example.com",
    role: MASTER_ADMIN_ROLE,
    isMasterAdmin: true
  };
  applyMasterAdminIdentity(user);
  assert.equal(user.role, "Founder");
  assert.equal(user.isMasterAdmin, false);
  assert.equal(hasMasterAdminRole(user), false);
});

test("Master Admin middleware trusts only the verified canonical role", () => {
  let nextCalled = false;
  masterOnly(
    {
      user: { email: "ordinary@example.com", role: "Founder" },
      headers: { "x-user-email": "contact@tradeflowai.in" },
      body: { email: "contact@tradeflowai.in" },
      query: { email: "contact@tradeflowai.in" }
    },
    {
      status(code) {
        assert.equal(code, 403);
        return this;
      },
      json(payload) {
        assert.equal(payload.success, false);
        return payload;
      }
    },
    () => {
      nextCalled = true;
    }
  );
  assert.equal(nextCalled, false);
});

test("Master Admin middleware accepts the verified canonical role", () => {
  let nextCalled = false;
  masterOnly(
    { user: { email: "contact@tradeflowai.in", role: MASTER_ADMIN_ROLE } },
    {},
    () => {
      nextCalled = true;
    }
  );
  assert.equal(nextCalled, true);
});
