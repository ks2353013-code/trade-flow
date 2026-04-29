const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const app = express();

app.use(cors());
app.use(express.json());

const SECRET = "tradeflow_secret_key_123";

// IMPORTANT: paste your MongoDB Atlas connection URL here
const MONGO_URL = "mongodb://ks2353013_db_user:Krish1808@ac-y7hjs08-shard-00-00.n4jxd4z.mongodb.net:27017,ac-y7hjs08-shard-00-01.n4jxd4z.mongodb.net:27017,ac-y7hjs08-shard-00-02.n4jxd4z.mongodb.net:27017/tradeflow?ssl=true&replicaSet=atlas-t5wg8t-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err.message));

// MODELS
const User = mongoose.model("User", {
  email: String,
  password: String
});

const Supplier = mongoose.model("Supplier", {
  user: String,
  name: String,
  price: String
});

const Lead = mongoose.model("Lead", {
  user: String,
  name: String,
  stage: String
});

const Task = mongoose.model("Task", {
  user: String,
  task: String
});

// AUTH
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ error: "Email and password required" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      email,
      password: hashedPassword
    });

    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ error: "User not found" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.json({ error: "Wrong password" });
    }

    const token = jwt.sign({ email }, SECRET);

    res.json({ token });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// AUTH MIDDLEWARE
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.json({ error: "Not logged in" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded.email;
    next();
  } catch {
    res.json({ error: "Invalid token" });
  }
}

// SUPPLIERS
app.get("/suppliers", auth, async (req, res) => {
  const suppliers = await Supplier.find({ user: req.user });
  res.json(suppliers);
});

app.post("/suppliers", auth, async (req, res) => {
  await Supplier.create({
    user: req.user,
    name: req.body.name,
    price: req.body.price
  });

  res.json({ success: true });
});

// LEADS
app.get("/leads", auth, async (req, res) => {
  const leads = await Lead.find({ user: req.user });
  res.json(leads);
});

app.post("/leads", auth, async (req, res) => {
  await Lead.create({
    user: req.user,
    name: req.body.name,
    stage: "new"
  });

  res.json({ success: true });
});

app.put("/leads/:index", auth, async (req, res) => {
  const leads = await Lead.find({ user: req.user });
  const lead = leads[req.params.index];

  if (!lead) {
    return res.json({ error: "Lead not found" });
  }

  lead.stage = req.body.stage;
  await lead.save();

  res.json({ success: true });
});

// TASKS
app.get("/tasks", auth, async (req, res) => {
  const tasks = await Task.find({ user: req.user });
  res.json(tasks);
});

app.post("/tasks", auth, async (req, res) => {
  await Task.create({
    user: req.user,
    task: req.body.task
  });

  res.json({ success: true });
});

// FAKE AI MESSAGE
app.post("/generate-message", auth, (req, res) => {
  const name = req.body.name || "Supplier";

  const message = `Hello ${name},

We are interested in exploring a potential export/import partnership with your company. Kindly share your product catalog, pricing, MOQ, and delivery timelines.

Looking forward to your response.

Best regards,
TradeFlow Team`;

  res.json({ message });
});

// SERVER
app.listen(process.env.PORT || 5000, () => {
  console.log("Backend running on http://localhost:5000");
});