/* TradeFlow Subscription + Plan Limit Engine */

(function () {
  const PLAN_KEY = "tradeflowSubscriptionPlan";
  const USAGE_KEY = "tradeflowUsageStats";

  const PLANS = {
    Free: {
      label: "Free",
      price: "₹0",
      aiLimit: 20,
      supplierLimit: 25,
      dealLimit: 20,
      workspaceLimit: 1,
      employeeLimit: 1,
      features: ["Dashboard", "Basic CRM", "Basic Suppliers", "Limited AI"]
    },
    Pro: {
      label: "Pro",
      price: "₹1,999/month",
      aiLimit: 500,
      supplierLimit: 500,
      dealLimit: 300,
      workspaceLimit: 5,
      employeeLimit: 10,
      features: ["AI Copilot", "Supplier Intelligence", "CRM Intelligence", "Outreach", "Automation"]
    },
    Enterprise: {
      label: "Enterprise",
      price: "Custom",
      aiLimit: 10000,
      supplierLimit: 10000,
      dealLimit: 5000,
      workspaceLimit: 100,
      employeeLimit: 200,
      features: ["Unlimited AI", "Multi-company", "Admin Controls", "Priority Support", "Custom Workflows"]
    }
  };

  function $(id) {
    return document.getElementById(id);
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

  function getPlanName() {
    return localStorage.getItem(PLAN_KEY) || "Free";
  }

  function getPlan() {
    return PLANS[getPlanName()] || PLANS.Free;
  }

  function setPlan(planName) {
    if (!PLANS[planName]) return;
    localStorage.setItem(PLAN_KEY, planName);
    renderSubscriptionPanels();
    showUpgradeToast(`Plan switched to ${planName}.`);
  }

  function getUsage() {
    return getJson(USAGE_KEY, {
      aiUsed: 0,
      suppliersUsed: 0,
      dealsUsed: 0,
      workspacesUsed: 0,
      employeesUsed: 0
    });
  }

  function saveUsage(usage) {
    setJson(USAGE_KEY, usage);
    renderSubscriptionPanels();
  }

  function readNumber(id) {
    const el = $(id);
    if (!el) return 0;
    return Number((el.innerText || "0").replace(/[^\d.-]/g, "")) || 0;
  }

  function syncUsageFromDashboard() {
    const usage = getUsage();

    usage.suppliersUsed = readNumber("supplierCount") || usage.suppliersUsed || 0;
    usage.dealsUsed = readNumber("dashboardDealCount") || usage.dealsUsed || 0;
    usage.workspacesUsed = readNumber("dashboardWorkspaceCount") || usage.workspacesUsed || 0;
    usage.employeesUsed = readNumber("employeeCount") || usage.employeesUsed || 0;

    saveUsage(usage);
  }

  function incrementAIUsage() {
    const usage = getUsage();
    usage.aiUsed = Number(usage.aiUsed || 0) + 1;
    saveUsage(usage);
  }

  function percent(used, limit) {
    if (!limit) return 0;
    return Math.min(100, Math.round((Number(used || 0) / Number(limit || 1)) * 100));
  }

  function isOverLimit(type) {
    const plan = getPlan();
    const usage = getUsage();

    const map = {
      ai: [usage.aiUsed, plan.aiLimit],
      suppliers: [usage.suppliersUsed, plan.supplierLimit],
      deals: [usage.dealsUsed, plan.dealLimit],
      workspaces: [usage.workspacesUsed, plan.workspaceLimit],
      employees: [usage.employeesUsed, plan.employeeLimit]
    };

    const [used, limit] = map[type] || [0, 999999];
    return Number(used || 0) >= Number(limit || 0);
  }

  function showUpgradeToast(message) {
    if (window.TradeFlowPremiumUX && typeof window.TradeFlowPremiumUX.toast === "function") {
      window.TradeFlowPremiumUX.toast(message);
      return;
    }
    alert(message);
  }

  function requirePlan(type, actionLabel) {
    if (!isOverLimit(type)) return true;

    showUpgradeToast(`Limit reached for ${actionLabel}. Upgrade to Pro or Enterprise.`);
    if (window.TradeFlowSubscriptionEngine) {
      window.TradeFlowSubscriptionEngine.openUpgrade();
    }
    return false;
  }

  function injectStyles() {
    if ($("subscriptionEngineStyles")) return;

    const style = document.createElement("style");
    style.id = "subscriptionEngineStyles";
    style.innerHTML = `
      .subscription-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit,minmax(240px,1fr));
        gap: 16px;
        margin-top: 18px;
      }

      .plan-card {
        padding: 20px;
        border-radius: 24px;
        background: linear-gradient(135deg, rgba(15,23,42,.9), rgba(2,6,23,.68));
        border: 1px solid rgba(148,163,184,.16);
      }

      .plan-card.active {
        border-color: rgba(56,189,248,.5);
        box-shadow: 0 22px 70px rgba(14,165,233,.16);
      }

      .plan-price {
        font-size: 28px;
        font-weight: 950;
        color: white;
        margin: 10px 0;
      }

      .usage-meter {
        height: 9px;
        border-radius: 999px;
        background: rgba(148,163,184,.16);
        overflow: hidden;
        margin: 8px 0 12px;
      }

      .usage-meter span {
        display: block;
        height: 100%;
        border-radius: 999px;
        width: 0;
        background: linear-gradient(90deg,#38bdf8,#8b5cf6,#22c55e);
        transition: width .5s ease;
      }

      .locked-feature {
        opacity: .55;
        filter: grayscale(.4);
        pointer-events: none;
      }

      .upgrade-modal {
        position: fixed;
        inset: 0;
        z-index: 10020;
        display: none;
        align-items: center;
        justify-content: center;
        background: rgba(2,6,23,.72);
        backdrop-filter: blur(12px);
        padding: 18px;
      }

      .upgrade-modal.show {
        display: flex;
      }

      .upgrade-box {
        width: min(980px, 100%);
        max-height: 90vh;
        overflow: auto;
        padding: 24px;
        border-radius: 30px;
        background: rgba(15,23,42,.97);
        border: 1px solid rgba(125,211,252,.24);
        box-shadow: 0 34px 120px rgba(0,0,0,.5);
      }
    `;
    document.head.appendChild(style);
  }

  function usageRow(label, used, limit, id) {
    return `
      <div class="deal">
        <b>${label}</b><br>
        ${used} / ${limit}
        <div class="usage-meter"><span id="${id}" style="width:${percent(used, limit)}%"></span></div>
      </div>
    `;
  }

  function buildDashboardPanel() {
    const dashboard = $("dashboardPage");
    if (!dashboard || $("subscriptionDashboardPanel")) return;

    const panel = document.createElement("div");
    panel.id = "subscriptionDashboardPanel";
    panel.className = "card ai-panel";
    panel.innerHTML = `
      <div class="section-title">💳 Subscription & Usage Control</div>
      <p class="muted">Money-ready plan limits for AI usage, suppliers, CRM, workspaces, and team seats.</p>

      <div id="subscriptionUsageSummary"></div>

      <button class="btn" onclick="TradeFlowSubscriptionEngine.openUpgrade()">View Plans / Upgrade</button>
    `;

    dashboard.appendChild(panel);
  }

  function buildAdminPanel() {
    const masterPage = $("masterPage");
    if (!masterPage || $("subscriptionAdminPanel")) return;

    const panel = document.createElement("div");
    panel.id = "subscriptionAdminPanel";
    panel.className = "card subscription-card";
    panel.innerHTML = `
      <div class="section-title">💳 SaaS Plan Control</div>
      <p class="muted">Control current plan for demo/testing. Later this connects to Razorpay/Stripe.</p>

      <select id="subscriptionPlanSelector">
        <option value="Free">Free</option>
        <option value="Pro">Pro</option>
        <option value="Enterprise">Enterprise</option>
      </select>

      <button class="btn" onclick="TradeFlowSubscriptionEngine.applySelectedPlan()">Apply Plan</button>

      <div id="adminSubscriptionSummary" style="margin-top:14px;"></div>
    `;

    masterPage.appendChild(panel);
  }

  function buildUpgradeModal() {
    if ($("tradeflowUpgradeModal")) return;

    const modal = document.createElement("div");
    modal.id = "tradeflowUpgradeModal";
    modal.className = "upgrade-modal";
    modal.innerHTML = `
      <div class="upgrade-box">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
          <div>
            <div class="section-title">Upgrade TradeFlow</div>
            <p class="muted">Choose the plan that matches your export/import business scale.</p>
          </div>
          <button class="danger-btn" onclick="TradeFlowSubscriptionEngine.closeUpgrade()">Close</button>
        </div>

        <div id="upgradePlanCards" class="subscription-grid"></div>

        <p class="muted" style="margin-top:16px;">
          Payment gateway is not connected yet. These plan controls are ready for Razorpay/Stripe integration.
        </p>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function renderPlanCards() {
    const box = $("upgradePlanCards");
    if (!box) return;

    const current = getPlanName();

    box.innerHTML = Object.values(PLANS).map(plan => `
      <div class="plan-card ${current === plan.label ? "active" : ""}">
        <h2 style="color:white;margin:0;">${plan.label}</h2>
        <div class="plan-price">${plan.price}</div>
        <p class="muted">AI Limit: ${plan.aiLimit}</p>
        <p class="muted">Suppliers: ${plan.supplierLimit}</p>
        <p class="muted">Deals: ${plan.dealLimit}</p>
        <p class="muted">Workspaces: ${plan.workspaceLimit}</p>
        <p class="muted">Employees: ${plan.employeeLimit}</p>

        <div class="deal">
          <b>Included:</b><br>
          ${plan.features.join("<br>")}
        </div>

        <button class="btn" onclick="TradeFlowSubscriptionEngine.setPlan('${plan.label}')">
          ${current === plan.label ? "Current Plan" : "Choose " + plan.label}
        </button>
      </div>
    `).join("");
  }

  function renderSubscriptionPanels() {
    syncUsageFromDashboard();

    const plan = getPlan();
    const usage = getUsage();

    const summary = `
      <div class="subscription-grid">
        <div class="plan-card active">
          <h2 style="color:white;margin:0;">Current Plan: ${plan.label}</h2>
          <div class="plan-price">${plan.price}</div>
          <p class="muted">Upgrade controls are ready for payment integration.</p>
        </div>

        <div>
          ${usageRow("AI Usage", usage.aiUsed, plan.aiLimit, "aiUsageBar")}
          ${usageRow("Suppliers", usage.suppliersUsed, plan.supplierLimit, "supplierUsageBar")}
        </div>

        <div>
          ${usageRow("CRM Deals", usage.dealsUsed, plan.dealLimit, "dealUsageBar")}
          ${usageRow("Workspaces", usage.workspacesUsed, plan.workspaceLimit, "workspaceUsageBar")}
        </div>
      </div>
    `;

    const dash = $("subscriptionUsageSummary");
    if (dash) dash.innerHTML = summary;

    const admin = $("adminSubscriptionSummary");
    if (admin) admin.innerHTML = summary;

    const selector = $("subscriptionPlanSelector");
    if (selector) selector.value = getPlanName();

    renderPlanCards();
  }

  function openUpgrade() {
    buildUpgradeModal();
    renderPlanCards();
    $("tradeflowUpgradeModal")?.classList.add("show");
  }

  function closeUpgrade() {
    $("tradeflowUpgradeModal")?.classList.remove("show");
  }

  function applySelectedPlan() {
    const selector = $("subscriptionPlanSelector");
    if (selector) setPlan(selector.value);
  }

  function patchUsageTracking() {
    if (window.TradeFlowSubscriptionPatched) return;
    window.TradeFlowSubscriptionPatched = true;

    const originalAsk = window.TradeFlowAIChat?.ask;
    if (window.TradeFlowAIChat && typeof originalAsk === "function") {
      window.TradeFlowAIChat.ask = function () {
        if (!requirePlan("ai", "AI usage")) return;
        incrementAIUsage();
        return originalAsk();
      };
    }

    const originalAddSupplier = window.addSupplier;
    if (typeof originalAddSupplier === "function") {
      window.addSupplier = function () {
        if (!requirePlan("suppliers", "suppliers")) return;
        return originalAddSupplier();
      };
    }

    const originalAddDeal = window.addDeal;
    if (typeof originalAddDeal === "function") {
      window.addDeal = function () {
        if (!requirePlan("deals", "CRM deals")) return;
        return originalAddDeal();
      };
    }

    const originalAddWorkspace = window.addWorkspace;
    if (typeof originalAddWorkspace === "function") {
      window.addWorkspace = function () {
        if (!requirePlan("workspaces", "workspaces")) return;
        return originalAddWorkspace();
      };
    }

    const originalAddEmployee = window.addEmployee;
    if (typeof originalAddEmployee === "function") {
      window.addEmployee = function () {
        if (!requirePlan("employees", "employees")) return;
        return originalAddEmployee();
      };
    }
  }

  function boot() {
    injectStyles();
    buildUpgradeModal();
    buildDashboardPanel();
    buildAdminPanel();

    setTimeout(() => {
      patchUsageTracking();
      renderSubscriptionPanels();
    }, 1300);

    setInterval(() => {
      patchUsageTracking();
      renderSubscriptionPanels();
    }, 5000);
  }

  window.TradeFlowSubscriptionEngine = {
    PLANS,
    getPlan,
    getUsage,
    setPlan,
    openUpgrade,
    closeUpgrade,
    applySelectedPlan,
    incrementAIUsage,
    requirePlan,
    render: renderSubscriptionPanels
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
