/* TradeFlow Intelligence OS */

(function () {

  function $(id) {
    return document.getElementById(id);
  }

  function getSuppliers() {
    try {
      return JSON.parse(localStorage.getItem("suppliers") || "[]");
    } catch {
      return [];
    }
  }

  function getTasks() {
    try {
      return JSON.parse(localStorage.getItem("tasks") || "[]");
    } catch {
      return [];
    }
  }

  function getDeals() {
    try {
      return JSON.parse(localStorage.getItem("crmDeals") || "[]");
    } catch {
      return [];
    }
  }

  function generateInsights() {

    const suppliers = getSuppliers();
    const tasks = getTasks();
    const deals = getDeals();

    const insights = [];

    if (suppliers.length === 0) {
      insights.push({
        type: "growth",
        icon: "🌍",
        title: "Supplier Network Missing",
        text:
          "Add suppliers to activate TradeFlow intelligence, sourcing analytics, and enrichment workflows."
      });
    }

    if (suppliers.length > 0 && suppliers.length < 5) {
      insights.push({
        type: "expansion",
        icon: "📈",
        title: "Supplier Expansion Recommended",
        text:
          "Your supplier network is still small. Increase sourcing diversity for stronger operational resilience."
      });
    }

    if (tasks.length > 8) {
      insights.push({
        type: "operations",
        icon: "⚠️",
        title: "Operational Load Increasing",
        text:
          "You have many pending tasks. AI workflow automation can reduce manual operational pressure."
      });
    }

    if (deals.length > 0) {
      insights.push({
        type: "crm",
        icon: "💰",
        title: "CRM Pipeline Active",
        text:
          `${deals.length} active opportunities detected in your pipeline. Prioritize high-value negotiations.`
      });
    }

    if (deals.length === 0) {
      insights.push({
        type: "sales",
        icon: "🚀",
        title: "Pipeline Empty",
        text:
          "No active CRM deals detected. Start onboarding buyers and supplier opportunities."
      });
    }

    if (suppliers.length > 5 && deals.length > 3) {
      insights.push({
        type: "momentum",
        icon: "🔥",
        title: "Trade Momentum Building",
        text:
          "TradeFlow detects strong operational growth signals across sourcing and CRM activity."
      });
    }

    insights.push({
      type: "ai",
      icon: "🤖",
      title: "AI Recommended Action",
      text:
        generateDynamicAction(
          suppliers,
          tasks,
          deals
        )
    });

    return insights;
  }

  function generateDynamicAction(
    suppliers,
    tasks,
    deals
  ) {

    if (suppliers.length < 3) {
      return "Use Live Supplier Intelligence to discover and enrich more supplier opportunities.";
    }

    if (deals.length < 2) {
      return "Your next growth opportunity is activating CRM outreach and pipeline tracking.";
    }

    if (tasks.length > 6) {
      return "Workflow automation is recommended to reduce operational bottlenecks.";
    }

    return "Continue scaling supplier intelligence and AI workflows for operational dominance.";
  }

  function renderIntelligence() {

    const panel =
      $("tradeflowIntelligencePanel");

    if (!panel) return;

    const insights =
      generateInsights();

    panel.innerHTML = `
      <div class="section-title">
        🧠 TradeFlow Intelligence OS
      </div>

      <p class="muted">
        AI-powered operational intelligence,
        workflow analysis, and enterprise trade recommendations.
      </p>

      <div
        style="
          display:grid;
          grid-template-columns:
          repeat(auto-fit,minmax(260px,1fr));
          gap:14px;
          margin-top:18px;
        "
      >

        ${insights.map((item) => `
          <div class="supplier-card tf-fade-in">

            <div
              style="
                display:flex;
                align-items:center;
                gap:10px;
                margin-bottom:12px;
              "
            >
              <div
                style="
                  font-size:28px;
                "
              >
                ${item.icon}
              </div>

              <div>
                <h2
                  style="
                    color:white;
                    margin:0;
                    font-size:17px;
                  "
                >
                  ${item.title}
                </h2>

                <div class="status">
                  ${item.type.toUpperCase()}
                </div>
              </div>
            </div>

            <p class="muted">
              ${item.text}
            </p>

          </div>
        `).join("")}

      </div>
    `;
  }

  function buildPanel() {

    const dashboard =
      $("dashboardPage") ||
      document.body;

    if (
      !dashboard ||
      $("tradeflowIntelligencePanel")
    ) return;

    const panel =
      document.createElement("div");

    panel.id =
      "tradeflowIntelligencePanel";

    panel.className =
      "card ai-panel";

    panel.style.marginBottom = "18px";

    dashboard.prepend(panel);

  }

  function refreshLoop() {

    renderIntelligence();

    setInterval(() => {
      renderIntelligence();
    }, 15000);

  }

  function boot() {

    buildPanel();

    setTimeout(() => {
      refreshLoop();
    }, 1200);

  }

  window.TradeFlowIntelligenceOS = {
    refresh: renderIntelligence
  };

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      boot
    );

  } else {

    boot();

  }

})();