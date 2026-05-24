/* TradeFlow Usage Dashboard Engine */

(function () {
  const CACHE_KEY = "tradeflowUsageMetricsCache";

  const PLAN_LIMITS = {
    Free: {
      ai_request: 20,
      supplier_create: 25,
      employee_create: 1,
      workspace_create: 1,
      pdf_export: 0
    },
    Pro: {
      ai_request: 500,
      supplier_create: 500,
      employee_create: 10,
      workspace_create: 5,
      pdf_export: 100
    },
    Enterprise: {
      ai_request: 10000,
      supplier_create: 10000,
      employee_create: 200,
      workspace_create: 100,
      pdf_export: 5000
    }
  };

  function $(id) {
    return document.getElementById(id);
  }

  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") return BACKEND_URL;
    return "https://trade-flow-lc1k.onrender.com";
  }

  function getJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getUser() {
    return getJson("tradeflowUser", {});
  }

  function getPlan() {
    return localStorage.getItem("tradeflowSubscriptionPlan") || "Free";
  }

  function getHeaders() {
    const user = getUser();

    return {
      "Content-Type": "application/json",
      Authorization: user?.token ? `Bearer ${user.token}` : "",
      "x-user-email": user?.email || "unknown@tradeflow.local",
      "x-company-id": localStorage.getItem("tradeflowActiveCompany") || "",
      "x-workspace-id": localStorage.getItem("tradeflowActiveWorkspace") || ""
    };
  }

  async function fetchUsage() {
    try {
      const res = await fetch(`${getBackendUrl()}/api/usage`, {
        headers: getHeaders()
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed");

      setJson(CACHE_KEY, Array.isArray(data) ? data : []);
      renderUsage();
      setStatus("Usage metrics synced.");
    } catch {
      renderUsage();
      setStatus("Using cached usage metrics.");
    }
  }

  function getMetricCount(metrics, type) {
    const item = metrics.find((m) => m.metricType === type);
    return Number(item?.count || 0);
  }

  function percent(value, limit) {
    if (!limit) return value > 0 ? 100 : 0;
    return Math.min(100, Math.round((value / limit) * 100));
  }

  function labelForMetric(type) {
    const labels = {
      ai_request: "AI Requests",
      supplier_create: "Suppliers Created",
      employee_create: "Employees Created",
      workspace_create: "Workspaces Created",
      pdf_export: "PDF Exports"
    };

    return labels[type] || type;
  }

  function renderUsage() {
    const box = $("usageDashboardList");
    if (!box) return;

    const plan = getPlan();
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.Free;
    const metrics = getJson(CACHE_KEY, []);

    const rows = Object.keys(limits).map((type) => {
      const used = getMetricCount(metrics, type);
      const limit = limits[type];
      const pct = percent(used, limit);
      const locked = limit === 0;

      return `
        <div class="supplier-card" style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
            <h2 style="font-size:17px;color:white;margin:0;">
              ${labelForMetric(type)}
            </h2>
            <span class="status">
              ${locked ? "Locked" : `${used} / ${limit}`}
            </span>
          </div>

          <div style="height:10px;background:rgba(148,163,184,.18);border-radius:999px;overflow:hidden;margin-top:12px;">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#38bdf8,#8b5cf6,#22c55e);"></div>
          </div>

          <p class="muted" style="margin-top:8px;">
            ${locked ? "Upgrade required for this feature." : `${100 - pct}% capacity remaining approximately.`}
          </p>
        </div>
      `;
    });

    box.innerHTML = rows.join("");
  }

  function setStatus(text) {
    const el = $("usageDashboardStatus");
    if (el) el.innerText = text;
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("usageDashboardPanel")) return;

    const panel = document.createElement("div");
    panel.id = "usageDashboardPanel";
    panel.className = "card ai-panel";

    panel.innerHTML = `
      <div class="section-title">📊 Usage Dashboard</div>
      <p class="muted">
        Track AI usage, suppliers, employees, workspaces, and document exports by plan.
      </p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;">
        <button class="btn" onclick="TradeFlowUsageDashboard.fetch()">Refresh Usage</button>
        <button class="btn" onclick="TradeFlowSubscriptionEngine?.openUpgrade()">Upgrade Plan</button>
      </div>

      <div id="usageDashboardStatus" style="margin-top:12px;color:#7dd3fc;font-weight:900;">
        Usage dashboard ready.
      </div>

      <div id="usageDashboardList" style="margin-top:18px;"></div>
    `;

    dashboard.appendChild(panel);
    renderUsage();
  }

  window.TradeFlowUsageDashboard = {
    fetch: fetchUsage,
    render: renderUsage,
    limits: PLAN_LIMITS
  };

  function boot() {
    buildPanel();
    setTimeout(fetchUsage, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();