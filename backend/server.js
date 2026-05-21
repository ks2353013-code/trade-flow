require("dotenv").config();

const express = require("express");
const cors = require("cors");

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

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.get("/", (req, res) => {
  res.send("TradeFlow Backend Running");
});

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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});