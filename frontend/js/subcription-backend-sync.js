/* TradeFlow Subscription Backend Sync
   Safe deployment-ready placeholder
*/

(function () {
  if (window.TradeFlowSubscriptionBackendSync) return;

  function getPlan() {
    return (
      localStorage.getItem("tradeflowSubscriptionPlan") ||
      localStorage.getItem("plan") ||
      "Enterprise"
    );
  }

  function getStatus() {
    return (
      localStorage.getItem("tradeflowSubscriptionStatus") ||
      "Active"
    );
  }

  function syncLocalSubscription() {
    const plan = getPlan();
    const status = getStatus();

    localStorage.setItem("tradeflowSubscriptionPlan", plan);
    localStorage.setItem("tradeflowSubscriptionStatus", status);

    console.log("✅ Subscription sync active:", plan, status);

    return {
      plan,
      status
    };
  }

  window.TradeFlowSubscriptionBackendSync = {
    sync: syncLocalSubscription,
    getPlan,
    getStatus
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", syncLocalSubscription);
  } else {
    syncLocalSubscription();
  }
})();