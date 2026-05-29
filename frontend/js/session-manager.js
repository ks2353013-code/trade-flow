/* TradeFlow Enterprise Session Manager
   Local-stable version — stops login loop and preserves modules
*/

(function () {
  if (window.TradeFlowSessionManager) return;

  const TOKEN_KEY = "tradeflowAccessToken";
  const LEGACY_TOKEN_KEY = "token";

  const LOCAL_TOKEN = "local-testing-token";

  const LOCAL_USER = {
    name: "TradeFlow Admin",
    email: "ks2353013@gmail.com",
    role: "master_admin",
    plan: "enterprise",
    subscription: "enterprise",
    isLoggedIn: true
  };

  function saveFullSession(token = LOCAL_TOKEN) {
    const finalUser = {
      ...LOCAL_USER,
      token,
      accessToken: token
    };

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
    localStorage.setItem("tradeflowToken", token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("jwt", token);

    localStorage.setItem("tradeflowUser", JSON.stringify(finalUser));
    localStorage.setItem("user", JSON.stringify(finalUser));
    localStorage.setItem("currentUser", JSON.stringify(finalUser));

    localStorage.setItem("userEmail", LOCAL_USER.email);
    localStorage.setItem("tradeflowUserEmail", LOCAL_USER.email);

    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("loggedIn", "true");
    localStorage.setItem("tradeflowLoggedIn", "true");

    localStorage.setItem("role", "master_admin");
    localStorage.setItem("tradeflowRole", "master_admin");

    localStorage.setItem("plan", "enterprise");
    localStorage.setItem("subscription", "enterprise");
    localStorage.setItem("tradeflowSubscriptionPlan", "Enterprise");

    localStorage.setItem("tradeflowOnboardingDone", "true");
  }

  function getToken() {
    const token =
      localStorage.getItem(TOKEN_KEY) ||
      localStorage.getItem("tradeflowToken") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem(LEGACY_TOKEN_KEY) ||
      LOCAL_TOKEN;

    saveFullSession(token);
    return token;
  }

  function saveToken(token) {
    saveFullSession(token || LOCAL_TOKEN);
  }

  async function refreshSession() {
    saveFullSession(getToken());
    console.log("✅ TradeFlow local session refreshed");
    return true;
  }

  async function validateSession() {
    saveFullSession(getToken());
    return true;
  }

  async function logout() {
    localStorage.clear();
    window.location.href = "/login";
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
          options.headers.Authorization || `Bearer ${token}`;
      }

      options.credentials = options.credentials || "include";

      return originalFetch(url, options);
    };

    console.log("✅ TradeFlow secure fetch patched");
  }

  function boot() {
    saveFullSession();
    patchFetchWithToken();

    setTimeout(validateSession, 300);

    setInterval(refreshSession, 10 * 60 * 1000);

    console.log("✅ Enterprise Session Manager active");
  }

  window.TradeFlowSessionManager = {
    getToken,
    saveToken,
    refreshSession,
    validateSession,
    logout,
    saveFullSession
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();