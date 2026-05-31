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

  function getToken() {
    for (const key of TOKEN_KEYS) {
      const value = localStorage.getItem(key);
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

  function saveToken(token) {
    if (!token) return;
    TOKEN_KEYS.forEach((key) => localStorage.setItem(key, token));
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowUser") || "null");
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

  async function refreshSession() {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({})
      });

      const data = await res.json();

      if (!res.ok || !data.success || !data.accessToken) {
        return false;
      }

      const user = {
        ...(data.user || {}),
        token: data.accessToken,
        accessToken: data.accessToken,
        isLoggedIn: true
      };

      saveToken(data.accessToken);
      saveUser(user);

      return true;
    } catch {
      return false;
    }
  }

  async function validateSession() {
    const token = getToken();

    if (!token) {
      return false;
    }

    try {
      const res = await fetch("/api/auth/session", {
        headers: {
          Authorization: `Bearer ${token}`
        },
        credentials: "include"
      });

      const data = await res.json();

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
      return false;
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch {}

    localStorage.clear();
    window.location.href = "/login";
  }

  function patchFetchWithToken() {
    if (window.TradeFlowFetchPatched) return;
    window.TradeFlowFetchPatched = true;

    const originalFetch = window.fetch;

    window.fetch = function (url, options = {}) {
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
        (
          finalUrl.includes("/api/") ||
          finalUrl.endsWith("/api") ||
          finalUrl.includes("/suppliers")
        )
      ) {
        options.headers.Authorization =
          options.headers.Authorization || `Bearer ${token}`;
      }

      options.credentials = options.credentials || "include";

      return originalFetch(finalUrl, options);
    };

    console.log("✅ TradeFlow production fetch patched");
  }

  function boot() {
    patchFetchWithToken();
    console.log("✅ TradeFlow production session manager active");
  }

  window.TradeFlowSessionManager = {
    getToken,
    saveToken,
    getUser,
    saveUser,
    getBackendUrl,
    refreshSession,
    validateSession,
    logout
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
