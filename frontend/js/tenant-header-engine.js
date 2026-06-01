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

  function isMongoObjectId(value) {
    return /^[a-f\d]{24}$/i.test(String(value || "").trim());
  }

  function getValidStoredId(keys) {
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (isMongoObjectId(value)) return value;
    }

    return "";
  }

  function getSelectWorkspaceId(id) {
    const select = document.getElementById(id);
    return select?.value || "";
  }

  function getWorkspaceId() {
    if (typeof window.getCanonicalActiveWorkspaceId === "function") {
      const canonicalId = window.getCanonicalActiveWorkspaceId();
      if (isMongoObjectId(canonicalId)) return canonicalId;
    }

    const candidates = [
      getSelectWorkspaceId("activeWorkspaceSelect"),
      getSelectWorkspaceId("workspaceAccessSelect"),
      localStorage.getItem("tradeflowActiveWorkspace"),
      localStorage.getItem("tradeflowActiveWorkspaceId"),
      localStorage.getItem("tradeflowActiveWorkspaceV1"),
      localStorage.getItem("activeWorkspace"),
      localStorage.getItem("activeWorkspaceId"),
      localStorage.getItem("workspaceId")
    ];

    return candidates.find(isMongoObjectId) || "";
  }

  function getTenantHeaders() {
    const user = getUser();
    const headers = {
      "x-user-email":
        user?.email ||
        "unknown@tradeflow.local"
    };

    const companyId = getValidStoredId([
      "tradeflowActiveCompany"
    ]);

    const workspaceId = getWorkspaceId();

    if (companyId) headers["x-company-id"] = companyId;
    if (workspaceId) headers["x-workspace-id"] = workspaceId;

    return headers;
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
        ...getTenantHeaders(),
        ...(options.headers || {})
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
