const jwt = require("jsonwebtoken");

function requiredSecret(name, developmentFallback) {
  const secret = process.env[name];

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} is required in production`);
  }

  return developmentFallback;
}

function accessSecret() {
  return requiredSecret("JWT_SECRET", "tradeflow_dev_access_secret");
}

function refreshSecret() {
  return requiredSecret("JWT_REFRESH_SECRET", "tradeflow_dev_refresh_secret");
}

function generateAccessToken(user) {

  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role || "Owner",
      tokenVersion: Number(user.tokenVersion || 0)
    },
    accessSecret(),
    {
      expiresIn: "15m"
    }
  );

}

function generateRefreshToken(user) {

  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      tokenVersion: Number(user.tokenVersion || 0)
    },
    refreshSecret(),
    {
      expiresIn: "30d"
    }
  );

}

function verifyAccessToken(token) {

  return jwt.verify(
    token,
    accessSecret()
  );

}

function verifyRefreshToken(token) {

  return jwt.verify(
    token,
    refreshSecret()
  );

}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  accessSecret,
  refreshSecret
};
