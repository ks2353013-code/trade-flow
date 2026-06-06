require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const compression = require("compression");
const http = require("http");
const childProcess = require("child_process");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");

const { initSocketServer } = require("./socket/socketServer");
const { connectDB, getMongoState, isMongoConnected } = require("./config/db");

const authMiddleware = require("./middleware/authMiddleware");
const tenantMiddleware = require("./middleware/tenantMiddleware");
const {
  requireActiveSubscription,
  requirePlan
} = require("./middleware/subscriptionMiddleware");
const optionalAuth = authMiddleware.optionalAuth;

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
const executiveControlTowerRoutes = require("./routes/executiveControlTowerRoutes");
const whiteLabelRoutes = require("./routes/whiteLabelRoutes");
const liveSupplierIntelligenceRoutes = require("./routes/liveSupplierIntelligenceRoutes");
const onboardingRoutes = require("./routes/onboardingRoutes");
const realSupplierDiscoveryRoutes = require("./routes/realSupplierDiscoveryRoutes");
const buyerDiscoveryRoutes = require("./routes/buyerDiscoveryRoutes");
const tradeAgentRoutes = require("./routes/tradeAgentRoutes");
const crmPushRoutes = require("./routes/crmPushRoutes");
const outreachApprovalRoutes = require("./routes/outreachApprovalRoutes");
const clientErrorRoutes = require("./routes/clientErrorRoutes");
const aiCommandRoutes = require("./routes/aiCommandRoutes");
const agentRegistryRoutes = require("./routes/agentRegistryRoutes");
const agentMemoryRoutes = require("./routes/agentMemoryRoutes");
const betaRoutes = require("./routes/betaRoutes");

const { startWorkflowScheduler } = require("./services/workflowScheduler");
const { startAIAutonomousScheduler } = require("./services/aiAutonomousScheduler");

const emailDeliveryRoutes = require("./routes/emailDeliveryRoutes");
const { isEmailConfigured } = require("./services/emailSender");

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = [
  "http://localhost:5000",
  "http://localhost:3000",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:3000",
  "https://trade-flow-lc1k.onrender.com",
  "https://tradeflowai.in",
  "https://www.tradeflowai.in"
];
const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === "true";

function isAllowedVercelPreview(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        (allowVercelPreviews && isAllowedVercelPreview(origin))
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
const isProduction = process.env.NODE_ENV === "production";
const debugTradeFlow = process.env.DEBUG_TRADEFLOW === "true";
const schedulerState = {
  enabled: process.env.ENABLE_SCHEDULERS === "true",
  status: "disabled"
};

app.use(
  morgan(isProduction ? "tiny" : "dev", {
    skip: (req, res) => (
      req.path === "/api/health" ||
      req.path === "/api/ready" ||
      (isProduction && !debugTradeFlow && res.statusCode < 500)
    )
  })
);

function isLocalSmokeRequest(req) {
  if (isProduction) return false;

  const host = String(req.hostname || "").toLowerCase();
  const ip = String(req.ip || req.socket?.remoteAddress || "");

  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1"
  );
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction
    ? 500
    : Number(process.env.DEV_RATE_LIMIT_MAX || 5000),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => (
    req.path === "/health" ||
    req.path === "/ready" ||
    isLocalSmokeRequest(req)
  ),
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

app.use("/api", apiLimiter);

function getMongoStatusLabel() {
  const status = getMongoState().status;
  if (status === "connected") return "connected";
  if (status === "failed") return "failed";
  return "connecting";
}

function requireDatabaseReady(req, res, next) {
  if (isMongoConnected()) {
    return next();
  }

  return res.status(503).json({
    success: false,
    message: "Database not ready. Please retry shortly."
  });
}

function getCommitVersion() {
  if (process.env.RENDER_GIT_COMMIT) return process.env.RENDER_GIT_COMMIT;
  if (process.env.GIT_COMMIT) return process.env.GIT_COMMIT;
  if (process.env.COMMIT_SHA) return process.env.COMMIT_SHA;

  try {
    return childProcess
      .execSync("git rev-parse --short HEAD", {
        cwd: path.join(__dirname, ".."),
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 1000
      })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

function buildHealthPayload() {
  return {
    ok: isMongoConnected(),
    server: "running",
    mongo: getMongoStatusLabel(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "local",
    version: process.env.npm_package_version || "1.0.0",
    commit: getCommitVersion(),
    scheduler: {
      enabled: schedulerState.enabled,
      status: schedulerState.status
    },
    emailMode: isEmailConfigured() ? "smtp" : "dry-run"
  };
}

/* Razorpay webhook must stay before JSON parser and auth */
app.use("/api/razorpay-webhook", razorpayWebhookRoutes);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* Health check */
app.get("/api/health", (req, res) => {
  res.json({
    ...buildHealthPayload(),
    ok: true
  });
});

app.get("/api/ready", (req, res) => {
  const payload = buildHealthPayload();

  if (!payload.ok) {
    return res.status(503).json(payload);
  }

  return res.json(payload);
});

/* Public Auth Routes */
app.use("/api/auth", requireDatabaseReady, authRoutes);
app.use("/api/errors", requireDatabaseReady, optionalAuth, clientErrorRoutes);

/* Protected API Routes */
const protectedStack = [
  requireDatabaseReady,
  authMiddleware,
  tenantMiddleware,
  requireActiveSubscription()
];

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
app.use(
  "/api/executive-control-tower",
  protectedStack,
  requirePlan("Starter"),
  executiveControlTowerRoutes
);
app.use("/api/white-label", protectedStack, whiteLabelRoutes);
app.use("/api/buyer-discovery", protectedStack, buyerDiscoveryRoutes);
app.use("/api/live-supplier-intelligence", protectedStack, liveSupplierIntelligenceRoutes);
app.use("/api/real-supplier-discovery", protectedStack, realSupplierDiscoveryRoutes);
app.use("/api/onboarding", protectedStack, onboardingRoutes);
app.use("/api/org-workspaces", protectedStack, workspaceOrgRoutes);
app.use("/api/ai-memory", protectedStack, aiMemoryRoutes);
app.use("/api/trade-agent", protectedStack, tradeAgentRoutes);
app.use("/api/crm", protectedStack, crmPushRoutes);
app.use("/api/outreach-approvals", protectedStack, outreachApprovalRoutes);
app.use("/api/email-deliveries", protectedStack, emailDeliveryRoutes);
app.use("/api/ai-command", protectedStack, requirePlan("Starter"), aiCommandRoutes);
app.use("/api/agent-registry", protectedStack, requirePlan("Starter"), agentRegistryRoutes);
app.use("/api/agent-memory", protectedStack, requirePlan("Starter"), agentMemoryRoutes);
app.use("/api/beta", protectedStack, betaRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl
  });
});

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
        (allowVercelPreviews && isAllowedVercelPreview(origin))
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

function startSchedulersIfEnabled() {
  if (process.env.ENABLE_SCHEDULERS === "true") {
    console.log("Workflow schedulers enabled");
    schedulerState.status = "starting";
    startWorkflowScheduler();
    startAIAutonomousScheduler();
    schedulerState.status = "running";
  } else {
    console.log("Workflow schedulers disabled. Set ENABLE_SCHEDULERS=true to enable.");
    schedulerState.status = "disabled";
  }
}

function startMongoConnection() {
  connectDB()
    .then((connected) => {
      if (connected) {
        startSchedulersIfEnabled();
      }
    })
    .catch((error) => {
      console.error("Mongo failed with reason:", error.message);
    });
}

function startServer() {
  server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log("Real-time collaboration engine active");
    console.log("CORS enabled for localhost, Render, Vercel, and custom domain");
    console.log("JWT auth mounted on protected API routes");
    console.log("Tenant middleware uses verified JWT identity only");
    startMongoConnection();
  });
}

startServer();
