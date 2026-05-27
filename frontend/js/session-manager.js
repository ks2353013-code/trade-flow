/* TradeFlow Enterprise Session Manager */

(function () {
  if (window.TradeFlowSessionManager) return;

  const TOKEN_KEY = "tradeflowAccessToken";
  const LEGACY_TOKEN_KEY = "token";

  function getToken() {
    return (
      localStorage.getItem(TOKEN_KEY) ||
      localStorage.getItem(LEGACY_TOKEN_KEY) ||
      ""
    );
  }

  function saveToken(token) {
    if (!token) return;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
  }

  async function refreshSession() {
    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({})
      });

      const data = await res.json();

      if (!data.success || !data.accessToken) {
        return false;
      }

      saveToken(data.accessToken);

      if (data.user?.email) {
        localStorage.setItem("userEmail", data.user.email);
        localStorage.setItem("tradeflowUserEmail", data.user.email);
      }

      console.log("✅ TradeFlow session refreshed");

      return true;
    } catch (error) {
      console.warn("Session refresh failed:", error.message);
      return false;
    }
  }

  async function validateSession() {
    const token = getToken();

    if (!token) {
      return await refreshSession();
    }

    try {
      const res = await fetch("/api/auth/session", {
        headers: {
          Authorization: `Bearer ${token}`
        },
        credentials: "include"
      });

      const data = await res.json();

      if (data.valid) {
        return true;
      }

      return await refreshSession();
    } catch {
      return await refreshSession();
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch {}

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem("userEmail");
    localStorage.removeItem("tradeflowUserEmail");

    window.location.href = "/";
  }

  function patchFetchWithToken() {
    if (window.TradeFlowFetchPatched) return;
    window.TradeFlowFetchPatched = true;

    const originalFetch = window.fetch;

    window.fetch = async function (url, options = {}) {
      options.headers = options.headers || {};

      const token = getToken();

      if (
        token &&
        typeof url === "string" &&
        url.startsWith("/api")
      ) {
        options.headers.Authorization =
          options.headers.Authorization ||
          `Bearer ${token}`;
      }

      options.credentials =
        options.credentials || "include";

      let response = await originalFetch(url, options);

      if (
        response.status === 401 &&
        typeof url === "string" &&
        !url.includes("/api/auth/refresh") &&
        !url.includes("/api/auth/login")
      ) {
        const refreshed = await refreshSession();

        if (refreshed) {
          options.headers.Authorization =
            `Bearer ${getToken()}`;

          response = await originalFetch(url, options);
        }
      }

      return response;
    };

    console.log("✅ TradeFlow secure fetch patched");
  }

  function boot() {
    patchFetchWithToken();

    setTimeout(validateSession, 1200);

    setInterval(refreshSession, 10 * 60 * 1000);

    console.log("✅ Enterprise Session Manager active");
  }

  window.TradeFlowSessionManager = {
    getToken,
    saveToken,
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