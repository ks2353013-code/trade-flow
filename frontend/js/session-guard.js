/* TradeFlow Session Guard */

(function () {
  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") return BACKEND_URL;
    return "https://trade-flow-lc1k.onrender.com";
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowUser") || "{}");
    } catch {
      return {};
    }
  }

  function logoutSession() {
    localStorage.removeItem("tradeflowUser");
    localStorage.removeItem("tradeflowSubscriptionPlan");

    alert("Session expired. Please login again.");

    if (typeof logoutUser === "function") {
      logoutUser();
    } else {
      window.location.href = "./login.html";
    }
  }

  async function validateSession() {
    const user = getUser();

    if (!user.token) return;

    try {
      const res = await fetch(`${getBackendUrl()}/api/auth/session`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        logoutSession();
        return;
      }

      localStorage.setItem(
        "tradeflowUser",
        JSON.stringify({
          ...user,
          ...data.user,
          token: user.token
        })
      );
    } catch {
      console.warn("Session check skipped due to network issue.");
    }
  }

  function patchFetchForSessionExpiry() {
    if (window.TradeFlowSessionFetchPatched) return;
    window.TradeFlowSessionFetchPatched = true;

    const originalFetch = window.fetch;

    window.fetch = async function (url, options = {}) {
      const response = await originalFetch(url, options);

      if (response.status === 401) {
        logoutSession();
      }

      return response;
    };
  }

  function boot() {
    patchFetchForSessionExpiry();
    validateSession();

    setInterval(validateSession, 5 * 60 * 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();