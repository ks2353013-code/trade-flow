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
  "mongodb+srv://ks2353013_db_user:Krish1808@cluster0.n4jxd4z.mongodb.net/tradeflow?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB error:", err.message));

const User = mongoose.model("User", {
  email: String,
  password: String
});

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
  stage: String,
  type: String,
  source: String,
  website: String,
  score: Number
});

const Task = mongoose.model("Task", {
  user: String,
  task: String
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

app.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ error: "Email and password required" });

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashedPassword });

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

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.json({ error: "Wrong password" });

    const token = jwt.sign({ email }, SECRET);
    res.json({ token });
  } catch (err) {
    res.json({ error: err.message });
  }
});

function auth(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.json({ error: "Not logged in" });

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded.email;
    next();
  } catch {
    res.json({ error: "Invalid token" });
  }
}

app.get("/suppliers", auth, async (req, res) => {
  const suppliers = await Supplier.find({ user: req.user });
  res.json(suppliers);
});

app.post("/suppliers", auth, async (req, res) => {
  await Supplier.create({
    user: req.user,
    name: req.body.name,
    price: req.body.price,
    phone: req.body.phone
  });

  res.json({ success: true });
});

app.get("/leads", auth, async (req, res) => {
  const leads = await Lead.find({ user: req.user });
  res.json(leads);
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
    score: req.body.score || 50
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

app.post("/generate-message", auth, (req, res) => {
  const name = req.body.name || "Supplier";
  const product = req.body.product || "export/import products";

  const message = `Hello ${name},

I am Krishna from TradeFlow. We help connect verified suppliers and buyers for ${product}. I would like to explore a possible business opportunity with you.

Kindly share your product details, pricing, MOQ, and delivery timeline.

Best regards,
TradeFlow Team`;

  res.json({ message });
});

function cleanText(text) {
  return String(text || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .trim();
}

function scoreLead(text, product, type) {
  let score = 40;
  const lower = text.toLowerCase();

  if (product && lower.includes(product.toLowerCase())) score += 20;
  if (type === "supplier" && /exporter|manufacturer|supplier|wholesale|factory|producer/.test(lower)) score += 25;
  if (type === "buyer" && /importer|buyer|distributor|trader|wholesale|procurement/.test(lower)) score += 25;
  if (/contact|phone|email|website|company/.test(lower)) score += 10;

  return Math.min(score, 100);
}

async function researchWeb(query, type, product, country) {
  const finalQuery = `${query} ${type} ${product} ${country} company contact`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(finalQuery)}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const html = await response.text();
  const results = [];
  const blocks = html.split("result__body").slice(1, 8);

  for (const block of blocks) {
    const titleMatch = block.match(/class="result__a"[^>]*>(.*?)<\/a>/);
    const linkMatch = block.match(/href="(https?:\/\/[^"]+)"/);
    const snippetMatch = block.match(/class="result__snippet"[^>]*>(.*?)<\/a>|class="result__snippet"[^>]*>(.*?)<\/div>/);

    const title = cleanText(titleMatch ? titleMatch[1] : "Business Lead");
    const website = linkMatch ? cleanText(linkMatch[1]) : "";
    const snippet = cleanText(snippetMatch ? (snippetMatch[1] || snippetMatch[2]) : "");

    if (title && website) {
      results.push({
        name: title,
        type,
        product,
        country,
        website,
        source: "web research",
        snippet,
        score: scoreLead(`${title} ${snippet}`, product, type)
      });
    }
  }

  return results;
}

app.post("/research-leads", auth, async (req, res) => {
  try {
    const { query, type, product, country } = req.body;

    const results = await researchWeb(
      query || "",
      type || "supplier",
      product || "",
      country || ""
    );

    await ResearchLead.deleteMany({ user: req.user });

    const saved = await ResearchLead.insertMany(
      results.map((r) => ({
        ...r,
        user: req.user
      }))
    );

    res.json(saved);
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get("/research-leads", auth, async (req, res) => {
  const leads = await ResearchLead.find({ user: req.user });
  res.json(leads);
});

app.post("/add-research-to-crm", auth, async (req, res) => {
  const lead = req.body;

  await Lead.create({
    user: req.user,
    name: lead.name,
    phone: "",
    product: lead.product || "",
    stage: "new",
    type: lead.type || "supplier",
    source: lead.source || "research",
    website: lead.website || "",
    score: lead.score || 50
  });

  res.json({ success: true });
});

app.post("/matchmake", auth, async (req, res) => {
  const { product, country } = req.body;

  const suppliers = await ResearchLead.find({ user: req.user, type: "supplier" });
  const buyers = await ResearchLead.find({ user: req.user, type: "buyer" });

  const matches = [];

  suppliers.forEach((supplier) => {
    buyers.forEach((buyer) => {
      let score = 40;

      if (product && supplier.product === product && buyer.product === product) score += 30;
      if (country && supplier.country === country) score += 10;
      score += Math.floor((supplier.score + buyer.score) / 10);

      matches.push({
        supplier,
        buyer,
        score: Math.min(score, 100),
        reason: `${supplier.name} may supply ${product || "this product"} and ${buyer.name} may be a potential buyer/importer.`
      });
    });
  });

  matches.sort((a, b) => b.score - a.score);
  res.json(matches.slice(0, 10));
});

app.get("/deals", auth, async (req, res) => {
  const deals = await Deal.find({ user: req.user });
  res.json(deals);
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

app.put("/deals/:id", auth, async (req, res) => {
  const deal = await Deal.findOne({ _id: req.params.id, user: req.user });

  if (!deal) return res.json({ error: "Deal not found" });

  deal.status = req.body.status || deal.status;
  deal.notes = req.body.notes || deal.notes;

  await deal.save();

  res.json({ success: true });
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Backend running");
});