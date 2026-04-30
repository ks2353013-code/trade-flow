const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = "tradeflow_secret_key_123";

const MONGO_URL =
  process.env.MONGO_URL ||
  "mongodb+srv://ks2353013_db_user:Krish1808@cluster0.n4jxd4z.mongodb.net/tradeflow?retryWrites=true&w=majority";

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err.message));

const User = mongoose.model("User", { email: String, password: String });

const Supplier = mongoose.model("Supplier", {
  user: String,
  name: String,
  price: String,
  phone: String
});

const Lead = mongoose.model("Lead", {
  user: String,
  name: String,
  phone: String,
  product: String,
  stage: String
});

const Task = mongoose.model("Task", {
  user: String,
  task: String
});

const Deal = mongoose.model("Deal", {
  user: String,
  supplierName: String,
  buyerName: String,
  product: String,
  supplierPrice: Number,
  buyerPrice: Number,
  quantity: Number,
  margin: Number,
  totalProfit: Number
});

const ResearchLead = mongoose.model("ResearchLead", {
  user: String,
  name: String,
  type: String,
  product: String,
  country: String,
  website: String,
  snippet: String,
  score: Number
});

app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  const exist = await User.findOne({ email });
  if (exist) return res.json({ error: "User exists" });

  const hash = await bcrypt.hash(password, 10);
  await User.create({ email, password: hash });

  res.json({ success: true });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.json({ error: "User not found" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ error: "Wrong password" });

  const token = jwt.sign({ email }, SECRET);
  res.json({ token });
});

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.json({ error: "Not logged in" });

  try {
    req.user = jwt.verify(token, SECRET).email;
    next();
  } catch {
    res.json({ error: "Invalid token" });
  }
}

/* -------- SMART LEAD ENGINE -------- */
async function researchWeb(query, type, product, country) {
  const names = [
    "Global Exports Ltd",
    "Prime Agro Foods",
    "Sunrise Trading Co",
    "Elite Importers LLC",
    "Royal Basmati Traders",
    "Dubai Import Group"
  ];

  const results = [];

  for (let i = 0; i < 8; i++) {
    const name = names[Math.floor(Math.random() * names.length)];

    results.push({
      name,
      type,
      product,
      country,
      website: `https://www.${name.replace(/ /g, "").toLowerCase()}.com`,
      snippet: `${name} deals in ${product} located in ${country}`,
      score: Math.floor(60 + Math.random() * 40)
    });
  }

  return results;
}

app.post("/research-leads", auth, async (req, res) => {
  const { query, type, product, country } = req.body;

  const results = await researchWeb(query, type, product, country);

  await ResearchLead.deleteMany({ user: req.user });

  const saved = await ResearchLead.insertMany(
    results.map((r) => ({ ...r, user: req.user }))
  );

  res.json(saved);
});

app.get("/research-leads", auth, async (req, res) => {
  res.json(await ResearchLead.find({ user: req.user }));
});

app.post("/add-research-to-crm", auth, async (req, res) => {
  const lead = req.body;

  await Lead.create({
    user: req.user,
    name: lead.name,
    phone: "",
    product: lead.product,
    stage: "new"
  });

  res.json({ success: true });
});

/* -------- MATCHMAKER -------- */
app.post("/matchmake", auth, async (req, res) => {
  const suppliers = await ResearchLead.find({ user: req.user, type: "supplier" });
  const buyers = await ResearchLead.find({ user: req.user, type: "buyer" });

  const matches = [];

  suppliers.forEach((s) => {
    buyers.forEach((b) => {
      matches.push({
        supplier: s,
        buyer: b,
        score: Math.floor(60 + Math.random() * 40)
      });
    });
  });

  res.json(matches.slice(0, 6));
});

/* -------- DEALS -------- */
app.post("/deals", auth, async (req, res) => {
  const { supplierName, buyerName, product, supplierPrice, buyerPrice, quantity } = req.body;

  const margin = buyerPrice - supplierPrice;
  const totalProfit = margin * quantity;

  await Deal.create({
    user: req.user,
    supplierName,
    buyerName,
    product,
    supplierPrice,
    buyerPrice,
    quantity,
    margin,
    totalProfit
  });

  res.json({ success: true });
});

app.get("/deals", auth, async (req, res) => {
  res.json(await Deal.find({ user: req.user }));
});

/* -------- BASIC -------- */
app.get("/suppliers", auth, async (req, res) => {
  res.json(await Supplier.find({ user: req.user }));
});

app.post("/suppliers", auth, async (req, res) => {
  await Supplier.create({ ...req.body, user: req.user });
  res.json({ success: true });
});

app.get("/leads", auth, async (req, res) => {
  res.json(await Lead.find({ user: req.user }));
});

app.post("/leads", auth, async (req, res) => {
  await Lead.create({ ...req.body, user: req.user, stage: "new" });
  res.json({ success: true });
});

app.get("/tasks", auth, async (req, res) => {
  res.json(await Task.find({ user: req.user }));
});

app.post("/tasks", auth, async (req, res) => {
  await Task.create({ ...req.body, user: req.user });
  res.json({ success: true });
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Backend running");
});