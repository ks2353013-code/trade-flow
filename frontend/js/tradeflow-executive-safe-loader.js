/* TradeFlow Executive Safe Loader */

(function () {

  if (window.TradeFlowExecutiveSafeLoader) return;

  async function safeLoad(src) {

    return new Promise((resolve, reject) => {

      const existing = Array.from(
        document.querySelectorAll("script")
      ).find(script =>
        script.src.includes(src.replace("./", ""))
      );

      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement("script");

      script.src = src;
      script.async = true;

      script.onload = () => {
        console.log("✅ Executive module loaded:", src);
        resolve();
      };

      script.onerror = () => {
        console.warn("⚠️ Failed executive module:", src);
        reject();
      };

      document.body.appendChild(script);

    });

  }

  async function activateExecutiveMode() {

    const plan =
      localStorage.getItem(
        "tradeflowSubscriptionPlan"
      ) || "Starter";

    if (
      plan !== "Enterprise AI OS"
    ) {
      return;
    }

    await safeLoad(
      "./js/ai-executive-workspace-brain.js"
    );

    await safeLoad(
      "./js/strategic-control-tower.js"
    );

    await safeLoad(
      "./js/executive-ai-analytics-dashboard.js"
    );

    console.log(
      "✅ Executive Intelligence Mode Active"
    );

  }

  function boot() {

    document.addEventListener(
      "tradeflow:page-change",
      function (event) {

        const page =
          event.detail?.page || "";

        if (
          page === "dashboard" ||
          page === "analytics" ||
          page === "master"
        ) {

          if (
            window.TradeFlowPerformanceGuard?.runOnce
          ) {

            window.TradeFlowPerformanceGuard.runOnce(
              "executive-safe-loader",
              activateExecutiveMode
            );

          } else {

            activateExecutiveMode();

          }

        }

      }
    );

    console.log(
      "✅ Executive Safe Loader ready"
    );

  }

  window.TradeFlowExecutiveSafeLoader = {
    activateExecutiveMode
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