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

const connectDB = require("./config/db");

const supplierRoutes = require("./routes/supplierRoutes");
const authRoutes = require("./routes/authRoutes");
const dealRoutes = require("./routes/dealRoutes");
const aiRoutes = require("./routes/aiRoutes");
const taskRoutes = require("./routes/taskRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const outreachRoutes = require("./routes/outreachRoutes");
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
const tenantMiddleware = require("./middleware/tenantMiddleware");
const razorpayWebhookRoutes = require("./routes/razorpayWebhookRoutes");
const usageRoutes = require("./routes/usageRoutes");
const aiSupplierAgentRoutes = require("./routes/aiSupplierAgentRoutes");

const app = express();

/* =========================
   SECURITY + PERFORMANCE
========================= */

app.set("trust proxy", 1);

app.use(cors());

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

app.use(compression());

app.use(morgan("combined"));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    message:
      "Too many requests. Please try again later."
  }
});

app.use("/api", apiLimiter);

/* =========================
   RAZORPAY WEBHOOK RAW BODY
========================= */

app.use(
  "/api/razorpay",
  razorpayWebhookRoutes
);

/* =========================
   JSON BODY PARSER
========================= */

app.use(express.json());

/* =========================
   DATABASE
========================= */

connectDB();

/* =========================
   TENANT MIDDLEWARE
========================= */

app.use(tenantMiddleware);

/* =========================
   API ROUTES
========================= */

app.use("/suppliers", supplierRoutes);

app.use("/api/auth", authRoutes);

app.use("/api/deals", dealRoutes);

app.use("/api/ai", aiRoutes);

app.use("/api/tasks", taskRoutes);

app.use("/api/pdf", pdfRoutes);

app.use("/api/analytics", analyticsRoutes);

app.use("/api/outreach", outreachRoutes);

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

app.use("/api/ai-supplier-agent", aiSupplierAgentRoutes);

app.use(
  "/api/org-workspaces",
  workspaceOrgRoutes
);

app.use(
  "/api/ai-memory",
  aiMemoryRoutes
);

/* =========================
   FRONTEND SERVING
========================= */

app.use(
  express.static(
    path.join(__dirname, "../frontend")
  )
);

app.get("*", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "../frontend/index.html"
    )
  );
});

/* =========================
   REALTIME COLLABORATION
========================= */

const PORT =
  process.env.PORT || 5000;

const server =
  http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE"
    ]
  }
});

io.on("connection", (socket) => {

  console.log(
    "🟢 User connected:",
    socket.id
  );

  socket.on(
    "join-workspace",
    (data) => {

      const workspaceId =
        data?.workspaceId || "global";

      socket.join(workspaceId);

      io.to(workspaceId).emit(
        "workspace-activity",
        {
          type: "presence",
          message:
            `${data?.email || "A user"} joined workspace`,
          time: new Date().toISOString()
        }
      );
    }
  );

  socket.on(
    "tradeflow-activity",
    (data) => {

      const workspaceId =
        data?.workspaceId || "global";

      io.to(workspaceId).emit(
        "workspace-activity",
        {
          type:
            data?.type || "activity",

          message:
            data?.message ||
            "New TradeFlow activity",

          email:
            data?.email || "",

          time:
            new Date().toISOString()
        }
      );
    }
  );

  socket.on("disconnect", () => {

    console.log(
      "🔴 User disconnected:",
      socket.id
    );

  });

});

/* =========================
   SERVER START
========================= */

server.listen(PORT, () => {

  console.log(
    `✅ TradeFlow Server running on port ${PORT}`
  );

  console.log(
    "✅ MongoDB Connected"
  );

  console.log(
    "✅ Real-time collaboration engine active"
  );

  console.log(
    "✅ SaaS security middleware active"
  );

});