/* TradeFlow Tenant Header Engine */

(function () {

  function getJson(key, fallback) {
    try {
      return JSON.parse(
        localStorage.getItem(key) ||
        JSON.stringify(fallback)
      );
    } catch {
      return fallback;
    }
  }

  function getUser() {
    try {
      if (typeof window.getUser === "function") {
        return window.getUser();
      }
    } catch {}

    return getJson("tradeflowUser", {});
  }

  function getTenantHeaders() {
    const user = getUser();

    return {
      "x-user-email":
        user?.email ||
        "unknown@tradeflow.local",

      "x-company-id":
        localStorage.getItem(
          "tradeflowActiveCompany"
        ) || "",

      "x-workspace-id":
        localStorage.getItem(
          "tradeflowActiveWorkspace"
        ) || ""
    };
  }

  function patchFetch() {
    if (window.TradeFlowTenantFetchPatched)
      return;

    window.TradeFlowTenantFetchPatched = true;

    const originalFetch = window.fetch;

    window.fetch = async function (
      url,
      options = {}
    ) {

      options.headers = {
        ...(options.headers || {}),
        ...getTenantHeaders()
      };

      return originalFetch(url, options);
    };
  }

  function boot() {
    patchFetch();

    setInterval(() => {
      patchFetch();
    }, 5000);
  }

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