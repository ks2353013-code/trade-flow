/* TradeFlow Intelligence Orchestrator V1
   One Intelligence Layer controlling all modules
*/

(function () {
  if (window.TradeFlowIntelligenceOrchestratorV1) return;

  function getWorkspace() {
    return window.TradeFlowWorkspaceEngineV1?.getActiveWorkspace?.() || null;
  }

  function getWorkspaces() {
    return window.TradeFlowWorkspaceEngineV1?.getWorkspaces?.() || [];
  }

  function getSuppliers() {
    return window.TradeFlowVerifiedSupplierNetworkV1?.getSuppliers?.() || [];
  }

  function getLeads() {
    try {
      return JSON.parse(
        localStorage.getItem("tradeflowVerifiedLeadsV1") || "[]"
      );
    } catch {
      return [];
    }
  }

  function getWorkflows() {
    try {
      return JSON.parse(
        localStorage.getItem("tradeflowAIAutomationV1") || "[]"
      );
    } catch {
      return [];
    }
  }

  function getPlan() {
    try {
      const user = JSON.parse(
        localStorage.getItem("tradeflowUser") || "{}"
      );

      return (
        user.subscriptionPlan ||
        localStorage.getItem("tradeflowSubscriptionPlan") ||
        "Starter"
      );
    } catch {
      return "Starter";
    }
  }

  function buildSystemState() {
    const workspace = getWorkspace();
    const workspaces = getWorkspaces();
    const suppliers = getSuppliers();
    const leads = getLeads();
    const workflows = getWorkflows();

    return {
      workspace,
      workspaces,
      suppliers,
      leads,
      workflows,
      plan: getPlan()
    };
  }

  function generateActions(state) {
    const actions = [];

    if (!state.workspace) {
      actions.push({
        priority: "Critical",
        module: "Workspace",
        action: "Create or select workspace"
      });
    }

    if (!state.suppliers.length) {
      actions.push({
        priority: "High",
        module: "Supplier Network",
        action: "Add verified suppliers"
      });
    }

    if (!state.leads.length) {
      actions.push({
        priority: "High",
        module: "Lead Network",
        action: "Generate verified leads"
      });
    }

    if (!state.workflows.length) {
      actions.push({
        priority: "High",
        module: "AI Automation",
        action: "Start first workflow"
      });
    }

    if (
      state.suppliers.length &&
      state.leads.length &&
      !state.workflows.length
    ) {
      actions.push({
        priority: "Medium",
        module: "AI Automation",
        action: "Connect suppliers and leads into workflow"
      });
    }

    return actions;
  }

  function generateSystemScore(state) {
    let score = 0;

    if (state.workspace) score += 20;
    if (state.suppliers.length) score += 20;
    if (state.leads.length) score += 20;
    if (state.workflows.length) score += 20;
    if (state.plan !== "Starter") score += 20;

    return Math.min(score, 100);
  }

  function runOrchestrator() {
    const state = buildSystemState();
    const actions = generateActions(state);
    const score = generateSystemScore(state);

    localStorage.setItem(
      "tradeflowIntelligenceOrchestratorV1",
      JSON.stringify({
        score,
        actions,
        lastRun: new Date().toISOString()
      })
    );

    render();
  }

  function render() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return;

    let panel = document.getElementById(
      "tradeflowIntelligenceOrchestratorPanel"
    );

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "tradeflowIntelligenceOrchestratorPanel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";

      dashboard.prepend(panel);
    }

    const state = buildSystemState();
    const actions = generateActions(state);
    const score = generateSystemScore(state);

    panel.innerHTML = `
      <div class="section-title">
        🧠 TradeFlow Intelligence Orchestrator V1
      </div>

      <h2 style="
        font-size:30px;
        font-weight:900;
        color:white;
        margin-top:8px;
      ">
        One Intelligence Layer
      </h2>

      <p class="muted">
        Central coordination layer for all TradeFlow engines.
      </p>

      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
        gap:14px;
        margin-top:18px;
      ">

        <div class="deal">
          <div class="muted">System Readiness</div>
          <h3>${score}/100</h3>
        </div>

        <div class="deal">
          <div class="muted">Workspaces</div>
          <h3>${state.workspaces.length}</h3>
        </div>

        <div class="deal">
          <div class="muted">Suppliers</div>
          <h3>${state.suppliers.length}</h3>
        </div>

        <div class="deal">
          <div class="muted">Leads</div>
          <h3>${state.leads.length}</h3>
        </div>

        <div class="deal">
          <div class="muted">AI Workflows</div>
          <h3>${state.workflows.length}</h3>
        </div>

      </div>

      <div style="
        margin-top:18px;
        display:flex;
        gap:10px;
      ">
        <button class="btn"
          onclick="TradeFlowIntelligenceOrchestratorV1.runOrchestrator()">
          Run Intelligence Analysis
        </button>
      </div>

      <div style="
        margin-top:18px;
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(320px,1fr));
        gap:14px;
      ">

        <div class="deal">
          <h3>🎯 Recommended Actions</h3>

          ${
            actions.length
              ? actions.map(item => `
                <p>
                  <b>${item.priority}</b> —
                  ${item.module}: ${item.action}
                </p>
              `).join("")
              : "<p>System operating normally.</p>"
          }
        </div>

        <div class="deal">
          <h3>📡 Module Status</h3>

          <p>Workspace Engine: ${state.workspaces.length ? "✅" : "❌"}</p>
          <p>Supplier Network: ${state.suppliers.length ? "✅" : "❌"}</p>
          <p>Lead Network: ${state.leads.length ? "✅" : "❌"}</p>
          <p>AI Automation: ${state.workflows.length ? "✅" : "❌"}</p>
          <p>Subscription: ${state.plan}</p>
        </div>

      </div>
    `;
  }

  function boot() {
    setTimeout(render, 1500);

    setInterval(render, 10000);

    console.log(
      "✅ TradeFlow Intelligence Orchestrator V1 active"
    );
  }

  window.TradeFlowIntelligenceOrchestratorV1 = {
    runOrchestrator,
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