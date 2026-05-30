/* TradeFlow Subscription Engine Hardening V1
   Frontend plan control for workspaces, AI workflows, verified leads, analytics and executive modules.
*/

(function () {
  if (window.TradeFlowSubscriptionEngineHardeningV1) return;

  const PLAN_LIMITS = {
    Starter: {
      workspaces: 1,
      employees: 1,
      verifiedLeads: 25,
      aiWorkflows: 5,
      analytics: false,
      executiveDashboard: false,
      label: "Starter"
    },

    "Pro Exporter": {
      workspaces: 5,
      employees: 10,
      verifiedLeads: 500,
      aiWorkflows: 100,
      analytics: true,
      executiveDashboard: false,
      label: "Pro Exporter"
    },

    Growth: {
      workspaces: 15,
      employees: 50,
      verifiedLeads: 2000,
      aiWorkflows: 500,
      analytics: true,
      executiveDashboard: true,
      label: "Growth"
    },

    "Enterprise AI OS": {
      workspaces: 999,
      employees: 999,
      verifiedLeads: 99999,
      aiWorkflows: 99999,
      analytics: true,
      executiveDashboard: true,
      label: "Enterprise AI OS"
    }
  };

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowUser") || "null");
    } catch {
      return null;
    }
  }

  function getPlanName() {
    const user = getUser() || {};

    return (
      user.subscriptionPlan ||
      user.plan ||
      localStorage.getItem("tradeflowSubscriptionPlan") ||
      "Starter"
    );
  }

  function getPlan() {
    return PLAN_LIMITS[getPlanName()] || PLAN_LIMITS.Starter;
  }

  function countWorkspaces() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowWorkspacesV1") || "[]").length;
    } catch {
      return 0;
    }
  }

  function countVerifiedLeads() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowVerifiedLeadsV1") || "[]").length;
    } catch {
      return 0;
    }
  }

  function countAIWorkflows() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowAIAutomationV1") || "[]").length;
    } catch {
      return 0;
    }
  }

  function canCreateWorkspace() {
    return countWorkspaces() < getPlan().workspaces;
  }

  function canAddVerifiedLead() {
    return countVerifiedLeads() < getPlan().verifiedLeads;
  }

  function canCreateAIWorkflow() {
    return countAIWorkflows() < getPlan().aiWorkflows;
  }

  function canAccessAnalytics() {
    return !!getPlan().analytics;
  }

  function canAccessExecutiveDashboard() {
    return !!getPlan().executiveDashboard;
  }

  function showUpgradeMessage(feature) {
    alert(
      `${feature} is limited on your current ${getPlan().label} plan. Please upgrade to unlock more capacity.`
    );
  }

  function patchWorkspaceCreation() {
    const engine = window.TradeFlowWorkspaceEngineV1;
    if (!engine || engine.__subscriptionPatched) return;

    const originalCreate = engine.createWorkspace;

    if (typeof originalCreate === "function") {
      engine.createWorkspace = function () {
        if (!canCreateWorkspace()) {
          showUpgradeMessage("Workspace creation");
          return;
        }

        return originalCreate.apply(this, arguments);
      };
    }

    engine.__subscriptionPatched = true;
  }

  function patchVerifiedLeadCreation() {
    const engine = window.TradeFlowVerifiedLeadInfrastructureV1;
    if (!engine || engine.__subscriptionPatched) return;

    const originalAddLead = engine.addLead;
    const originalAddDemoLead = engine.addDemoLead;

    if (typeof originalAddLead === "function") {
      engine.addLead = function () {
        if (!canAddVerifiedLead()) {
          showUpgradeMessage("Verified leads");
          return;
        }

        return originalAddLead.apply(this, arguments);
      };
    }

    if (typeof originalAddDemoLead === "function") {
      engine.addDemoLead = function () {
        if (!canAddVerifiedLead()) {
          showUpgradeMessage("Verified leads");
          return;
        }

        return originalAddDemoLead.apply(this, arguments);
      };
    }

    engine.__subscriptionPatched = true;
  }

  function patchAIWorkflowCreation() {
    const engine = window.TradeFlowAIAutomationLayerV1;
    if (!engine || engine.__subscriptionPatched) return;

    const originalCreate = engine.createAutomationFlow;
    const originalDemo = engine.addDemoAutomation;

    if (typeof originalCreate === "function") {
      engine.createAutomationFlow = function () {
        if (!canCreateAIWorkflow()) {
          showUpgradeMessage("AI workflows");
          return;
        }

        return originalCreate.apply(this, arguments);
      };
    }

    if (typeof originalDemo === "function") {
      engine.addDemoAutomation = function () {
        if (!canCreateAIWorkflow()) {
          showUpgradeMessage("AI workflows");
          return;
        }

        return originalDemo.apply(this, arguments);
      };
    }

    engine.__subscriptionPatched = true;
  }

  function gatePanels() {
    const analyticsPanel = document.getElementById("workspaceAnalyticsV1Panel");
    const executivePanel = document.getElementById("executiveIntelligenceDashboardPanel");

    if (analyticsPanel && !canAccessAnalytics()) {
      analyticsPanel.innerHTML = lockedPanel("📊 Workspace Analytics", "Pro Exporter");
    }

    if (executivePanel && !canAccessExecutiveDashboard()) {
      executivePanel.innerHTML = lockedPanel("👑 Executive Intelligence Dashboard", "Growth or Enterprise AI OS");
    }
  }

  function lockedPanel(feature, plan) {
    return `
      <div class="section-title">🔒 ${feature} Locked</div>
      <p class="muted">
        Upgrade to ${plan} to unlock this feature.
      </p>
      <button class="btn" onclick="TradeFlowSubscriptionEngineHardeningV1.openUpgrade()">
        Request Upgrade
      </button>
    `;
  }

  function openUpgrade() {
    if (typeof window.showPage === "function") {
      window.showPage("billing");
    } else {
      alert("Open Billing/Subscription section to upgrade.");
    }
  }

  function renderStatus() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return;

    let panel = document.getElementById("subscriptionHardeningPanel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "subscriptionHardeningPanel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";
      dashboard.prepend(panel);
    }

    const plan = getPlan();

    panel.innerHTML = `
      <div class="section-title">💳 Subscription Engine Hardening V1</div>

      <h2 style="font-size:26px;font-weight:900;color:white;margin:6px 0;">
        Current Plan: ${plan.label}
      </h2>

      <p class="muted">
        Access is controlled by workspace, verified lead, AI workflow, analytics and executive limits.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin-top:18px;">
        <div class="deal">
          <div class="muted">Workspaces</div>
          <h3>${countWorkspaces()} / ${plan.workspaces === 999 ? "∞" : plan.workspaces}</h3>
        </div>

        <div class="deal">
          <div class="muted">Verified Leads</div>
          <h3>${countVerifiedLeads()} / ${plan.verifiedLeads >= 99999 ? "∞" : plan.verifiedLeads}</h3>
        </div>

        <div class="deal">
          <div class="muted">AI Workflows</div>
          <h3>${countAIWorkflows()} / ${plan.aiWorkflows >= 99999 ? "∞" : plan.aiWorkflows}</h3>
        </div>

        <div class="deal">
          <div class="muted">Analytics</div>
          <h3>${plan.analytics ? "Unlocked" : "Locked"}</h3>
        </div>

        <div class="deal">
          <div class="muted">Executive Dashboard</div>
          <h3>${plan.executiveDashboard ? "Unlocked" : "Locked"}</h3>
        </div>
      </div>

      <div style="margin-top:18px;">
        <button class="btn" onclick="TradeFlowSubscriptionEngineHardeningV1.openUpgrade()">
          Manage Subscription
        </button>
      </div>
    `;
  }

  function apply() {
    patchWorkspaceCreation();
    patchVerifiedLeadCreation();
    patchAIWorkflowCreation();
    gatePanels();
    renderStatus();
  }

  function boot() {
    setTimeout(apply, 1000);

    setInterval(apply, 5000);

    document.addEventListener("tradeflow:page-change", function () {
      setTimeout(apply, 300);
    });

    console.log("✅ Subscription Engine Hardening V1 active");
  }

  window.TradeFlowSubscriptionEngineHardeningV1 = {
    getPlan,
    canCreateWorkspace,
    canAddVerifiedLead,
    canCreateAIWorkflow,
    canAccessAnalytics,
    canAccessExecutiveDashboard,
    openUpgrade,
    apply
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();