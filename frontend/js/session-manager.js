/* TradeFlow Production Session Manager */

(function () {
  if (window.TradeFlowSessionManager) return;

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

      if (
        token &&
        typeof url === "string" &&
        (url.startsWith("/api") || url.includes("/api/"))
      ) {
        options.headers.Authorization =
          options.headers.Authorization || `Bearer ${token}`;
      }

      options.credentials = options.credentials || "include";

      return originalFetch(url, options);
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