/* TradeFlow Performance Guard Engine */

(function () {
  if (window.TradeFlowPerformanceGuard) return;

  const runningTasks = new Set();

  function runOnce(key, fn) {
    if (runningTasks.has(key)) return;
    runningTasks.add(key);

    try {
      return fn();
    } finally {
      setTimeout(() => runningTasks.delete(key), 1000);
    }
  }

  function protectShowPage() {
    if (window.TradeFlowShowPageProtected) return;
    if (typeof window.showPage !== "function") return;

    const originalShowPage = window.showPage;

    window.showPage = function (pageName) {
      runOnce(`showPage-${pageName}`, function () {
        originalShowPage(pageName);

        setTimeout(() => {
          document.dispatchEvent(
            new CustomEvent("tradeflow:page-change", {
              detail: { page: pageName }
            })
          );
        }, 150);
      });
    };

    window.TradeFlowShowPageProtected = true;
    console.log("✅ TradeFlow page guard active");
  }

  function boot() {
    protectShowPage();
    setInterval(protectShowPage, 3000);
    console.log("✅ TradeFlow Performance Guard active");
  }

  window.TradeFlowPerformanceGuard = {
    runOnce
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();