const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const ADMIN_EMAILS = [
  "ks2353013@gmail.com"
];

const PLAN_LIMITS = {
  FREE: { suppliers: 10, leads: 20, tasks: 20, documents: 10, outreachPerDay: 5 },
  STARTER: { suppliers: 100, leads: 250, tasks: 200, documents: 100, outreachPerDay: 50 },
  PRO: { suppliers: 1000, leads: 2500, tasks: 1000, documents: 1000, outreachPerDay: 300 },
  ENTERPRISE: { suppliers: 999999, leads: 999999, tasks: 999999, documents: 999999, outreachPerDay: 999999 }
};

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected Successfully"))
.catch((err) => {
  console.log("MongoDB Connection Error:", err.message);
  process.exit(1);
});

const User = mongoose.model("User", new mongoose.Schema({
  companyId: { type: String, required: true, index: true },
  companyName: { type: String, default: "TradeFlow Workspace" },
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "OWNER" },
  plan: { type: String, default: "FREE" },
  trialEndsAt: Date,
  subscriptionStatus: { type: String, default: "TRIAL" }
}, { timestamps: true }));

const Supplier = mongoose.model("Supplier", new mongoose.Schema({
  companyId: { type: String, required: true, index: true },
  companyName: String,
  contactPerson: String,
  email: String,
  phone: String,
  country: String,
  product: String,
  category: String,
  website: String,
  score: { type: Number, default: 70 },
  status: { type: String, default: "New Lead" }
}, { timestamps: true }));

const Lead = mongoose.model("Lead", new mongoose.Schema({
  companyId: { type: String, required: true, index: true },
  companyName: String,
  contactPerson: String,
  email: String,
  phone: String,
  country: String,
  product: String,
  source: String,
  stage: { type: String, default: "New" },
  value: { type: Number, default: 0 }
}, { timestamps: true }));

const Task = mongoose.model("Task", new mongoose.Schema({
  companyId: { type: String, required: true, index: true },
  title: String,
  description: String,
  dueDate: String,
  priority: { type: String, default: "Medium" },
  status: { type: String, default: "Pending" }
}, { timestamps: true }));

const Negotiation = mongoose.model("Negotiation", new mongoose.Schema({
  companyId: { type: String, required: true, index: true },
  supplierName: String,
  product: String,
  quotedPrice: Number,
  targetPrice: Number,
  margin: Number,
  status: { type: String, default: "Open" },
  notes: String
}, { timestamps: true }));

const Document = mongoose.model("Document", new mongoose.Schema({
  companyId: { type: String, required: true, index: true },
  title: String,
  type: String,
  partyName: String,
  status: { type: String, default: "Draft" },
  amount: Number,
  notes: String
}, { timestamps: true }));

const Usage = mongoose.model("Usage", new mongoose.Schema({
  companyId: { type: String, required: true, index: true },
  date: String,
  outreachCount: { type: Number, default: 0 }
}, { timestamps: true }));

const UpgradeRequest = mongoose.model("UpgradeRequest", new mongoose.Schema({
  companyId: String,
  companyName: String,
  userName: String,
  email: String,
  requestedPlan: String,
  price: Number,
  status: { type: String, default: "NEW" },
  notes: String
}, { timestamps: true }));

const LeadRequest = mongoose.model("LeadRequest", new mongoose.Schema({
  companyId: String,
  companyName: String,
  userName: String,
  email: String,
  product: String,
  country: String,
  leadCount: String,
  leadType: String,
  notes: String,
  status: { type: String, default: "NEW" }
}, { timestamps: true }));

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

function createToken(user) {
  return jwt.sign(
    {
      id: user._id,
      companyId: user.companyId,
      role: user.role,
      plan: user.plan,
      isAdmin: ADMIN_EMAILS.includes(user.email)
    },
    process.env.JWT_SECRET || "tradeflowsecret",
    { expiresIn: "7d" }
  );
}

function cleanUser(user) {
  return {
    id: user._id,
    companyId: user.companyId,
    companyName: user.companyName,
    name: user.name,
    email: user.email,
    role: user.role,
    plan: user.plan,
    trialEndsAt: user.trialEndsAt,
    subscriptionStatus: user.subscriptionStatus,
    isAdmin: ADMIN_EMAILS.includes(user.email)
  };
}

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please login." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "tradeflowsecret");

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    req.user = user;
    req.companyId = user.companyId;
    req.isAdmin = ADMIN_EMAILS.includes(user.email);

    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

const adminOnly = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Admin access only"
    });
  }
  next();
};

function limitCheck(type, Model) {
  return async (req, res, next) => {
    try {
      const plan = req.user.plan || "FREE";
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;

      const currentCount = await Model.countDocuments({ companyId: req.companyId });

      if (currentCount >= limits[type]) {
        return res.status(403).json({
          success: false,
          upgradeRequired: true,
          message: `Your ${plan} plan limit is reached for ${type}. Upgrade to continue.`,
          plan,
          limit: limits[type],
          current: currentCount
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
}

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, companyName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password are required" });
    }

    const exists = await User.findOne({ email });

    if (exists) {
      return res.status(400).json({ success: false, message: "User already exists. Please login." });
    }

    const companyId = new mongoose.Types.ObjectId().toString();
    const hashedPassword = await bcrypt.hash(password, 10);

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const user = await User.create({
      companyId,
      companyName: companyName || "TradeFlow Workspace",
      name,
      email,
      password: hashedPassword,
      role: ADMIN_EMAILS.includes(email) ? "ADMIN" : "OWNER",
      plan: "FREE",
      trialEndsAt,
      subscriptionStatus: "TRIAL"
    });

    res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      token: createToken(user),
      user: cleanUser(user),
      limits: PLAN_LIMITS[user.plan]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Registration failed", error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    res.json({
      success: true,
      message: "Login successful",
      token: createToken(user),
      user: cleanUser(user),
      limits: PLAN_LIMITS[user.plan]
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Login failed", error: error.message });
  }
});

app.get("/api/auth/me", protect, async (req, res) => {
  res.json({
    success: true,
    user: cleanUser(req.user),
    limits: PLAN_LIMITS[req.user.plan || "FREE"]
  });
});

app.post("/api/employees", protect, async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Employee name, email and password required" });
    }

    const exists = await User.findOne({ email });

    if (exists) {
      return res.status(400).json({ success: false, message: "Employee email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = await User.create({
      companyId: req.companyId,
      companyName: req.user.companyName,
      name,
      email,
      password: hashedPassword,
      role: role || "EMPLOYEE",
      plan: req.user.plan,
      trialEndsAt: req.user.trialEndsAt,
      subscriptionStatus: req.user.subscriptionStatus
    });

    res.status(201).json({
      success: true,
      message: "Employee added successfully",
      employee: cleanUser(employee)
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/employees", protect, async (req, res) => {
  try {
    const employees = await User.find({ companyId: req.companyId })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: employees.length, employees });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function createCrudRoutes(route, Model, name, limitType) {
  app.post(`/api/${route}`, protect, limitCheck(limitType, Model), async (req, res) => {
    try {
      const item = await Model.create({ ...req.body, companyId: req.companyId });
      res.status(201).json({ success: true, [name]: item });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get(`/api/${route}`, protect, async (req, res) => {
    try {
      const items = await Model.find({ companyId: req.companyId }).sort({ createdAt: -1 });
      res.json({ success: true, count: items.length, [route]: items });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.put(`/api/${route}/:id`, protect, async (req, res) => {
    try {
      const item = await Model.findOneAndUpdate(
        { _id: req.params.id, companyId: req.companyId },
        req.body,
        { new: true }
      );

      if (!item) return res.status(404).json({ success: false, message: `${name} not found` });

      res.json({ success: true, [name]: item });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.delete(`/api/${route}/:id`, protect, async (req, res) => {
    try {
      const item = await Model.findOneAndDelete({ _id: req.params.id, companyId: req.companyId });

      if (!item) return res.status(404).json({ success: false, message: `${name} not found` });

      res.json({ success: true, message: `${name} deleted successfully` });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

createCrudRoutes("suppliers", Supplier, "supplier", "suppliers");
createCrudRoutes("leads", Lead, "lead", "leads");
createCrudRoutes("tasks", Task, "task", "tasks");
createCrudRoutes("negotiations", Negotiation, "negotiation", "documents");
createCrudRoutes("documents", Document, "document", "documents");

app.post("/api/ai/lead-score", protect, (req, res) => {
  const score = Math.floor(Math.random() * 31) + 70;

  res.json({
    success: true,
    score,
    message: score > 85 ? "High quality verified lead" : "Good lead, needs follow-up"
  });
});

app.post("/api/ai/demo-leads", protect, async (req, res) => {
  const { product } = req.body;
  const selectedProduct = product || "Rice";

  const demoLeads = [
    {
      companyName: `${selectedProduct} Global Traders`,
      country: "UAE",
      email: `sales@${selectedProduct.toLowerCase()}global.com`,
      phone: "971500000000",
      product: selectedProduct,
      source: "AI Demo Finder",
      score: 88
    },
    {
      companyName: `${selectedProduct} Import House`,
      country: "Singapore",
      email: `buyer@${selectedProduct.toLowerCase()}import.com`,
      phone: "6590000000",
      product: selectedProduct,
      source: "AI Demo Finder",
      score: 84
    },
    {
      companyName: `${selectedProduct} Wholesale Buyers`,
      country: "Saudi Arabia",
      email: `procurement@${selectedProduct.toLowerCase()}buyers.com`,
      phone: "966500000000",
      product: selectedProduct,
      source: "AI Demo Finder",
      score: 91
    }
  ];

  res.json({
    success: true,
    leads: demoLeads,
    message: "Demo leads generated. Connect real lead APIs later."
  });
});

app.post("/api/outreach/email", protect, async (req, res) => {
  try {
    const plan = req.user.plan || "FREE";
    const limit = PLAN_LIMITS[plan].outreachPerDay;

    const usage = await Usage.findOneAndUpdate(
      { companyId: req.companyId, date: todayKey() },
      { $setOnInsert: { outreachCount: 0 } },
      { upsert: true, new: true }
    );

    if (usage.outreachCount >= limit) {
      return res.status(403).json({
        success: false,
        upgradeRequired: true,
        message: `Daily outreach limit reached for ${plan} plan. Upgrade to continue.`
      });
    }

    usage.outreachCount += 1;
    await usage.save();

    res.json({
      success: true,
      message: "Email outreach simulated successfully",
      usage: { usedToday: usage.outreachCount, limit }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/outreach/whatsapp", protect, async (req, res) => {
  try {
    const { phone, message } = req.body;
    const plan = req.user.plan || "FREE";
    const limit = PLAN_LIMITS[plan].outreachPerDay;

    const usage = await Usage.findOneAndUpdate(
      { companyId: req.companyId, date: todayKey() },
      { $setOnInsert: { outreachCount: 0 } },
      { upsert: true, new: true }
    );

    if (usage.outreachCount >= limit) {
      return res.status(403).json({
        success: false,
        upgradeRequired: true,
        message: `Daily outreach limit reached for ${plan} plan. Upgrade to continue.`
      });
    }

    usage.outreachCount += 1;
    await usage.save();

    const cleanPhone = String(phone || "").replace(/\D/g, "");
    const link = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message || "Hello from TradeFlow")}`;

    res.json({
      success: true,
      message: "WhatsApp link generated",
      link,
      usage: { usedToday: usage.outreachCount, limit }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/billing/plans", async (req, res) => {
  res.json({
    success: true,
    plans: [
      { id: "FREE", name: "Free", price: 0, currency: "INR", features: ["10 suppliers", "20 CRM leads", "20 tasks", "10 documents", "5 outreach/day"] },
      { id: "STARTER", name: "Starter", price: 999, currency: "INR", features: ["100 suppliers", "250 CRM leads", "200 tasks", "100 documents", "50 outreach/day"] },
      { id: "PRO", name: "Pro", price: 4999, currency: "INR", features: ["1000 suppliers", "2500 CRM leads", "1000 tasks", "1000 documents", "300 outreach/day", "AI growth insights"] },
      { id: "ENTERPRISE", name: "Enterprise", price: 25000, currency: "INR", features: ["Unlimited usage", "Team workspace", "Custom automation", "Priority support"] }
    ]
  });
});

app.post("/api/billing/request-upgrade", protect, async (req, res) => {
  try {
    const { requestedPlan, price, notes } = req.body;

    const request = await UpgradeRequest.create({
      companyId: req.companyId,
      companyName: req.user.companyName,
      userName: req.user.name,
      email: req.user.email,
      requestedPlan,
      price,
      notes,
      status: "NEW"
    });

    res.status(201).json({
      success: true,
      message: "Upgrade request submitted successfully",
      request
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/billing/upgrade-demo", protect, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!["FREE", "STARTER", "PRO", "ENTERPRISE"].includes(plan)) {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }

    await User.updateMany(
      { companyId: req.companyId },
      {
        plan,
        subscriptionStatus: plan === "FREE" ? "TRIAL" : "ACTIVE"
      }
    );

    const updatedUser = await User.findById(req.user._id);
    const token = createToken(updatedUser);

    res.json({
      success: true,
      message: `Workspace upgraded to ${plan}`,
      token,
      user: cleanUser(updatedUser),
      limits: PLAN_LIMITS[plan]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/lead-requests", protect, async (req, res) => {
  try {
    const { product, country, leadCount, leadType, notes } = req.body;

    const request = await LeadRequest.create({
      companyId: req.companyId,
      companyName: req.user.companyName,
      userName: req.user.name,
      email: req.user.email,
      product,
      country,
      leadCount,
      leadType,
      notes,
      status: "NEW"
    });

    res.status(201).json({
      success: true,
      message: "Lead request submitted successfully",
      request
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/dashboard/stats", protect, async (req, res) => {
  try {
    const [users, suppliers, leads, tasks, negotiations, documents] = await Promise.all([
      User.countDocuments({ companyId: req.companyId }),
      Supplier.countDocuments({ companyId: req.companyId }),
      Lead.countDocuments({ companyId: req.companyId }),
      Task.countDocuments({ companyId: req.companyId }),
      Negotiation.countDocuments({ companyId: req.companyId }),
      Document.countDocuments({ companyId: req.companyId })
    ]);

    const usage = await Usage.findOne({ companyId: req.companyId, date: todayKey() });
    const plan = req.user.plan || "FREE";

    res.json({
      success: true,
      company: {
        companyId: req.companyId,
        companyName: req.user.companyName,
        plan,
        subscriptionStatus: req.user.subscriptionStatus,
        trialEndsAt: req.user.trialEndsAt
      },
      stats: {
        users,
        employees: users,
        suppliers,
        leads,
        tasks,
        negotiations,
        documents
      },
      usage: {
        outreachToday: usage?.outreachCount || 0,
        limits: PLAN_LIMITS[plan]
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/* ======================
   ADMIN OS ROUTES
====================== */

app.get("/api/admin/overview", protect, adminOnly, async (req, res) => {
  try {
    const [
      users,
      companies,
      suppliers,
      leads,
      tasks,
      documents,
      upgradeRequests,
      leadRequests
    ] = await Promise.all([
      User.countDocuments(),
      User.distinct("companyId"),
      Supplier.countDocuments(),
      Lead.countDocuments(),
      Task.countDocuments(),
      Document.countDocuments(),
      UpgradeRequest.countDocuments(),
      LeadRequest.countDocuments()
    ]);

    res.json({
      success: true,
      overview: {
        users,
        companies: companies.length,
        suppliers,
        leads,
        tasks,
        documents,
        upgradeRequests,
        leadRequests
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/admin/companies", protect, adminOnly, async (req, res) => {
  try {
    const companies = await User.aggregate([
      {
        $group: {
          _id: "$companyId",
          companyName: { $first: "$companyName" },
          plan: { $first: "$plan" },
          subscriptionStatus: { $first: "$subscriptionStatus" },
          users: { $sum: 1 },
          createdAt: { $min: "$createdAt" }
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json({ success: true, companies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/admin/users", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/admin/company/:companyId/plan", protect, adminOnly, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!["FREE", "STARTER", "PRO", "ENTERPRISE"].includes(plan)) {
      return res.status(400).json({ success: false, message: "Invalid plan" });
    }

    await User.updateMany(
      { companyId: req.params.companyId },
      {
        plan,
        subscriptionStatus: plan === "FREE" ? "TRIAL" : "ACTIVE"
      }
    );

    res.json({
      success: true,
      message: `Company plan changed to ${plan}`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/admin/upgrade-requests", protect, adminOnly, async (req, res) => {
  try {
    const requests = await UpgradeRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/admin/upgrade-requests/:id", protect, adminOnly, async (req, res) => {
  try {
    const request = await UpgradeRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/admin/lead-requests", protect, adminOnly, async (req, res) => {
  try {
    const requests = await LeadRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/admin/lead-requests/:id", protect, adminOnly, async (req, res) => {
  try {
    const request = await LeadRequest.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/", (req, res) => {
  res.json({
    status: "TradeFlow AI backend running",
    mode: "Admin OS + Money-ready SaaS backend",
    admin: "enabled"
  });
});

app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Server Working"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});