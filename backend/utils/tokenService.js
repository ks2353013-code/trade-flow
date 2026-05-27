const jwt = require("jsonwebtoken");

function accessSecret() {
  return (
    process.env.JWT_SECRET ||
    "tradeflow_access_secret"
  );
}

function refreshSecret() {
  return (
    process.env.JWT_REFRESH_SECRET ||
    "tradeflow_refresh_secret"
  );
}

function generateAccessToken(user) {

  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role || "Owner"
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
      email: user.email
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
  verifyRefreshToken
};