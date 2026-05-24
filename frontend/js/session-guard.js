/* TradeFlow Safe Session Guard */

(function () {
  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowUser") || "{}");
    } catch {
      return {};
    }
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function markOwnerStatus() {
    const user = getUser();
    const email = normalizeEmail(user.email);

    const ownerEmails = [
      "contact@tradeflowai.in",
      "ks2353013@gmail.com"
    ];

    const isOwner = ownerEmails.includes(email);

    localStorage.setItem("tradeflowIsOwner", isOwner ? "true" : "false");

    window.TradeFlowSession = {
      user,
      isOwner,
      ownerEmails
    };

    console.log("TradeFlow session:", email, "Owner:", isOwner);
  }

  function patchFetchForSessionExpiry() {
    if (window.TradeFlowSessionFetchPatched) return;
    window.TradeFlowSessionFetchPatched = true;

    const originalFetch = window.fetch;

    window.fetch = async function (url, options = {}) {
      const response = await originalFetch(url, options);

      if (response.status === 401) {
        console.warn("Session API returned 401, but no forced logout to prevent redirect loop.");
      }

      return response;
    };
  }

  function boot() {
    patchFetchForSessionExpiry();
    markOwnerStatus();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();