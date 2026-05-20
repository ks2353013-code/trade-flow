const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || "tradeflow_secret_key_123";
const MONGO_URL = process.env.MONGO_URL;
const SERPAPI_KEY = process.env.SERPAPI_KEY || "";

const MASTER_EMAIL = process.env.MASTER_EMAIL || "ks2353013@gmail.com";
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "TradeFlowMaster123";

if (!MONGO_URL) console.log("MongoDB error: MONGO_URL missing");

mongoose
  .connect(MONGO_URL)
  .then(async () => {
    console.log("MongoDB connected");
    await createMasterUser();
  })
  .catch((err) => console.log("MongoDB error:", err.message));

const Company = mongoose.model("Company", {
  name: String,
  status: String,
  plan: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", {
  name: String,
  email: String,
  password: String,
  role: String,
  companyId: String,
  createdAt: { type: Date, default: Date.now }
});

const Lead = mongoose.model("Lead", {
  companyId: String,
  user: String,
  name: String,
  phone: String,
  email: String,
  product: String,
  stage: String,
  type: String,
  source: String,
  website: String,
  score: Number,
  country: String
});

const Supplier = mongoose.model("Supplier", {
  companyId: String,
  user: String,
  name: String,
  price: String,
  phone: String,
  email: String,
  product: String,
  country: String
});

const Task = mongoose.model("Task", {
  companyId: String,
  user: String,
  task: String,
  status: String
});

const Deal = mongoose.model("Deal", {
  companyId: String,
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
  companyId: String,
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

async function createMasterUser() {
  const existing = await User.findOne({ email: MASTER_EMAIL });

  if (!existing) {
    const hash = await bcrypt.hash(MASTER_PASSWORD, 10);

    await User.create({
      name: "Master Owner",
      email: MASTER_EMAIL,
      password: hash,
      role: "master",
      companyId: ""
    });

    console.log("Master owner created:", MASTER_EMAIL);
  }
}

function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ error: "Not logged in" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    req.companyId = decoded.companyId || "";
    req.userName = decoded.name || "";
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireCompany(req, res, next) {
  if (!req.companyId) {
    return res.status(403).json({ error: "Company account required" });
  }
  next();
}

function requireCompanyAdmin(req, res, next) {
  if (req.userRole !== "company_admin") {
    return res.status(403).json({ error: "Company admin access required" });
  }
  next();
}

function requireMaster(req, res, next) {
  if (req.userRole !== "master") {
    return res.status(403).json({ error: "Master access required" });
  }
  next();
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
    source: "TradeFlow Fallback Demo",
    snippet: `${name} appears relevant for ${product || query} as a ${type} in ${country}.`,
    score: Math.floor(65 + Math.random() * 30)
  }));
}

async function searchRealWeb(query, type, product, country) {
  if (!SERPAPI_KEY) return fakeResearch(query, type, product, country);

  const searches = [
    { label: "Google", q: `${query} ${type} ${product} ${country} company contact` },
    { label: "IndiaMART", q: `site:indiamart.com ${product} ${type} ${country}` },
    { label: "TradeIndia", q: `site:tradeindia.com ${product} ${type} ${country}` },
    { label: "Alibaba", q: `site:alibaba.com ${product} ${type} ${country}` },
    { label: "LinkedIn", q: `site:linkedin.com/company ${product} ${type} ${country}` }
  ];

  let allResults = [];

  for (const source of searches) {
    try {
      const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
        source.q
      )}&api_key=${SERPAPI_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.organic_results) {
        const mapped = data.organic_results.slice(0, 4).map((item) => ({
          name: item.title || "Business Lead",
          type,
          product,
          country,
          website: item.link || "",
          source: source.label,
          snippet: item.snippet || "",
          score: scoreLead(`${item.title} ${item.snippet}`, product, type)
        }));

        allResults = allResults.concat(mapped);
      }
    } catch (err) {
      console.log(`${source.label} search error:`, err.message);
    }
  }

  if (!allResults.length) return fakeResearch(query, type, product, country);

  const unique = [];
  const seen = new Set();

  for (const lead of allResults) {
    if (lead.website && !seen.has(lead.website)) {
      seen.add(lead.website);
      unique.push(lead);
    }
  }

  unique.sort((a, b) => b.score - a.score);
  return unique.slice(0, 20);
}

function generateOutreach(name, product, type, template) {
  if (template === "followup") {
    return `Hello ${name},

Just following up regarding ${product || "export/import products"}.

Please let me know if you are interested, and I can share the next details.

Best regards,
TradeFlow Team`;
  }

  if (template === "buyer") {
    return `Hello ${name},

I am Krishna from TradeFlow AI™. We help buyers source verified suppliers for ${product || "export/import products"}.

I wanted to check if you are currently importing or sourcing this product. I can connect you with suitable suppliers.

Best regards,
TradeFlow Team`;
  }

  return `Hello ${name},

I am Krishna from TradeFlow AI™. We help connect verified suppliers and buyers for ${product || "export/import products"}.

I would like to explore a possible business opportunity with you. Kindly share your product details, pricing, MOQ, delivery timeline, and preferred communication method.

Best regards,
TradeFlow Team`;
}

/* HEALTH */
app.get("/", (req, res) => {
  res.json({ status: "TradeFlow AI backend running" });
});

/* AUTH */
app.get("/me", auth, async (req, res) => {
  let company = null;

  if (req.companyId) {
    company = await Company.findById(req.companyId);
  }

  res.json({
    email: req.userEmail,
    name: req.userName,
    role: req.userRole,
    companyId: req.companyId,
    companyName: company ? company.name : "Master"
  });
});

app.post("/signup-company", async (req, res) => {
  try {
    const { companyName, name, email, password } = req.body;

    if (!companyName || !name || !email || !password) {
      return res.json({ error: "All fields required" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.json({ error: "User already exists" });

    const company = await Company.create({
      name: companyName,
      status: "active",
      plan: "trial"
    });

    const hash = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hash,
      role: "company_admin",
      companyId: String(company._id)
    });

    res.json({ success: true });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.json({ error: "User not found" });

    if (role && user.role !== role) {
      return res.json({ error: "Wrong login type selected" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ error: "Wrong password" });

    if (user.companyId) {
      const company = await Company.findById(user.companyId);
      if (!company || company.status !== "active") {
        return res.json({ error: "Company account is not active" });
      }
    }

    const token = jwt.sign(
      {
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId
      },
      SECRET
    );

    res.json({ token, role: user.role });
  } catch (err) {
    res.json({ error: err.message });
  }
});

/* MASTER */
app.get("/master/companies", auth, requireMaster, async (req, res) => {
  const companies = await Company.find().sort({ createdAt: -1 });
  const output = [];

  for (const c of companies) {
    const users = await User.countDocuments({ companyId: String(c._id) });
    output.push({
      _id: c._id,
      name: c.name,
      status: c.status,
      plan: c.plan,
      users,
      createdAt: c.createdAt
    });
  }

  res.json(output);
});

app.put("/master/companies/:id", auth, requireMaster, async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) return res.json({ error: "Company not found" });

  company.status = req.body.status || company.status;
  company.plan = req.body.plan || company.plan;

  await company.save();
  res.json({ success: true });
});

/* COMPANY TEAM */
app.get("/team", auth, requireCompany, requireCompanyAdmin, async (req, res) => {
  const users = await User.find({ companyId: req.companyId }).select("-password");
  res.json(users);
});

app.post("/team", auth, requireCompany, requireCompanyAdmin, async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.json({ error: "Name, email and password required" });
  }

  const existing = await User.findOne({ email });
  if (existing) return res.json({ error: "Email already used" });

  const hash = await bcrypt.hash(password, 10);

  await User.create({
    name,
    email,
    password: hash,
    role: role === "company_admin" ? "company_admin" : "employee",
    companyId: req.companyId
  });

  res.json({ success: true });
});

/* AGENT */
app.post("/agent-command", auth, requireCompany, async (req, res) => {
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
    if (text.includes("usa")) buyerCountry = "USA";
    if (text.includes("uk")) buyerCountry = "UK";

    const suppliers = await searchRealWeb(`${product} suppliers ${supplierCountry}`, "supplier", product, supplierCountry);
    const buyers = await searchRealWeb(`${product} buyers importers ${buyerCountry}`, "buyer", product, buyerCountry);

    await ResearchLead.deleteMany({ companyId: req.companyId });

    const savedSuppliers = await ResearchLead.insertMany(
      suppliers.map((x) => ({ ...x, companyId: req.companyId, user: req.userEmail }))
    );

    const savedBuyers = await ResearchLead.insertMany(
      buyers.map((x) => ({ ...x, companyId: req.companyId, user: req.userEmail }))
    );

    const tasks = [
      `Review top ${product} suppliers from ${supplierCountry}`,
      `Contact top ${product} buyers in ${buyerCountry}`,
      `Prepare brokerage pitch for ${product}`,
      `Create first supplier-buyer deal opportunity`
    ];

    await Task.insertMany(
      tasks.map((task) => ({
        companyId: req.companyId,
        user: req.userEmail,
        task,
        status: "open"
      }))
    );

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
app.post("/research-leads", auth, requireCompany, async (req, res) => {
  try {
    const { query, type, product, country } = req.body;

    const results = await searchRealWeb(
      query || "",
      type || "supplier",
      product || "",
      country || ""
    );

    await ResearchLead.deleteMany({
      companyId: req.companyId,
      type: type || "supplier"
    });

    const saved = await ResearchLead.insertMany(
      results.map((x) => ({
        ...x,
        companyId: req.companyId,
        user: req.userEmail
      }))
    );

    res.json(saved);
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get("/research-leads", auth, requireCompany, async (req, res) => {
  res.json(await ResearchLead.find({ companyId: req.companyId }));
});

app.post("/add-research-to-crm", auth, requireCompany, async (req, res) => {
  const lead = req.body;

  await Lead.create({
    companyId: req.companyId,
    user: req.userEmail,
    name: lead.name,
    phone: "",
    email: "",
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

app.post("/matchmake", auth, requireCompany, async (req, res) => {
  const suppliers = await ResearchLead.find({ companyId: req.companyId, type: "supplier" });
  const buyers = await ResearchLead.find({ companyId: req.companyId, type: "buyer" });

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
app.get("/suppliers", auth, requireCompany, async (req, res) => {
  res.json(await Supplier.find({ companyId: req.companyId }));
});

app.post("/suppliers", auth, requireCompany, async (req, res) => {
  await Supplier.create({
    companyId: req.companyId,
    user: req.userEmail,
    name: req.body.name,
    price: req.body.price,
    phone: req.body.phone,
    email: req.body.email,
    product: req.body.product,
    country: req.body.country
  });

  res.json({ success: true });
});

/* LEADS */
app.get("/leads", auth, requireCompany, async (req, res) => {
  res.json(await Lead.find({ companyId: req.companyId }));
});

app.post("/leads", auth, requireCompany, async (req, res) => {
  await Lead.create({
    companyId: req.companyId,
    user: req.userEmail,
    name: req.body.name,
    phone: req.body.phone || "",
    email: req.body.email || "",
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

app.put("/leads/:id", auth, requireCompany, async (req, res) => {
  const lead = await Lead.findOne({
    _id: req.params.id,
    companyId: req.companyId
  });

  if (!lead) return res.json({ error: "Lead not found" });

  lead.stage = req.body.stage;
  await lead.save();

  res.json({ success: true });
});

/* TASKS */
app.get("/tasks", auth, requireCompany, async (req, res) => {
  res.json(await Task.find({ companyId: req.companyId }));
});

app.post("/tasks", auth, requireCompany, async (req, res) => {
  await Task.create({
    companyId: req.companyId,
    user: req.userEmail,
    task: req.body.task,
    status: "open"
  });

  res.json({ success: true });
});

/* DEALS */
app.get("/deals", auth, requireCompany, async (req, res) => {
  res.json(await Deal.find({ companyId: req.companyId }));
});

app.post("/deals", auth, requireCompany, async (req, res) => {
  const supplierPrice = Number(req.body.supplierPrice || 0);
  const buyerPrice = Number(req.body.buyerPrice || 0);
  const quantity = Number(req.body.quantity || 1);
  const margin = buyerPrice - supplierPrice;
  const totalProfit = margin * quantity;

  await Deal.create({
    companyId: req.companyId,
    user: req.userEmail,
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
app.post("/generate-message", auth, requireCompany, (req, res) => {
  const message = generateOutreach(
    req.body.name || "Supplier",
    req.body.product || "export/import products",
    req.body.type || "supplier",
    req.body.template || "intro"
  );

  res.json({ message });
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Backend running");
});