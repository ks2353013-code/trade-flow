require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const compression = require("compression");
const http = require("http");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");

const { initSocketServer } = require("./socket/socketServer");
const connectDB = require("./config/db");

const authMiddleware = require("./middleware/authMiddleware");
const tenantMiddleware = require("./middleware/tenantMiddleware");

const supplierRoutes = require("./routes/supplierRoutes");
const authRoutes = require("./routes/authRoutes");
const dealRoutes = require("./routes/dealRoutes");
const aiRoutes = require("./routes/aiRoutes");
const taskRoutes = require("./routes/taskRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const outreachRoutes = require("./routes/outreachRoutes");
const outreachEmailRoutes = require("./routes/outreachEmailRoutes");
const emailRoutes = require("./routes/emailRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const activityRoutes = require("./routes/activityRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const billingRoutes = require("./routes/billingRoutes");
const companyRoutes = require("./routes/companyRoutes");
const workspaceOrgRoutes = require("./routes/workspaceOrgRoutes");
const aiMemoryRoutes = require("./routes/aiMemoryRoutes");
const auditRoutes = require("./routes/auditRoutes");
const backupRoutes = require("./routes/backupRoutes");
const razorpayRoutes = require("./routes/razorpayRoutes");
const razorpayWebhookRoutes = require("./routes/razorpayWebhookRoutes");
const usageRoutes = require("./routes/usageRoutes");
const subscriptionAdminRoutes = require("./routes/subscriptionAdminRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");

const hunterRoutes = require("./routes/hunterRoutes");
const aiSupplierAgentRoutes = require("./routes/aiSupplierAgentRoutes");
const aiOutreachAgentRoutes = require("./routes/aiOutreachAgentRoutes");
const aiFollowupAgentRoutes = require("./routes/aiFollowupAgentRoutes");
const aiCrmForecastAgentRoutes = require("./routes/aiCrmForecastAgentRoutes");
const aiTradeRiskAgentRoutes = require("./routes/aiTradeRiskAgentRoutes");
const aiLeadEnrichmentRoutes = require("./routes/aiLeadEnrichmentRoutes");
const aiAutonomousWorkflowRoutes = require("./routes/aiAutonomousWorkflowRoutes");
const automationWorkflowRoutes = require("./routes/automationWorkflowRoutes2");
const emailAutomationRoutes = require("./routes/emailAutomationRoutes");
const whatsappAutomationRoutes = require("./routes/whatsappAutomationRoutes");

const executiveAnalyticsRoutes = require("./routes/executiveAnalyticsRoutes");
const whiteLabelRoutes = require("./routes/whiteLabelRoutes");
const liveSupplierIntelligenceRoutes = require("./routes/liveSupplierIntelligenceRoutes");
const onboardingRoutes = require("./routes/onboardingRoutes");
const realSupplierDiscoveryRoutes = require("./routes/realSupplierDiscoveryRoutes");
const buyerDiscoveryRoutes = require("./routes/buyerDiscoveryRoutes");

const { startWorkflowScheduler } = require("./services/workflowScheduler");
const { startAIAutonomousScheduler } = require("./services/aiAutonomousScheduler");

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:5000",
  "http://localhost:3000",
  "https://trade-flow-lc1k.onrender.com",
  "https://tradeflowai.in",
  "https://www.tradeflowai.in"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(compression());
app.use(morgan("combined"));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

app.use("/api", apiLimiter);

/* Razorpay webhook must stay before JSON parser and auth */
app.use("/api/razorpay-webhook", razorpayWebhookRoutes);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* Health check */
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "TradeFlow backend working",
    port: process.env.PORT || 5000,
    mode: process.env.NODE_ENV || "local"
  });
});

/* Public Auth Routes */
app.use("/api/auth", authRoutes);

/* Protected API Routes */
const protectedStack = [authMiddleware, tenantMiddleware];

app.use("/suppliers", protectedStack, supplierRoutes);
app.use("/api/deals", protectedStack, dealRoutes);
app.use("/api/ai", protectedStack, aiRoutes);
app.use("/api/tasks", protectedStack, taskRoutes);
app.use("/api/pdf", protectedStack, pdfRoutes);
app.use("/api/analytics", protectedStack, analyticsRoutes);
app.use("/api/outreach", protectedStack, outreachRoutes);

app.use("/api/outreach-email", protectedStack, outreachEmailRoutes);
app.use("/api/email", protectedStack, emailRoutes);
app.use("/api/employees", protectedStack, employeeRoutes);
app.use("/api/notifications", protectedStack, notificationRoutes);
app.use("/api/workspaces", protectedStack, workspaceRoutes);
app.use("/api/activity", protectedStack, activityRoutes);
app.use("/api/payment", protectedStack, paymentRoutes);
app.use("/api/billing", protectedStack, billingRoutes);
app.use("/api/companies", protectedStack, companyRoutes);
app.use("/api/audit", protectedStack, auditRoutes);
app.use("/api/backup", protectedStack, backupRoutes);
app.use("/api/usage", protectedStack, usageRoutes);
app.use("/api/ai-autonomous-workflows", protectedStack, aiAutonomousWorkflowRoutes);
app.use("/api/ai-supplier-agent", protectedStack, aiSupplierAgentRoutes);
app.use("/api/ai-outreach-agent", protectedStack, aiOutreachAgentRoutes);
app.use("/api/ai-followup-agent", protectedStack, aiFollowupAgentRoutes);
app.use("/api/ai-crm-forecast-agent", protectedStack, aiCrmForecastAgentRoutes);
app.use("/api/ai-trade-risk-agent", protectedStack, aiTradeRiskAgentRoutes);
app.use("/api/automation-workflows", protectedStack, automationWorkflowRoutes);
app.use("/api/email-automation", protectedStack, emailAutomationRoutes);
app.use("/api/whatsapp-automation", protectedStack, whatsappAutomationRoutes);
app.use("/api/subscriptions", protectedStack, subscriptionAdminRoutes);
app.use("/api/subscription", protectedStack, subscriptionRoutes);
app.use("/api/razorpay-checkout", protectedStack, razorpayRoutes);
app.use("/api/hunter", protectedStack, hunterRoutes);
app.use("/api/ai-lead-enrichment", protectedStack, aiLeadEnrichmentRoutes);
app.use("/api/executive-analytics", protectedStack, executiveAnalyticsRoutes);
app.use("/api/white-label", protectedStack, whiteLabelRoutes);
app.use("/api/buyer-discovery", protectedStack, buyerDiscoveryRoutes);
app.use("/api/live-supplier-intelligence", protectedStack, liveSupplierIntelligenceRoutes);
app.use("/api/real-supplier-discovery", protectedStack, realSupplierDiscoveryRoutes);
app.use("/api/onboarding", protectedStack, onboardingRoutes);
app.use("/api/org-workspaces", protectedStack, workspaceOrgRoutes);
app.use("/api/ai-memory", protectedStack, aiMemoryRoutes);

/* Frontend Pages */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/landing.html"));
});

app.get("/landing", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/landing.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/auth.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/auth.html"));
});

app.get("/master/login", (req, res) => {
  res.redirect("/login");
});

app.get("/onboarding", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/onboarding.html"));
});

app.get("/app", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.use(
  express.static(path.join(__dirname, "../frontend"), {
    index: false
  })
);

/* Fallback */
app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      success: false,
      message: "API route not found",
      path: req.path
    });
  }

  return res.redirect("/login");
});

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

initSocketServer(io);

async function startServer() {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`✅ TradeFlow Server running on port ${PORT}`);
      console.log("✅ MongoDB Connected");
      console.log("✅ Real-time collaboration engine active");
      console.log("✅ CORS enabled for localhost, Render, Vercel, and custom domain");
      console.log("✅ JWT auth mounted on protected API routes");
      console.log("✅ Tenant middleware uses verified JWT identity only");

      if (process.env.ENABLE_SCHEDULERS === "true") {
        console.log("✅ Workflow schedulers enabled");
        startWorkflowScheduler();
        startAIAutonomousScheduler();
      } else {
        console.log("ℹ️ Workflow schedulers disabled. Set ENABLE_SCHEDULERS=true to enable.");
      }
    });
  } catch (error) {
    console.error("❌ Server startup failed:", error);
    process.exit(1);
  }
}

startServer();