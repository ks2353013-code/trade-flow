/* TradeFlow Revenue Intelligence Engine V1 */

(function () {
  if (window.TradeFlowRevenueIntelligenceEngineV1) return;

  function getWorkspaces() {
    return window.TradeFlowWorkspaceEngineV1?.getWorkspaces?.() || [];
  }

  function getActiveWorkspace() {
    return window.TradeFlowWorkspaceEngineV1?.getActiveWorkspace?.() || null;
  }

  function getSuppliers() {
    return window.TradeFlowVerifiedSupplierNetworkV1?.getSuppliers?.() || [];
  }

  function getAIWorkflows() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowAIAutomationV1") || "[]");
    } catch {
      return [];
    }
  }

  function currency(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
  }

  function estimateWorkspaceRevenue(workspace) {
    if (!workspace) return 0;

    const suppliers = getSuppliers().filter(
      item => !item.workspaceId || item.workspaceId === workspace.id
    );

    const workflows = getAIWorkflows().filter(
      item => !item.workspaceId || item.workspaceId === workspace.id
    );

    const base = workspace.name.length * 75000;
    const supplierBoost = suppliers.length * 125000;
    const workflowBoost = workflows.length * 50000;

    return base + supplierBoost + workflowBoost;
  }

  function getOpportunityScore(workspace) {
    if (!workspace) return 0;

    const suppliers = getSuppliers().filter(
      item => !item.workspaceId || item.workspaceId === workspace.id
    );

    const workflows = getAIWorkflows().filter(
      item => !item.workspaceId || item.workspaceId === workspace.id
    );

    let score = 35;

    if (workspace.product) score += 15;
    if (workspace.targetMarket) score += 15;
    if (suppliers.length) score += 20;
    if (workflows.length) score += 15;

    return Math.min(score, 100);
  }

  function getForecastLabel(score) {
    if (score >= 85) return "High Revenue Opportunity";
    if (score >= 65) return "Strong Opportunity";
    if (score >= 45) return "Developing Opportunity";
    return "Needs More Data";
  }

  function render() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return;

    let panel = document.getElementById("revenueIntelligencePanel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "revenueIntelligencePanel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";
      dashboard.prepend(panel);
    }

    const active = getActiveWorkspace();
    const workspaces = getWorkspaces();

    const totalForecast = workspaces.reduce(
      (sum, ws) => sum + estimateWorkspaceRevenue(ws),
      0
    );

    const activeForecast = estimateWorkspaceRevenue(active);
    const activeScore = getOpportunityScore(active);

    panel.innerHTML = `
      <div class="section-title">💰 Revenue Intelligence Engine V1</div>

      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <h2 style="font-size:28px;font-weight:900;color:white;margin:6px 0;">
            ${active?.name || "No Active Workspace"}
          </h2>
          <p class="muted">
            Revenue forecasting based on workspace focus, verified suppliers and AI workflows.
          </p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:18px;">
        <div class="deal">
          <div class="muted">Active Workspace Forecast</div>
          <h3>${currency(activeForecast)}</h3>
        </div>

        <div class="deal">
          <div class="muted">Total Forecast</div>
          <h3>${currency(totalForecast)}</h3>
        </div>

        <div class="deal">
          <div class="muted">Opportunity Score</div>
          <h3>${activeScore}/100</h3>
        </div>

        <div class="deal">
          <div class="muted">Forecast Status</div>
          <h3>${getForecastLabel(activeScore)}</h3>
        </div>
      </div>

      <div style="margin-top:18px;">
        <h3 style="color:white;font-weight:900;margin-bottom:12px;">
          Workspace Revenue Forecast
        </h3>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;">
          ${
            workspaces.length
              ? workspaces.map(ws => {
                const forecast = estimateWorkspaceRevenue(ws);
                const score = getOpportunityScore(ws);

                return `
                  <div style="padding:14px;border-radius:16px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.16);">
                    <b style="color:white;">${ws.name}</b>
                    <div class="muted">Product: ${ws.product || "Not set"}</div>
                    <div class="muted">Market: ${ws.targetMarket || "Not set"}</div>
                    <div class="muted">Forecast: ${currency(forecast)}</div>
                    <div class="muted">Score: ${score}/100</div>
                    <div style="font-weight:900;color:${score >= 65 ? "#22c55e" : "#facc15"};">
                      ${getForecastLabel(score)}
                    </div>
                  </div>
                `;
              }).join("")
              : `<div class="deal">No workspaces yet.</div>`
          }
        </div>
      </div>
    `;
  }

  function boot() {
    setTimeout(render, 1200);

    document.addEventListener("tradeflow:page-change", function () {
      setTimeout(render, 250);
    });

    setInterval(render, 8000);

    console.log("✅ Revenue Intelligence Engine V1 active");
  }

  window.TradeFlowRevenueIntelligenceEngineV1 = {
    render,
    estimateWorkspaceRevenue,
    getOpportunityScore
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();