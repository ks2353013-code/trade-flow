/* TradeFlow Production Session Guard */

(function () {
  console.log("✅ TradeFlow production session guard active");

  function getToken() {
    return (
      window.getAuthToken?.() ||
      window.TradeFlowSessionManager?.getToken?.() ||
      localStorage.getItem("tradeflowToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      sessionStorage.getItem("tradeflowToken") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("authToken") ||
      sessionStorage.getItem("jwt") ||
      ""
    );
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowUser") || "null");
    } catch {
      return null;
    }
  }

  function isAuthenticated() {
    const user = getUser();
    const token = getToken();
    return !!(user && token);
  }

  function requireLogin() {
    if (!isAuthenticated()) {
      window.location.href = "/login";
      return false;
    }
    return true;
  }

  async function requireLoginAfterBootstrap() {
    if (isAuthenticated()) return true;

    if (window.TradeFlowBootstrap?.whenReady) {
      await window.TradeFlowBootstrap.whenReady();
    }

    if (isAuthenticated()) return true;

    if (getToken()) {
      console.log("[AUTH DEBUG] redirect reason", "not redirecting: token present but user pending");
      return true;
    }

    console.log("[AUTH DEBUG] redirect reason", "no token exists in session guard");
    window.location.href = "/login";
    return false;
  }

  window.logoutUser = function () {
    localStorage.clear();
    window.location.href = "/login";
  };

  window.checkSession = isAuthenticated;
  window.requireLogin = requireLogin;
  window.isAuthenticated = isAuthenticated;

  if (window.location.pathname === "/app") {
    requireLoginAfterBootstrap();
  }
})();
