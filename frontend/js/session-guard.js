/* TradeFlow Unified Session Guard */

(function () {
  function safeParse(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  const OWNER_EMAILS = [
    "contact@tradeflowai.in",
    "ks2353013@gmail.com"
  ];

  function syncOwnerToUserSession() {
    const user = safeParse("tradeflowUser");
    const master = safeParse("tradeflowMasterAdmin");

    if (user && user.token) {
      localStorage.setItem(
        "tradeflowIsOwner",
        OWNER_EMAILS.includes(normalizeEmail(user.email)) ? "true" : "false"
      );
      return;
    }

    if (master && master.token && OWNER_EMAILS.includes(normalizeEmail(master.email))) {
      localStorage.setItem(
        "tradeflowUser",
        JSON.stringify({
          ...master,
          isOwner: true
        })
      );

      localStorage.setItem("tradeflowIsOwner", "true");
      return;
    }
  }

  function patchFetchForSessionExpiry() {
    if (window.TradeFlowSessionFetchPatched) return;
    window.TradeFlowSessionFetchPatched = true;

    const originalFetch = window.fetch;

    window.fetch = async function (url, options = {}) {
      const response = await originalFetch(url, options);

      if (response.status === 401) {
        console.warn("401 detected, but not forcing logout to avoid redirect loop.");
      }

      return response;
    };
  }

  function boot() {
    syncOwnerToUserSession();
    patchFetchForSessionExpiry();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();