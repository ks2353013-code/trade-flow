/* TradeFlow Autonomous Trade Agent V1 */

(function () {
  if (window.TradeFlowAutonomousTradeAgentV1) return;

  function getWorkspace() {
    return window.TradeFlowWorkspaceEngineV1?.getActiveWorkspace?.() || null;
  }

  function getSuppliers() {
    return window.TradeFlowVerifiedSupplierNetworkV1?.getSuppliers?.() || [];
  }

  function getLeads() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowVerifiedLeadsV1") || "[]");
    } catch {
      return [];
    }
  }

  function getWorkflows() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowAIAutomationV1") || "[]");
    } catch {
      return [];
    }
  }

  function getForecast() {
    const ws = getWorkspace();

    if (
      ws &&
      window.TradeFlowRevenueIntelligenceEngineV1?.estimateWorkspaceRevenue
    ) {
      return window.TradeFlowRevenueIntelligenceEngineV1
        .estimateWorkspaceRevenue(ws);
    }

    return 0;
  }

  function currency(v) {
    return "₹" + Number(v || 0).toLocaleString("en-IN");
  }

  function buildInsights() {
    const workspace = getWorkspace();
    const suppliers = getSuppliers();
    const leads = getLeads();
    const workflows = getWorkflows();
    const forecast = getForecast();

    const opportunities = [];
    const risks = [];
    const actions = [];

    if (suppliers.length > 0) {
      const bestSupplier = [...suppliers]
        .sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0))[0];

      opportunities.push(
        `Best supplier opportunity: ${bestSupplier.name} (${bestSupplier.trustScore}/100 trust score)`
      );

      actions.push(
        `Contact ${bestSupplier.name} and start sourcing discussion`
      );
    }

    if (leads.length > 0) {
      opportunities.push(
        `${leads.length} verified lead(s) available for outreach`
      );

      actions.push(
        `Launch outreach campaign for verified leads`
      );
    }

    if (forecast > 0) {
      opportunities.push(
        `Estimated revenue opportunity ${currency(forecast)}`
      );
    }

    const riskySuppliers = suppliers.filter(
      s => (s.riskScore || 0) >= 60
    );

    if (riskySuppliers.length) {
      risks.push(
        `${riskySuppliers.length} supplier(s) classified as high risk`
      );
    }

    if (!suppliers.length) {
      risks.push(
        "No suppliers available inside supplier network"
      );

      actions.push(
        "Add suppliers using Verified Supplier Network"
      );
    }

    if (!leads.length) {
      risks.push(
        "No verified leads available"
      );

      actions.push(
        "Generate and verify new leads"
      );
    }

    if (!workflows.length) {
      risks.push(
        "No AI workflows running"
      );

      actions.push(
        "Start at least one AI workflow"
      );
    }

    if (!workspace) {
      risks.push(
        "No active workspace selected"
      );

      actions.push(
        "Select active workspace"
      );
    }

    return {
      opportunities,
      risks,
      actions
    };
  }

  function runAnalysis() {
    const data = buildInsights();

    localStorage.setItem(
      "tradeflowAutonomousTradeAgentV1",
      JSON.stringify({
        lastRun: new Date().toISOString(),
        ...data
      })
    );

    render();
  }

  function render() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return;

    let panel = document.getElementById(
      "autonomousTradeAgentPanel"
    );

    if (!panel) {
      panel = document.createElement("div");

      panel.id = "autonomousTradeAgentPanel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";

      dashboard.prepend(panel);
    }

    const data = buildInsights();

    panel.innerHTML = `
      <div class="section-title">
        🤖 Autonomous Trade Agent V1
      </div>

      <h2 style="
        font-size:28px;
        font-weight:900;
        color:white;
        margin-top:8px;
      ">
        TradeFlow AI Brain
      </h2>

      <p class="muted">
        Workspace Intelligence • Revenue Intelligence • Supplier Intelligence
      </p>

      <div style="
        display:flex;
        gap:12px;
        margin-top:16px;
      ">
        <button class="btn"
          onclick="TradeFlowAutonomousTradeAgentV1.runAnalysis()">
          Run AI Analysis
        </button>
      </div>

      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
        gap:14px;
        margin-top:18px;
      ">

        <div class="deal">
          <h3>📈 Opportunities</h3>

          ${
            data.opportunities.length
              ? data.opportunities.map(
                  item => `<p>${item}</p>`
                ).join("")
              : "<p>No opportunities detected.</p>"
          }
        </div>

        <div class="deal">
          <h3>⚠ Risks</h3>

          ${
            data.risks.length
              ? data.risks.map(
                  item => `<p>${item}</p>`
                ).join("")
              : "<p>No risks detected.</p>"
          }
        </div>

        <div class="deal">
          <h3>✅ Recommended Actions</h3>

          ${
            data.actions.length
              ? data.actions.map(
                  item => `<p>${item}</p>`
                ).join("")
              : "<p>No actions required.</p>"
          }
        </div>

      </div>
    `;
  }

  function boot() {
    setTimeout(render, 1200);

    setInterval(render, 10000);

    console.log(
      "✅ Autonomous Trade Agent V1 active"
    );
  }

  window.TradeFlowAutonomousTradeAgentV1 = {
    runAnalysis,
    render
  };

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      boot
    );
  } else {
    boot();
  }
})();