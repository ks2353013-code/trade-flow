```js
const BACKEND_URL = "https://trade-flow-lc1k.onrender.com";

const API_URL = `${BACKEND_URL}/suppliers`;
const AI_URL = `${BACKEND_URL}/api/ai`;
const DEAL_URL = `${BACKEND_URL}/api/deals`;
const TASK_URL = `${BACKEND_URL}/api/tasks`;
const PDF_URL = `${BACKEND_URL}/api/pdf`;
const ANALYTICS_URL = `${BACKEND_URL}/api/analytics`;
const OUTREACH_URL = `${BACKEND_URL}/api/outreach`;
const EMAIL_URL = `${BACKEND_URL}/api/email`;
const EMPLOYEE_URL = `${BACKEND_URL}/api/employees`;
const NOTIFICATION_URL = `${BACKEND_URL}/api/notifications`;
const WORKSPACE_URL = `${BACKEND_URL}/api/workspaces`;

let appReady = false;

/* =========================================================
   SESSION SYSTEM
========================================================= */

function safeParse(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

function syncOwnerSession() {
  const user = safeParse("tradeflowUser");
  const master = safeParse("tradeflowMasterAdmin");

  if (user && user.token) {
    return user;
  }

  if (master && master.token) {
    const merged = {
      ...master,
      isOwner: true
    };

    localStorage.setItem(
      "tradeflowUser",
      JSON.stringify(merged)
    );

    localStorage.setItem(
      "tradeflowIsOwner",
      "true"
    );

    return merged;
  }

  return null;
}

function getUser() {
  const synced = syncOwnerSession();

  if (synced) return synced;

  try {
    const user = localStorage.getItem("tradeflowUser");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

function protectDashboard() {
  const user = getUser();

  if (!user || !user.token) {
    console.warn("No session found.");
    window.location.replace("login.html");
    return;
  }

  const workspaceName =
    document.getElementById("workspaceName");

  const userBadge =
    document.getElementById("userBadge");

  if (workspaceName) {
    workspaceName.innerText =
      `${user.companyName || "TradeFlow Company"} • ${user.name || "User"} Workspace`;
  }

  if (userBadge) {
    userBadge.innerText =
      user.email || "Authenticated User";
  }

  appReady = true;
}

protectDashboard();

function getAuthHeaders() {
  const user = getUser();

  if (!user || !user.token) {
    console.warn("Missing token");

    return {
      "Content-Type": "application/json"
    };
  }

  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${user.token}`
  };
}

function logoutUser() {
  localStorage.removeItem("tradeflowUser");
  window.location.href = "login.html";
}

/* =========================================================
   PAGE NAVIGATION
========================================================= */

const pages = [
  "dashboard",
  "master",
  "workspaces",
  "employees",
  "suppliers",
  "crm",
  "negotiation",
  "tasks",
  "marketing",
  "documents",
  "outreach",
  "analytics",
  "ai",
  "notifications"
];

function showPage(page) {

  if (!appReady) return;

  pages.forEach((p) => {
    const el = document.getElementById(`${p}Page`);
    if (el) el.classList.add("hidden");
  });

  const target =
    document.getElementById(`${page}Page`);

  if (!target) return;

  target.classList.remove("hidden");

  if (page === "dashboard") {
    safeRun(fetchSuppliers);
    safeRun(fetchDeals);
    safeRun(fetchAnalytics);
    safeRun(fetchNotifications);
    safeRun(fetchWorkspaces);
  }

  if (page === "suppliers") safeRun(fetchSuppliers);
  if (page === "crm") safeRun(fetchDeals);
  if (page === "analytics") safeRun(fetchAnalytics);
  if (page === "outreach") safeRun(fetchOutreachRecords);
  if (page === "employees") safeRun(fetchEmployees);
  if (page === "notifications") safeRun(fetchNotifications);
  if (page === "workspaces") safeRun(fetchWorkspaces);
  if (page === "tasks") safeRun(fetchTasks);
}

function safeRun(fn) {
  try {
    if (typeof fn === "function") {
      fn();
    }
  } catch (error) {
    console.warn("Module skipped:", error.message);
  }
}

/* =========================================================
   SUPPLIERS
========================================================= */

async function fetchSuppliers() {

  try {

    const res = await fetch(API_URL, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      throw new Error("Supplier fetch failed");
    }

    const suppliers = await res.json();

    const count =
      document.getElementById("supplierCount");

    if (count) {
      count.innerText = suppliers.length;
    }

    const supplierList =
      document.getElementById("supplierList");

    if (!supplierList) return;

    supplierList.innerHTML = "";

    if (!suppliers.length) {

      supplierList.innerHTML =
        `<p class="muted">No suppliers available yet.</p>`;

      return;
    }

    suppliers.forEach((supplier) => {

      supplierList.innerHTML += `
        <div class="supplier-card">

          <h2 style="font-size:20px;font-weight:900;color:white;">
            ${supplier.supplierName || "Supplier"}
          </h2>

          <p class="muted">
            Product:
            ${supplier.product || "N/A"}
          </p>

          <p class="muted">
            Country:
            ${supplier.country || "N/A"}
          </p>

          <p class="muted">
            Email:
            ${supplier.email || "N/A"}
          </p>

          <p class="muted">
            Phone:
            ${supplier.phone || "N/A"}
          </p>

          <span class="status">
            ${supplier.status || "Lead"}
          </span>

        </div>
      `;
    });

  } catch (error) {

    console.warn(
      "Suppliers skipped:",
      error.message
    );

    const supplierList =
      document.getElementById("supplierList");

    if (supplierList) {

      supplierList.innerHTML =
        `<p class="muted">Supplier backend temporarily unavailable.</p>`;

    }
  }
}

/* =========================================================
   DEALS
========================================================= */

async function fetchDeals() {

  try {

    const res = await fetch(DEAL_URL, {
      headers: getAuthHeaders()
    });

    if (!res.ok) {
      throw new Error("Deals fetch failed");
    }

    const deals = await res.json();

    const dealCount =
      document.getElementById("dealCount");

    if (dealCount) {
      dealCount.innerText = deals.length;
    }

  } catch (error) {

    console.warn(
      "Deals skipped:",
      error.message
    );

  }
}

/* =========================================================
   ANALYTICS
========================================================= */

async function fetchAnalytics() {

  try {

    const res =
      await fetch(ANALYTICS_URL, {
        headers: getAuthHeaders()
      });

    if (!res.ok) {
      throw new Error("Analytics failed");
    }

    const data = await res.json();

    const total =
      document.getElementById("dashboardPipelineValue");

    if (total) {
      total.innerText =
        data.pipelineValue || 0;
    }

  } catch (error) {

    console.warn(
      "Analytics skipped:",
      error.message
    );

  }
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

async function fetchNotifications() {

  try {

    const res =
      await fetch(NOTIFICATION_URL, {
        headers: getAuthHeaders()
      });

    if (!res.ok) {
      throw new Error("Notifications failed");
    }

    const data = await res.json();

    const unread =
      document.getElementById("dashboardUnreadNotifications");

    if (unread) {
      unread.innerText = data.length || 0;
    }

  } catch (error) {

    console.warn(
      "Notifications skipped:",
      error.message
    );

  }
}

/* =========================================================
   WORKSPACES
========================================================= */

async function fetchWorkspaces() {

  try {

    const res =
      await fetch(WORKSPACE_URL, {
        headers: getAuthHeaders()
      });

    if (!res.ok) {
      throw new Error("Workspace fetch failed");
    }

    const workspaces =
      await res.json();

    const count =
      document.getElementById("workspaceCount");

    if (count) {
      count.innerText =
        workspaces.length || 0;
    }

  } catch (error) {

    console.warn(
      "Workspace skipped:",
      error.message
    );

  }
}

/* =========================================================
   TASKS
========================================================= */

async function fetchTasks() {

  try {

    const res =
      await fetch(TASK_URL, {
        headers: getAuthHeaders()
      });

    if (!res.ok) {
      throw new Error("Task fetch failed");
    }

  } catch (error) {

    console.warn(
      "Tasks skipped:",
      error.message
    );

  }
}

/* =========================================================
   EMPLOYEES
========================================================= */

async function fetchEmployees() {

  try {

    const res =
      await fetch(EMPLOYEE_URL, {
        headers: getAuthHeaders()
      });

    if (!res.ok) {
      throw new Error("Employees failed");
    }

  } catch (error) {

    console.warn(
      "Employees skipped:",
      error.message
    );

  }
}

/* =========================================================
   OUTREACH
========================================================= */

async function fetchOutreachRecords() {

  try {

    const res =
      await fetch(OUTREACH_URL, {
        headers: getAuthHeaders()
      });

    if (!res.ok) {
      throw new Error("Outreach failed");
    }

  } catch (error) {

    console.warn(
      "Outreach skipped:",
      error.message
    );

  }
}

/* =========================================================
   CONTACT SUPPORT
========================================================= */

function contactSupport() {

  const user = getUser();

  const subject =
    encodeURIComponent(
      "TradeFlow Support"
    );

  const body =
    encodeURIComponent(
      `Company: ${user?.companyName || ""}\nUser: ${user?.name || ""}\nEmail: ${user?.email || ""}`
    );

  window.location.href =
    `mailto:ks2353013@gmail.com?subject=${subject}&body=${body}`;
}

/* =========================================================
   BOOT
========================================================= */

function bootTradeFlow() {

  if (!appReady) return;

  showPage("dashboard");

  setTimeout(() => safeRun(fetchAnalytics), 300);
  setTimeout(() => safeRun(fetchNotifications), 600);
  setTimeout(() => safeRun(fetchWorkspaces), 900);
}

bootTradeFlow();
```
