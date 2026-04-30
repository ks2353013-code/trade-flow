const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || "tradeflow_secret_key_123";
const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://ks2353013_db_user:Krish1808@cluster0.n4jxd4z.mongodb.net/tradeflow?retryWrites=true&w=majority";

const SERPAPI_KEY = process.env.SERPAPI_KEY || "";

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err.message));

const User = mongoose.model("User", {
  email: String,
  password: String
});

const Lead = mongoose.model("Lead", {
  user: String,
  name: String,
  phone: String,
  product: String,
  stage: String,
  type: String,
  source: String,
  website: String,
  score: Number,
  country: String
});

const Supplier = mongoose.model("Supplier", {
  user: String,
  name: String,
  price: String,
  phone: String,
  product: String,
  country: String
});

const Task = mongoose.model("Task", {
  user: String,
  task: String,
  status: String
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
  totalProfit: Number,
  status: String,
  notes: String
});

const ResearchLead = mongoose.model("ResearchLead", {
  user: String,
  name: String,
  type: String,
  product: String,
  country: String,
  website: String,
  source: String,
  snippet: String,
  score: Number
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

function scoreLead(text, product, type) {
  let score = 45;
  const lower = String(text || "").toLowerCase();

  if (product && lower.includes(product.toLowerCase())) score += 20;

  if (
    type === "supplier" &&
    /supplier|manufacturer|exporter|factory|producer|wholesale|trader/.test(lower)
  ) {
    score += 25;
  }

  if (
    type === "buyer" &&
    /buyer|importer|distributor|procurement|wholesale|retailer|trader/.test(lower)
  ) {
    score += 25;
  }

  if (/contact|phone|email|website|company|export|import/.test(lower)) score += 10;

  return Math.min(score, 100);
}

async function searchRealWeb(query, type, product, country) {
  if (!SERPAPI_KEY) {
    return fakeResearch(query, type, product, country);
  }

  const searchQuery = `${query} ${type} ${product} ${country} company contact`;
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
    searchQuery
  )}&api_key=${SERPAPI_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.organic_results) {
    return fakeResearch(query, type, product, country);
  }

  return data.organic_results.slice(0, 10).map((item) => ({
    name: item.title || "Business Lead",
    type,
    product,
    country,
    website: item.link || "",
    source: "SerpAPI Google Search",
    snippet: item.snippet || "",
    score: scoreLead(`${item.title} ${item.snippet}`, product, type)
  }));
}

function fakeResearch(query, type, product, country) {
  const companies = [
    "Global Trade Exports",
    "Prime Agro International",
    "Royal Basmati Traders",
    "Sunrise Import Group",
    "Elite Global Suppliers",
    "Dubai Food Importers",
    "GreenField Export House",
    "Asia Commodity Hub",
    "FreshGrain International",
    "Golden Harvest Trading"
  ];

  return companies.map((name) => ({
    name: `${name} - ${product || query}`,
    type,
    product,
    country,
    website: `https://www.${name.toLowerCase().replace(/\s/g, "")}.com`,
    source: "TradeFlow Agent Fallback",
    snippet: `${name} appears relevant for ${product || query} as a ${type} in ${country}.`,
    score: Math.floor(65 + Math.random() * 30)
  }));
}

function generateOutreach(name, product, type) {
  return `Hello ${name},

I am Krishna from TradeFlow. We help connect verified suppliers and buyers for ${product || "export/import products"}.

I would like to explore a possible business opportunity with you. Kindly share your product details, pricing, MOQ, delivery timeline, and preferred communication method.

Best regards,
TradeFlow Team`;
}

/* AUTH */
app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.json({ error: "Email and password required" });

    const exists = await User.findOne({ email });
    if (exists) return res.json({ error: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashed });

    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ error: "Wrong password" });

    const token = jwt.sign({ email }, SECRET);
    res.json({ token });
  } catch (err) {
    res.json({ error: err.message });
  }
});

/* AI AGENT COMMAND CENTER */
app.post("/agent-command", auth, async (req, res) => {
  try {
    const { command } = req.body;
    const text = String(command || "").toLowerCase();

    let product = "general products";
    if (text.includes("rice")) product = "rice";
    if (text.includes("basmati")) product = "basmati rice";
    if (text.includes("textile")) product = "textiles";
    if (text.includes("spice")) product = "spices";
    if (text.includes("onion")) product = "onions";

    let supplierCountry = "India";
    let buyerCountry = "Dubai";

    if (text.includes("uae")) buyerCountry = "UAE";
    if (text.includes("dubai")) buyerCountry = "Dubai";
    if (text.includes("india")) supplierCountry = "India";
    if (text.includes("usa")) buyerCountry = "USA";
    if (text.includes("uk")) buyerCountry = "UK";

    const supplierQuery = `${product} suppliers ${supplierCountry}`;
    const buyerQuery = `${product} buyers importers ${buyerCountry}`;

    const suppliers = await searchRealWeb(supplierQuery, "supplier", product, supplierCountry);
    const buyers = await searchRealWeb(buyerQuery, "buyer", product, buyerCountry);

    await ResearchLead.deleteMany({ user: req.user });

    const savedSuppliers = await ResearchLead.insertMany(
      suppliers.map((x) => ({ ...x, user: req.user }))
    );

    const savedBuyers = await ResearchLead.insertMany(
      buyers.map((x) => ({ ...x, user: req.user }))
    );

    const tasks = [
      `Review top ${product} suppliers from ${supplierCountry}`,
      `Contact top ${product} buyers in ${buyerCountry}`,
      `Prepare brokerage pitch for ${product}`,
      `Create first supplier-buyer deal opportunity`
    ];

    await Task.insertMany(tasks.map((task) => ({ user: req.user, task, status: "open" })));

    const matches = [];

    savedSuppliers.slice(0, 5).forEach((s) => {
      savedBuyers.slice(0, 5).forEach((b) => {
        matches.push({
          supplier: s,
          buyer: b,
          score: Math.min(100, Math.floor((s.score + b.score) / 2)),
          reason: `${s.name} may supply ${product}; ${b.name} may be a potential buyer/importer.`
        });
      });
    });

    matches.sort((a, b) => b.score - a.score);

    res.json({
      product,
      supplierCountry,
      buyerCountry,
      suppliers: savedSuppliers,
      buyers: savedBuyers,
      matches: matches.slice(0, 5),
      tasks
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

/* RESEARCH */
app.post("/research-leads", auth, async (req, res) => {
  try {
    const { query, type, product, country } = req.body;

    const results = await searchRealWeb(
      query || "",
      type || "supplier",
      product || "",
      country || ""
    );

    await ResearchLead.deleteMany({ user: req.user, type: type || "supplier" });

    const saved = await ResearchLead.insertMany(
      results.map((x) => ({ ...x, user: req.user }))
    );

    res.json(saved);
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get("/research-leads", auth, async (req, res) => {
  const data = await ResearchLead.find({ user: req.user });
  res.json(data);
});

app.post("/add-research-to-crm", auth, async (req, res) => {
  const lead = req.body;

  await Lead.create({
    user: req.user,
    name: lead.name,
    phone: "",
    product: lead.product || "",
    stage: "new",
    type: lead.type || "buyer",
    source: lead.source || "research",
    website: lead.website || "",
    score: lead.score || 50,
    country: lead.country || ""
  });

  res.json({ success: true });
});

/* MATCHMAKER */
app.post("/matchmake", auth, async (req, res) => {
  const suppliers = await ResearchLead.find({ user: req.user, type: "supplier" });
  const buyers = await ResearchLead.find({ user: req.user, type: "buyer" });

  const matches = [];

  suppliers.forEach((supplier) => {
    buyers.forEach((buyer) => {
      matches.push({
        supplier,
        buyer,
        score: Math.min(100, Math.floor((supplier.score + buyer.score) / 2)),
        reason: `${supplier.name} may supply ${supplier.product}; ${buyer.name} may buy/import similar products.`
      });
    });
  });

  matches.sort((a, b) => b.score - a.score);
  res.json(matches.slice(0, 10));
});

/* SUPPLIERS */
app.get("/suppliers", auth, async (req, res) => {
  res.json(await Supplier.find({ user: req.user }));
});

app.post("/suppliers", auth, async (req, res) => {
  await Supplier.create({
    user: req.user,
    name: req.body.name,
    price: req.body.price,
    phone: req.body.phone,
    product: req.body.product,
    country: req.body.country
  });

  res.json({ success: true });
});

/* LEADS */
app.get("/leads", auth, async (req, res) => {
  res.json(await Lead.find({ user: req.user }));
});

app.post("/leads", auth, async (req, res) => {
  await Lead.create({
    user: req.user,
    name: req.body.name,
    phone: req.body.phone || "",
    product: req.body.product || "",
    stage: "new",
    type: req.body.type || "buyer",
    source: req.body.source || "manual",
    website: req.body.website || "",
    score: req.body.score || 50,
    country: req.body.country || ""
  });

  res.json({ success: true });
});

app.put("/leads/:index", auth, async (req, res) => {
  const leads = await Lead.find({ user: req.user });
  const lead = leads[req.params.index];

  if (!lead) return res.json({ error: "Lead not found" });

  lead.stage = req.body.stage;
  await lead.save();

  res.json({ success: true });
});

/* TASKS */
app.get("/tasks", auth, async (req, res) => {
  res.json(await Task.find({ user: req.user }));
});

app.post("/tasks", auth, async (req, res) => {
  await Task.create({
    user: req.user,
    task: req.body.task,
    status: "open"
  });

  res.json({ success: true });
});

/* DEALS */
app.get("/deals", auth, async (req, res) => {
  res.json(await Deal.find({ user: req.user }));
});

app.post("/deals", auth, async (req, res) => {
  const supplierPrice = Number(req.body.supplierPrice || 0);
  const buyerPrice = Number(req.body.buyerPrice || 0);
  const quantity = Number(req.body.quantity || 1);
  const margin = buyerPrice - supplierPrice;
  const totalProfit = margin * quantity;

  await Deal.create({
    user: req.user,
    supplierName: req.body.supplierName,
    buyerName: req.body.buyerName,
    product: req.body.product,
    supplierPrice,
    buyerPrice,
    quantity,
    margin,
    totalProfit,
    status: req.body.status || "Negotiation",
    notes: req.body.notes || ""
  });

  res.json({ success: true });
});

/* OUTREACH */
app.post("/generate-message", auth, (req, res) => {
  const message = generateOutreach(
    req.body.name || "Supplier",
    req.body.product || "export/import products",
    req.body.type || "supplier"
  );

  res.json({ message });
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Backend running");
});