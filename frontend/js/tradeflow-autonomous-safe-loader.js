/* TradeFlow Autonomous AI Safe Loader */

(function () {
  if (window.TradeFlowAutonomousSafeLoader) return;

  const AUTONOMOUS_MODULES = [
    "./js/ai-autonomous-operations-engine.js",
    "./js/live-supplier-network-engine.js"
  ];

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

  function safeLoad(src) {
    return new Promise((resolve, reject) => {
      if (scriptExists(src)) {
        resolve(src);
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;

      script.onload = () => {
        console.log("✅ Autonomous module loaded:", src);
        resolve(src);
      };

      script.onerror = () => {
        console.warn("⚠️ Autonomous module failed:", src);
        reject(src);
      };

      document.body.appendChild(script);
    });
  }

  async function activateAutonomousMode() {
    const plan = getPlan();

    if (plan !== "Enterprise AI OS") {
      console.log("🔒 Autonomous AI locked for plan:", plan);
      return;
    }

    for (const src of AUTONOMOUS_MODULES) {
      try {
        await safeLoad(src);
      } catch {}
    }

    console.log("✅ Autonomous AI Mode Active");
  }

  function boot() {
    document.addEventListener("tradeflow:page-change", function (event) {
      const page = event.detail?.page || "";

      if (
        page === "ai" ||
        page === "suppliers" ||
        page === "analytics"
      ) {
        if (window.TradeFlowPerformanceGuard?.runOnce) {
          window.TradeFlowPerformanceGuard.runOnce(
            `autonomous-safe-loader-${page}`,
            activateAutonomousMode
          );
        } else {
          activateAutonomousMode();
        }
      }
    });

    console.log("✅ Autonomous Safe Loader ready");
  }

  window.TradeFlowAutonomousSafeLoader = {
    activateAutonomousMode
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();