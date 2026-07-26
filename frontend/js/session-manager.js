/* TradeFlow Production Session Manager */

(function () {
  if (window.TradeFlowSessionManager) return;

  const PRODUCTION_BACKEND_URL = "https://trade-flow-lc1k.onrender.com";

  const TOKEN_KEYS = [
    "tradeflowAccessToken",
    "tradeflowToken",
    "token",
    "authToken",
    "jwt"
  ];
  const SESSION_KEYS = [
    ...TOKEN_KEYS,
    "tradeflowUser",
    "user",
    "currentUser",
    "isLoggedIn",
    "tradeflowLoggedIn",
    "tradeflowIsOwner",
    "tradeflowRole",
    "role"
  ];
  let lastAuthStatus = 0;
  let lastAuthFailure = "";

  function isDebugMode() {
    return (
      window.TRADEFLOW_DEBUG === true ||
      localStorage.getItem("tradeflowDebug") === "true" ||
      ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
    );
  }

  function debugLog(...args) {
    if (isDebugMode()) console.log(...args);
  }

  function getToken() {
    try {
      const storedUser = JSON.parse(localStorage.getItem("tradeflowUser") || "null");
      if (storedUser?.token) return storedUser.token;
      if (storedUser?.accessToken) return storedUser.accessToken;
    } catch {}

    for (const key of TOKEN_KEYS) {
      const value =
        localStorage.getItem(key) ||
        sessionStorage.getItem(key);
      if (value) return value;
    }
    return "";
  }

  function isLocalHost(hostname) {
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    );
  }

  function getBackendUrl() {
    const configured =
      window.TRADEFLOW_API_BASE_URL ||
      window.BACKEND_URL ||
      "";

    if (configured) {
      return String(configured).replace(/\/$/, "");
    }

    if (isLocalHost(window.location.hostname)) {
      return window.location.origin;
    }

    return PRODUCTION_BACKEND_URL;
  }

  window.BACKEND_URL = getBackendUrl();

  function isJsonContentType(contentType) {
    return (
      String(contentType || "").includes("application/json") ||
      String(contentType || "").includes("+json")
    );
  }

  function isApiUrl(finalUrl) {
    if (typeof finalUrl !== "string") return false;
    return (
      finalUrl.includes("/api/") ||
      finalUrl.endsWith("/api") ||
      finalUrl.includes("/suppliers")
    );
  }

  function wrapJsonResponse(response, finalUrl) {
    if (!response || !isApiUrl(finalUrl)) return response;

    const originalJson = response.json.bind(response);

    response.json = async function () {
      const contentType = response.headers.get("content-type") || "";

      if (isJsonContentType(contentType)) {
        return originalJson();
      }

      const text = await response.clone().text().catch(() => "");
      console.error("[API JSON ERROR]", {
        status: response.status,
        url: finalUrl,
        contentType,
        bodyPreview: text.slice(0, 300)
      });

      throw new Error(`Backend returned non-JSON response from ${finalUrl}`);
    };

    return response;
  }

  function saveToken(token) {
    if (!token) return;
    TOKEN_KEYS.forEach((key) => localStorage.setItem(key, token));
  }

  function extractToken(data = {}) {
    const rawData = data.data || {};
    const rawUser = data.user || rawData.user || rawData || {};
    return (
      data.token ||
      data.accessToken ||
      data.jwt ||
      rawData.token ||
      rawData.accessToken ||
      rawData.jwt ||
      rawUser.token ||
      rawUser.accessToken ||
      ""
    );
  }

  function getUser() {
    try {
      return (
        JSON.parse(localStorage.getItem("tradeflowUser") || "null") ||
        JSON.parse(localStorage.getItem("user") || "null") ||
        JSON.parse(localStorage.getItem("currentUser") || "null")
      );
    } catch {
      return null;
    }
  }

  function saveUser(user) {
    if (!user) return;
    localStorage.setItem("tradeflowUser", JSON.stringify(user));
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("currentUser", JSON.stringify(user));
  }

  function clearAuthSession() {
    SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
    SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key));
  }

  async function refreshSession() {
    try {
      const res = await fetch(`${getBackendUrl()}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({})
      });

      const data = await res.json();
      const token = extractToken(data);
      lastAuthStatus = res.status;
      lastAuthFailure = res.ok ? "" : data.message || "refresh failed";

      if (res.status === 401 || res.status === 403) {
        return false;
      }

      if (!res.ok || !data.success || !token) {
        return false;
      }

      const user = {
        ...(data.user || {}),
        token,
        accessToken: token,
        isLoggedIn: true
      };

      saveToken(token);
      saveUser(user);

      return true;
    } catch {
      lastAuthStatus = 0;
      lastAuthFailure = "refresh network error";
      return false;
    }
  }

  async function validateSession() {
    const token = getToken();

    if (!token) {
      return false;
    }

    try {
      const res = await fetch(`${getBackendUrl()}/api/auth/session`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        credentials: "include"
      });

      const data = await res.json();
      lastAuthStatus = res.status;
      lastAuthFailure = res.ok ? "" : data.message || "session validation failed";

      if (res.status === 401 || res.status === 403) {
        return false;
      }

      if (!res.ok || !data.valid) {
        return false;
      }

      const user = {
        ...(data.user || getUser() || {}),
        token,
        accessToken: token,
        isLoggedIn: true
      };

      saveUser(user);
      return true;
    } catch {
      lastAuthStatus = 0;
      lastAuthFailure = "session validation network error";
      return false;
    }
  }

  async function restoreSession() {
    const token = getToken();

    if (token && await validateSession()) {
      debugLog("TradeFlow session restored from stored token");
      return true;
    }

    if (await refreshSession()) {
      debugLog("TradeFlow session restored from refresh cookie");
      return true;
    }

    return false;
  }

  async function logout() {
    try {
      const token = getToken();
      await fetch(`${getBackendUrl()}/api/auth/logout`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include"
      });
    } catch {}

    clearAuthSession();
    window.location.href = "/login";
  }

  function patchFetchWithToken() {
    if (window.TradeFlowFetchPatched) return;
    window.TradeFlowFetchPatched = true;

    const originalFetch = window.fetch;
    const bootstrapGatedPaths = [
      "/api/analytics",
      "/api/deals",
      "/api/notifications",
      "/api/audit",
      "/suppliers"
    ];

    function shouldWaitForBootstrap(finalUrl) {
      if (typeof finalUrl !== "string") return false;
      return bootstrapGatedPaths.some((path) => finalUrl.includes(path));
    }

    async function waitForBootstrapIfNeeded(finalUrl) {
      const bootstrap = window.TradeFlowBootstrap;

      if (
        shouldWaitForBootstrap(finalUrl) &&
        bootstrap?.whenReady &&
        !bootstrap.getState?.().completed
      ) {
        await bootstrap.whenReady();
      }
    }

    window.fetch = async function (url, options = {}) {
      options.headers = options.headers || {};

      const token = getToken();
      const backendUrl = getBackendUrl();
      let finalUrl = url;

      if (
        typeof url === "string" &&
        (url.startsWith("/api") || url.startsWith("/suppliers"))
      ) {
        finalUrl = `${backendUrl}${url}`;
      }

      if (
        token &&
        typeof finalUrl === "string" &&
        isApiUrl(finalUrl)
      ) {
        options.headers.Authorization =
          options.headers.Authorization || `Bearer ${token}`;
      }

      options.credentials = options.credentials || "include";
      await waitForBootstrapIfNeeded(finalUrl);

      const response = await originalFetch(finalUrl, options);
      return wrapJsonResponse(response, finalUrl);
    };

    debugLog("TradeFlow production fetch patched");
  }

  function boot() {
    patchFetchWithToken();
    debugLog("TradeFlow production session manager active");
  }

  window.TradeFlowSessionManager = {
    getToken,
    getAuthToken: getToken,
    saveToken,
    getUser,
    saveUser,
    getBackendUrl,
    restoreSession,
    refreshSession,
    validateSession,
    getLastAuthStatus: () => lastAuthStatus,
    getLastAuthFailure: () => lastAuthFailure,
    clearAuthSession,
    logout
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
