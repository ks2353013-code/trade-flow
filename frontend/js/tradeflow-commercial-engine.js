/* TradeFlow Commercialization Engine */

(function () {

  const STORAGE_KEY =
    "tradeflowCommercialState";

  function $(id) {
    return document.getElementById(id);
  }

  function getState() {

    try {

      return JSON.parse(
        localStorage.getItem(STORAGE_KEY)
      ) || {};

    } catch {

      return {};

    }

  }

  function saveState(state) {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );

  }

  function getPlan() {

    const state = getState();

    return state.plan || "Starter";

  }

  function setPlan(plan) {

    const state = getState();

    state.plan = plan;

    state.updatedAt =
      new Date().toISOString();

    saveState(state);

    renderCommercial();

    if (
      window.TradeFlowPremiumUX
    ) {

      TradeFlowPremiumUX.toast(
        `Workspace upgraded to ${plan} plan.`,
        "success"
      );

    }

    if (
      window.TradeFlowTimeline
    ) {

      TradeFlowTimeline.add(
        "Billing",
        "Workspace Plan Updated",
        `TradeFlow workspace moved to ${plan} plan.`
      );

    }

  }

  function getUsageMetrics() {

    function safe(key) {

      try {

        return JSON.parse(
          localStorage.getItem(key) || "[]"
        );

      } catch {

        return [];

      }

    }

    return {
      suppliers:
        safe("suppliers").length,

      deals:
        safe("crmDeals").length,

      tasks:
        safe("tasks").length,

      workflows:
        safe(
          "tradeflowOperationalTimeline"
        ).filter(
          x =>
            x.type === "Workflow" ||
            x.type === "Automation"
        ).length
    };

  }

  function planConfig() {

    return {
      Starter: {
        price: "₹0",
        color:
          "rgba(148,163,184,.18)",
        features: [
          "Basic CRM",
          "Basic supplier management",
          "AI onboarding",
          "Workspace activation"
        ]
      },

      Growth: {
        price: "₹4,999/mo",
        color:
          "rgba(56,189,248,.18)",
        features: [
          "AI intelligence OS",
          "Workflow automation",
          "Supplier enrichment",
          "Growth analytics",
          "AI operations"
        ]
      },

      Enterprise: {
        price: "Custom",
        color:
          "rgba(139,92,246,.18)",
        features: [
          "White-label enterprise",
          "Executive command center",
          "AI orchestration",
          "Advanced workflows",
          "Strategic intelligence",
          "Enterprise onboarding"
        ]
      }
    };

  }

  function renderCommercial() {

    const panel =
      $("tradeflowCommercialPanel");

    if (!panel) return;

    const currentPlan =
      getPlan();

    const metrics =
      getUsageMetrics();

    const plans =
      planConfig();

    panel.innerHTML = `
      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:18px;
          flex-wrap:wrap;
        "
      >

        <div>

          <div class="section-title">
            💼 TradeFlow Commercial Engine
          </div>

          <p class="muted">
            Workspace monetization,
            subscription architecture,
            enterprise scaling,
            and SaaS commercialization layer.
          </p>

        </div>

        <div class="status">
          Active Plan:
          ${currentPlan}
        </div>

      </div>

      <div
        style="
          display:grid;
          grid-template-columns:
          repeat(auto-fit,minmax(260px,1fr));
          gap:14px;
          margin-top:20px;
        "
      >

        ${Object.entries(plans).map(
          ([plan, cfg]) => `
            <div
              class="supplier-card tf-fade-in"
              style="
                border:
                ${
                  currentPlan === plan
                    ? "2px solid rgba(56,189,248,.5)"
                    : "1px solid rgba(255,255,255,.08)"
                };
                background:${cfg.color};
              "
            >

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  align-items:center;
                  gap:12px;
                "
              >

                <h2
                  style="
                    color:white;
                    margin:0;
                  "
                >
                  ${plan}
                </h2>

                ${
                  currentPlan === plan
                    ? `<span class="status">ACTIVE</span>`
                    : ""
                }

              </div>

              <div
                style="
                  font-size:34px;
                  font-weight:900;
                  color:white;
                  margin-top:16px;
                "
              >
                ${cfg.price}
              </div>

              <div
                style="
                  display:grid;
                  gap:8px;
                  margin-top:16px;
                "
              >

                ${cfg.features.map(
                  feature => `
                    <div class="deal">
                      ${feature}
                    </div>
                  `
                ).join("")}

              </div>

              <button
                class="btn"
                style="margin-top:16px;"
                onclick="
                  TradeFlowCommercial
                  .upgrade('${plan}')
                "
              >
                ${
                  currentPlan === plan
                    ? "Current Plan"
                    : `Upgrade to ${plan}`
                }
              </button>

            </div>
          `
        ).join("")}

      </div>

      <div
        class="supplier-card"
        style="
          margin-top:18px;
        "
      >

        <h2
          style="
            color:white;
            margin-top:0;
          "
        >
          📊 Workspace Usage
        </h2>

        <div class="deal">
          Suppliers:
          ${metrics.suppliers}
        </div>

        <div class="deal">
          CRM Deals:
          ${metrics.deals}
        </div>

        <div class="deal">
          Tasks:
          ${metrics.tasks}
        </div>

        <div class="deal">
          Workflow Events:
          ${metrics.workflows}
        </div>

      </div>

      <div
        class="supplier-card"
        style="
          margin-top:18px;
        "
      >

        <h2
          style="
            color:white;
            margin-top:0;
          "
        >
          🚀 Commercial Direction
        </h2>

        <div class="deal">
          TradeFlow is evolving into an
          AI-native enterprise trade OS.
        </div>

        <div class="deal">
          The strongest monetization
          strategy is B2B SaaS +
          enterprise onboarding.
        </div>

        <div class="deal">
          Focus on operational intelligence,
          supplier workflows,
          and enterprise automation.
        </div>

      </div>
    `;

  }

  function buildPanel() {

    const dashboard =
      $("dashboardPage") ||
      document.body;

    if (
      !dashboard ||
      $("tradeflowCommercialPanel")
    ) return;

    const panel =
      document.createElement("div");

    panel.id =
      "tradeflowCommercialPanel";

    panel.className =
      "card ai-panel";

    panel.style.marginBottom =
      "18px";

    const network =
      $("liveSupplierNetworkPanel");

    if (
      network &&
      network.parentNode
    ) {

      network.parentNode.insertBefore(
        panel,
        network.nextSibling
      );

    } else {

      dashboard.appendChild(panel);

    }

  }

  function boot() {

    buildPanel();

    setTimeout(() => {
      renderCommercial();
    }, 2600);

  }

  window.TradeFlowCommercial = {
    render:
      renderCommercial,

    upgrade:
      setPlan
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