/* TradeFlow Backend Subscription Sync */

(function () {
  if (window.TradeFlowSubscriptionBackendSync) return;

  const PLAN_KEY = "tradeflowSubscriptionPlan";

  function getUserEmail() {
    return (
      localStorage.getItem("userEmail") ||
      localStorage.getItem("tradeflowUserEmail") ||
      localStorage.getItem("email") ||
      "ks2353013@gmail.com"
    );
  }

  async function syncSubscriptionFromBackend() {
    try {
      const email = getUserEmail();

      const res = await fetch("/api/subscription/me", {
        headers: {
          "x-user-email": email
        }
      });

      const data = await res.json();

      if (!data.success || !data.subscription) return;

      const sub = data.subscription;

      let activePlan = sub.plan || "Starter";

      if (
        activePlan === "Enterprise AI OS" &&
        sub.approvalStatus !== "Approved"
      ) {
        activePlan = "Pro Exporter";
      }

      localStorage.setItem(PLAN_KEY, activePlan);

      if (window.TradeFlowSubscriptionEngine?.render) {
        window.TradeFlowSubscriptionEngine.render();
      }

      if (window.TradeFlowEnterpriseModuleLoader?.loadForPage) {
        window.TradeFlowEnterpriseModuleLoader.loadForPage("dashboard");
      }

      console.log("✅ Subscription synced:", activePlan);
    } catch (error) {
      console.warn("Subscription sync failed:", error.message);
    }
  }

  async function requestUpgrade(plan) {
    try {
      const email = getUserEmail();

      const res = await fetch("/api/subscription/request-upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": email
        },
        body: JSON.stringify({
          email,
          plan
        })
      });

      const data = await res.json();

      if (data.success) {
        alert(data.message || "Subscription updated.");
        await syncSubscriptionFromBackend();
      } else {
        alert(data.message || "Upgrade failed.");
      }

      return data;
    } catch (error) {
      alert("Upgrade request failed.");
      return {
        success: false,
        message: error.message
      };
    }
  }

  function boot() {
    setTimeout(syncSubscriptionFromBackend, 1000);
    setInterval(syncSubscriptionFromBackend, 30000);

    console.log("✅ Backend subscription sync active");
  }

  window.TradeFlowSubscriptionBackendSync = {
    sync: syncSubscriptionFromBackend,
    requestUpgrade
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();