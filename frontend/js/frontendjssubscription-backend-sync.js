/* TradeFlow Backend Subscription Sync */

(function () {
  if (window.TradeFlowSubscriptionBackendSync) return;

  const PLAN_KEY = "tradeflowSubscriptionPlan";

  function apiBase() {
    if (window.TRADEFLOW_API_BASE) return window.TRADEFLOW_API_BASE;
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return "";
    return "https://trade-flow-lc1k.onrender.com";
  }

  function getUserEmail() {
    let user = null;

    try {
      user = JSON.parse(
        localStorage.getItem("tradeflowUser") ||
        localStorage.getItem("currentUser") ||
        "null"
      );
    } catch {
      user = null;
    }

    return (
      user?.email ||
      localStorage.getItem("userEmail") ||
      localStorage.getItem("tradeflowUserEmail") ||
      localStorage.getItem("email") ||
      ""
    );
  }

  function getToken() {
    return (
      window.getAuthToken?.() ||
      window.TradeFlowSessionManager?.getToken?.() ||
      localStorage.getItem("tradeflowToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      ""
    );
  }

  function authHeaders(includeJson = false) {
    const headers = {};
    const token = getToken();
    const email = getUserEmail();

    if (includeJson) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    if (email) headers["x-user-email"] = email;

    return headers;
  }

  async function syncSubscriptionFromBackend() {
    try {
      const email = getUserEmail();

      const res = await fetch(`${apiBase()}/api/subscription/me`, {
        headers: authHeaders()
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
      window.dispatchEvent(
        new CustomEvent("tradeflow:subscription-updated", {
          detail: { plan: activePlan }
        })
      );

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

      const res = await fetch(`${apiBase()}/api/subscription/request-upgrade`, {
        method: "POST",
        headers: authHeaders(true),
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
