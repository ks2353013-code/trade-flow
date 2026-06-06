/* TradeFlow AI subscription gate.
   Backend authorization remains authoritative; this module keeps Free-plan UI honest.
*/

(function () {
  if (window.TradeFlowAISubscriptionGate) return;

  const PLAN_KEY = "tradeflowSubscriptionPlan";
  const UPGRADE_MESSAGE = "Upgrade to Starter to unlock TradeFlow AI";
  const BLOCKED_PAGES = new Set(["ai", "executiveTower"]);
  const BLOCKED_SELECTORS = [
    "button[onclick*=\"showPage('ai')\"]",
    "button[onclick*=\"showPage('executiveTower')\"]",
    "[data-executive-tower-nav='true']",
    ".quick-card.ai-panel",
    "#aiPage",
    "#executiveTowerPage",
    "#aiCommandCenterV2",
    "#workspaceAIMemoryPanel",
    "#executiveAiAnalyticsPanel",
    "#executiveAiAnalyticsDashboard",
    "#executiveAIAnalyticsDashboard",
    "#aiExecutiveWorkspaceBrainPanel",
    "#aiDailyCommandCenter",
    "#aiOperationsCenter"
  ];

  let applying = false;

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function normalizePlan(plan) {
    const value = String(plan || "").trim().toLowerCase();

    if (value.includes("free")) return "Free";
    if (value.includes("enterprise")) return "Enterprise";
    if (value.includes("growth")) return "Growth";
    if (value.includes("pro")) return "Pro";
    return "Starter";
  }

  function getPlan() {
    const user = readJson("tradeflowUser") || readJson("currentUser") || {};

    return normalizePlan(
      localStorage.getItem(PLAN_KEY) ||
      user.subscriptionPlan ||
      user.plan ||
      "Starter"
    );
  }

  function isBlocked() {
    return getPlan() === "Free";
  }

  function ensureStyles() {
    if (document.getElementById("tradeflowAiSubscriptionGateStyles")) return;

    const style = document.createElement("style");
    style.id = "tradeflowAiSubscriptionGateStyles";
    style.textContent = `
      .tradeflow-ai-gate-hidden { display: none !important; }
      #tradeflowAiUpgradePrompt { border-color: #f59e0b; }
    `;
    document.head.appendChild(style);
  }

  function ensureUpgradePrompt() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return null;

    let prompt = document.getElementById("tradeflowAiUpgradePrompt");
    if (prompt) return prompt;

    prompt = document.createElement("div");
    prompt.id = "tradeflowAiUpgradePrompt";
    prompt.className = "card";
    prompt.style.marginBottom = "18px";
    prompt.innerHTML = `
      <div class="section-title">${UPGRADE_MESSAGE}</div>
      <p class="muted">AI Command Center, mission planning, agent tools, and executive AI insights require Starter or above.</p>
    `;

    const hero = dashboard.querySelector(".dashboard-hero");
    if (hero?.nextSibling) {
      dashboard.insertBefore(prompt, hero.nextSibling);
    } else {
      dashboard.prepend(prompt);
    }

    return prompt;
  }

  function applyGate() {
    if (applying) return;
    applying = true;

    try {
      ensureStyles();
      const blocked = isBlocked();

      document.body?.classList.toggle("tradeflow-ai-free-plan", blocked);

      BLOCKED_SELECTORS.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
          element.classList.toggle("tradeflow-ai-gate-hidden", blocked);
          element.setAttribute("aria-hidden", blocked ? "true" : "false");
        });
      });

      const prompt = ensureUpgradePrompt();
      prompt?.classList.toggle("tradeflow-ai-gate-hidden", !blocked);
      prompt?.setAttribute("aria-hidden", blocked ? "false" : "true");
    } finally {
      applying = false;
    }
  }

  function showUpgradePrompt() {
    applyGate();

    if (typeof window.TradeFlowPremiumUX?.toast === "function") {
      window.TradeFlowPremiumUX.toast(UPGRADE_MESSAGE);
    }

    const prompt = ensureUpgradePrompt();
    prompt?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function canAccessPage(page) {
    return !BLOCKED_PAGES.has(page) || !isBlocked();
  }

  const observer = new MutationObserver(() => applyGate());

  function boot() {
    applyGate();
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener("storage", applyGate);
    window.addEventListener("tradeflow:subscription-updated", applyGate);
    document.addEventListener("tradeflow:page-change", applyGate);
  }

  window.TradeFlowAISubscriptionGate = {
    getPlan,
    isBlocked,
    canAccessPage,
    apply: applyGate,
    showUpgradePrompt,
    upgradeMessage: UPGRADE_MESSAGE
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
