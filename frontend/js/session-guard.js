/* TradeFlow Production Session Guard */

(function () {
  console.log("✅ TradeFlow production session guard active");

  function getToken() {
    return (
      localStorage.getItem("tradeflowToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
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
      localStorage.clear();
      window.location.href = "/login";
      return false;
    }
    return true;
  }

  window.logoutUser = function () {
    localStorage.clear();
    window.location.href = "/login";
  };

  window.checkSession = isAuthenticated;
  window.requireLogin = requireLogin;
  window.isAuthenticated = isAuthenticated;

  if (window.location.pathname === "/app") {
    requireLogin();
  }
})();