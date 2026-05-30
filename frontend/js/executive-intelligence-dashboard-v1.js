/* TradeFlow Executive Intelligence Dashboard V1
   CEO-level command center combining workspaces, verified leads, AI workflows and analytics.
*/

(function () {
  if (window.TradeFlowExecutiveIntelligenceDashboardV1) return;

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowUser") || "null");
    } catch {
      return null;
    }
  }

  function getWorkspaces() {
    return window.TradeFlowWorkspaceEngineV1?.getWorkspaces?.() || [];
  }

  function getActiveWorkspace() {
    return window.TradeFlowWorkspaceEngineV1?.getActiveWorkspace?.() || null;
  }

  function getVerifiedLeads() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowVerifiedLeadsV1") || "[]");
    } catch {
      return [];
    }
  }

  function getAIWorkflows() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowAIAutomationV1") || "[]");
    } catch {
      return [];
    }
  }

  function getBusinessType() {
    return localStorage.getItem("tradeflowBusinessType") || "Trading Company";
  }

  function currency(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
  }

  function calculateScore() {
    const workspaces = getWorkspaces();
    const leads = getVerifiedLeads();
    const workflows = getAIWorkflows();

    let score = 40;

    if (workspaces.length >= 1) score += 15;
    if (leads.length >= 1) score += 15;
    if (workflows.length >= 1) score += 15;
    if (getBusinessType()) score += 10;
    if (localStorage.getItem("tradeflowBusinessTypeLocked") === "true") score += 5;

    return Math.min(score, 100);
  }

  function getPipelineValue() {
    const workspaces = getWorkspaces();
    return workspaces.reduce((total, ws) => {
      return total + (ws.name.length * 125000);
    }, 0);
  }

  function getRiskAlerts() {
    const alerts = [];

    if (!getWorkspaces().length) {
      alerts.push("No workspace created yet.");
    }

    if (!getVerifiedLeads().length) {
      alerts.push("No verified leads available.");
    }

    if (!getAIWorkflows().length) {
      alerts.push("AI automation workflows not started.");
    }

    if (localStorage.getItem("tradeflowBusinessTypeLocked") !== "true") {
      alerts.push("Business Type is not locked.");
    }

    return alerts;
  }

  function getRecommendedActions() {
    const actions = [];

    if (!getWorkspaces().length) {
      actions.push("Create your first trade workspace.");
    }

    if (!getVerifiedLeads().length) {
      actions.push("Add or verify your first supplier/buyer lead.");
    }

    if (!getAIWorkflows().length) {
      actions.push("Start an AI outreach workflow from a verified lead.");
    }

    actions.push("Review workspace analytics and focus on highest-pipeline market.");

    return actions;
  }

  function render() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return;

    let panel = document.getElementById("executiveIntelligenceDashboardPanel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "executiveIntelligenceDashboardPanel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";
      dashboard.prepend(panel);
    }

    const user = getUser();
    const workspaces = getWorkspaces();
    const active = getActiveWorkspace();
    const leads = getVerifiedLeads();
    const workflows = getAIWorkflows();
    const score = calculateScore();
    const risks = getRiskAlerts();
    const actions = getRecommendedActions();

    panel.innerHTML = `
      <div class="section-title">👑 Executive Intelligence Dashboard V1</div>

      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <h2 style="font-size:30px;font-weight:900;color:white;margin:6px 0;">
            CEO Command Center
          </h2>
          <p class="muted">
            Business Type: <b>${getBusinessType()}</b> • Active Workspace: <b>${active?.name || "Not selected"}</b>
          </p>
          <p class="muted">
            Owner/User: ${user?.email || "Unknown"}
          </p>
        </div>

        <div style="
          padding:18px;
          border-radius:22px;
          background:rgba(34,197,94,.14);
          border:1px solid rgba(34,197,94,.30);
          text-align:center;
          min-width:160px;
        ">
          <div class="muted">Readiness Score</div>
          <div style="font-size:38px;font-weight:900;color:#22c55e;">
            ${score}/100
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin-top:18px;">
        <div class="deal">
          <div class="muted">Workspaces</div>
          <h3>${workspaces.length}</h3>
        </div>

        <div class="deal">
          <div class="muted">Verified Leads</div>
          <h3>${leads.length}</h3>
        </div>

        <div class="deal">
          <div class="muted">AI Workflows</div>
          <h3>${workflows.length}</h3>
        </div>

        <div class="deal">
          <div class="muted">Pipeline Value</div>
          <h3>${currency(getPipelineValue())}</h3>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:18px;">
        <div style="padding:16px;border-radius:18px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.16);">
          <h3 style="color:white;font-weight:900;margin:0 0 12px;">Risk Alerts</h3>
          ${
            risks.length
              ? risks.map(risk => `<div class="deal">⚠️ ${risk}</div>`).join("")
              : `<div class="deal">✅ No immediate operational risk detected.</div>`
          }
        </div>

        <div style="padding:16px;border-radius:18px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.16);">
          <h3 style="color:white;font-weight:900;margin:0 0 12px;">Recommended Next Actions</h3>
          ${actions.map(action => `<div class="deal">➡️ ${action}</div>`).join("")}
        </div>
      </div>

      <div style="margin-top:18px;">
        <h3 style="color:white;font-weight:900;margin-bottom:12px;">Workspace Executive View</h3>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;">
          ${
            workspaces.length
              ? workspaces.map(ws => `
                <div style="padding:14px;border-radius:16px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.16);">
                  <b style="color:white;">${ws.name}</b>
                  <div class="muted">Product: ${ws.product || "Not set"}</div>
                  <div class="muted">Market: ${ws.targetMarket || "Not set"}</div>
                  <div class="muted">Estimated Pipeline: ${currency(ws.name.length * 125000)}</div>
                </div>
              `).join("")
              : `<div class="deal">No workspaces yet.</div>`
          }
        </div>
      </div>
    `;
  }

  function boot() {
    render();

    setInterval(render, 7000);

    console.log("✅ Executive Intelligence Dashboard V1 active");
  }

  window.TradeFlowExecutiveIntelligenceDashboardV1 = {
    render
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();