/* TradeFlow Enterprise Module Loader */

(function () {
  if (window.TradeFlowEnterpriseModuleLoader) return;

  const ENTERPRISE_MODULES = {
    premiumUX: [
      "./js/premium-ux-visual.js",
      "./js/premium-experience-engine.js"
    ],

    growth: [
      "./js/ai-growth-opportunity-engine.js",
      "./js/enterprise-operational-timeline.js"
    ],

    executive: [
      "./js/ai-executive-workspace-brain.js",
      "./js/strategic-control-tower.js"
    ],

    autonomous: [
      "./js/ai-autonomous-operations-engine.js",
      "./js/live-supplier-network-engine.js"
    ]
  };

  function getPlan() {
    if (window.TradeFlowSubscriptionEngine?.getPlan) {
      return window.TradeFlowSubscriptionEngine.getPlan().label;
    }

    return localStorage.getItem("tradeflowSubscriptionPlan") || "Starter";
  }

  function scriptExists(src) {
    return Array.from(document.querySelectorAll("script")).some((script) =>
      script.src.includes(src.replace("./", ""))
    );
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (scriptExists(src)) {
        resolve(src);
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;

      script.onload = () => {
        console.log("✅ Loaded:", src);
        resolve(src);
      };

      script.onerror = () => {
        console.warn("⚠️ Failed:", src);
        reject(src);
      };

      document.body.appendChild(script);
    });
  }

  async function loadGroup(groupName) {
    const group = ENTERPRISE_MODULES[groupName];
    if (!group) return;

    for (const src of group) {
      try {
        await loadScript(src);
      } catch {}
    }
  }

  async function loadForPage(page) {
    const plan = getPlan();

    if (plan === "Starter") {
      if (page === "dashboard") {
        await loadGroup("premiumUX");
      }
      return;
    }

    if (plan === "Pro Exporter") {
      await loadGroup("premiumUX");

      if (
        page === "dashboard" ||
        page === "analytics" ||
        page === "ai" ||
        page === "crm" ||
        page === "suppliers"
      ) {
        await loadGroup("growth");
      }

      return;
    }

    if (plan === "Enterprise AI OS") {
      await loadGroup("premiumUX");
      await loadGroup("growth");

      if (
        page === "dashboard" ||
        page === "analytics" ||
        page === "ai" ||
        page === "master"
      ) {
        await loadGroup("executive");
      }

      if (
        page === "ai" ||
        page === "suppliers" ||
        page === "analytics"
      ) {
        await loadGroup("autonomous");
      }
    }
  }

  function boot() {
    document.addEventListener("tradeflow:page-change", function (event) {
      const page = event.detail?.page || "dashboard";

      if (window.TradeFlowPerformanceGuard?.runOnce) {
        window.TradeFlowPerformanceGuard.runOnce(
          `enterprise-loader-${page}`,
          () => loadForPage(page)
        );
      } else {
        loadForPage(page);
      }
    });

    setTimeout(() => loadForPage("dashboard"), 1200);

    console.log("✅ TradeFlow Enterprise Loader active");
  }

  window.TradeFlowEnterpriseModuleLoader = {
    loadForPage,
    loadGroup
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();