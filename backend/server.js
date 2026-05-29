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

const tenantMiddleware = require("./middleware/tenantMiddleware");

const { startWorkflowScheduler } = require("./services/workflowScheduler");
const { startAIAutonomousScheduler } = require("./services/aiAutonomousScheduler");

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:5000",
  "http://localhost:3000",
  "https://trade-flow-lc1k.onrender.com"
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

      return callback(null, false);
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

/* Razorpay webhook must stay before JSON parser */
app.use("/api/razorpay-webhook", razorpayWebhookRoutes);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

connectDB();

app.use(tenantMiddleware);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "TradeFlow backend working",
    port: process.env.PORT || 5000,
    mode: process.env.NODE_ENV || "local"
  });
});

/* API Routes */
app.use("/suppliers", supplierRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/pdf", pdfRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/outreach", outreachRoutes);

app.use("/api/outreach-email", outreachEmailRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/backup", backupRoutes);
app.use("/api/usage", usageRoutes);
app.use("/api/ai-autonomous-workflows", aiAutonomousWorkflowRoutes);
app.use("/api/ai-supplier-agent", aiSupplierAgentRoutes);
app.use("/api/ai-outreach-agent", aiOutreachAgentRoutes);
app.use("/api/ai-followup-agent", aiFollowupAgentRoutes);
app.use("/api/ai-crm-forecast-agent", aiCrmForecastAgentRoutes);
app.use("/api/ai-trade-risk-agent", aiTradeRiskAgentRoutes);
app.use("/api/automation-workflows", automationWorkflowRoutes);
app.use("/api/email-automation", emailAutomationRoutes);
app.use("/api/whatsapp-automation", whatsappAutomationRoutes);
app.use("/api/subscriptions", subscriptionAdminRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/razorpay-checkout", razorpayRoutes);
app.use("/api/hunter", hunterRoutes);
app.use("/api/ai-lead-enrichment", aiLeadEnrichmentRoutes);
app.use("/api/executive-analytics", executiveAnalyticsRoutes);
app.use("/api/white-label", whiteLabelRoutes);
app.use("/api/buyer-discovery", buyerDiscoveryRoutes);
app.use("/api/live-supplier-intelligence", liveSupplierIntelligenceRoutes);
app.use("/api/real-supplier-discovery", realSupplierDiscoveryRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/org-workspaces", workspaceOrgRoutes);
app.use("/api/ai-memory", aiMemoryRoutes);

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

      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

initSocketServer(io);

server.listen(PORT, () => {
  console.log(`✅ TradeFlow Server running on port ${PORT}`);
  console.log("✅ MongoDB Connected");
  console.log("✅ Real-time collaboration engine active");
  console.log("✅ CORS enabled for localhost, Render, and Vercel");
  console.log("✅ Workflow scheduler engine active");

  startWorkflowScheduler();
  startAIAutonomousScheduler();
});