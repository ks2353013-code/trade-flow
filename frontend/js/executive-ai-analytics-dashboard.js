/* TradeFlow Executive AI Analytics Dashboard */

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") return BACKEND_URL;
    return "https://trade-flow-lc1k.onrender.com";
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowUser") || "{}");
    } catch {
      return {};
    }
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

  function setStatus(text) {
    const el = $("executiveAnalyticsStatus");
    if (el) el.innerText = text;
  }

  async function loadAnalytics() {
    try {
      setStatus("Loading executive analytics...");

      const res = await fetch(`${getBackendUrl()}/api/executive-analytics/overview`, {
        headers: getHeaders()
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Analytics failed");

      render(data.analytics);
      setStatus("Executive analytics synced.");
    } catch (error) {
      setStatus(error.message || "Failed to load analytics.");
    }
  }

  function statCard(label, value, note) {
    return `
      <div class="supplier-card">
        <h2 style="color:white;margin:0 0 8px;">${value}</h2>
        <p class="muted" style="margin:0;">${label}</p>
        <div class="deal" style="margin-top:10px;">${note}</div>
      </div>
    `;
  }

  function render(a) {
    const box = $("executiveAnalyticsContent");
    if (!box) return;

    box.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
        ${statCard("Projected Monthly Revenue", `₹${a.revenueForecast.projectedMonthly}`, "AI projected monthly SaaS revenue")}
        ${statCard("Projected Quarterly Revenue", `₹${a.revenueForecast.projectedQuarterly}`, "Quarterly forecast")}
        ${statCard("Projected Yearly Revenue", `₹${a.revenueForecast.projectedYearly}`, "Annualized projection")}
        ${statCard("CRM Conversion Rate", `${a.crmPerformance.conversionRate}%`, "Estimated pipeline conversion")}
        ${statCard("Active Deals", a.crmPerformance.activeDeals, "Currently active CRM opportunities")}
        ${statCard("High Probability Deals", a.crmPerformance.highProbabilityDeals, "AI-qualified hot opportunities")}
        ${statCard("AI Requests", a.aiOperations.aiRequests, "AI operational usage volume")}
        ${statCard("Automation Executions", a.aiOperations.automationExecutions, "Workflow execution count")}
        ${statCard("Active Automations", a.aiOperations.activeAutomations, "Enabled workflows")}
        ${statCard("Workflow Efficiency", `${a.operationalHealth.workflowEfficiency}%`, "Operational automation efficiency")}
        ${statCard("Automation Success Rate", `${a.operationalHealth.automationSuccessRate}%`, "Execution reliability")}
        ${statCard("Operational Risk", a.operationalHealth.operationalRisk, "Overall platform risk status")}
      </div>

      <div class="supplier-card" style="margin-top:18px;">
        <h2 style="color:white;margin:0 0 12px;">⚙️ Top Workflow Insights</h2>
        ${
          (a.workflowInsights || []).length
            ? a.workflowInsights.map(w => `
              <div class="deal" style="margin-bottom:8px;">
                <b>${w.name}</b><br>
                Executions: ${w.executions}<br>
                Trigger: ${w.trigger}<br>
                Action: ${w.action}
              </div>
            `).join("")
            : `<div class="deal">No workflow insights yet.</div>`
        }
      </div>
    `;
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("executiveAnalyticsPanel")) return;

    const panel = document.createElement("div");
    panel.id = "executiveAnalyticsPanel";
    panel.className = "card ai-panel";

    panel.innerHTML = `
      <div class="section-title">📊 Executive AI Analytics Dashboard</div>
      <p class="muted">
        Founder/admin intelligence center for revenue, CRM, AI usage, workflow performance, and operational health.
      </p>

      <button class="btn" onclick="TradeFlowExecutiveAnalytics.load()" style="margin-top:14px;">
        Refresh Executive Analytics
      </button>

      <div id="executiveAnalyticsStatus" style="margin-top:14px;color:#7dd3fc;font-weight:900;">
        Executive analytics ready.
      </div>

      <div id="executiveAnalyticsContent" style="margin-top:20px;"></div>
    `;

    dashboard.appendChild(panel);
  }

  window.TradeFlowExecutiveAnalytics = {
    load: loadAnalytics
  };

  function boot() {
    buildPanel();
    setTimeout(loadAnalytics, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();