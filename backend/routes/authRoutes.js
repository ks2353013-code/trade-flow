const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role || "Owner"
    },
    process.env.JWT_SECRET || "tradeflow_secret",
    {
      expiresIn: "7d"
    }
  );
}

router.post("/signup", async (req, res) => {
  try {
    const {
      name,
      email,
      password
    } = req.body;

    const user = {
      id: Date.now().toString(),
      name,
      email,
      role: "Owner"
    };

    const token = createToken(user);

    res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Signup failed"
    });
  }
});

router.post("/login", async (req, res) => {
  try {
    const {
      email
    } = req.body;

    const user = {
      id: Date.now().toString(),
      email,
      role: "Owner"
    };

    const token = createToken(user);

    res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed"
    });
  }
});

module.exports = router;