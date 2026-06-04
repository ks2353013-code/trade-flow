/* TradeFlow Production Auth Helper */

const TRADEFLOW_OWNER_EMAILS = [
  "contact@tradeflowai.in",
  "ks2353013@gmail.com"
];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isOwnerEmail(email) {
  return TRADEFLOW_OWNER_EMAILS.includes(normalizeEmail(email));
}

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value || "null") || fallback;
  } catch {
    return fallback;
  }
}

function getTradeflowUser() {
  return (
    safeJsonParse(localStorage.getItem("tradeflowUser")) ||
    safeJsonParse(localStorage.getItem("user")) ||
    safeJsonParse(localStorage.getItem("currentUser")) ||
    safeJsonParse(sessionStorage.getItem("tradeflowUser")) ||
    safeJsonParse(sessionStorage.getItem("user")) ||
    safeJsonParse(sessionStorage.getItem("currentUser"))
  );
}

function getTradeflowToken() {
  const storedUser = getTradeflowUser();

  if (storedUser?.token) return storedUser.token;
  if (storedUser?.accessToken) return storedUser.accessToken;

  return (
    localStorage.getItem("tradeflowAccessToken") ||
    localStorage.getItem("tradeflowToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("jwt") ||
    sessionStorage.getItem("tradeflowAccessToken") ||
    sessionStorage.getItem("tradeflowToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("authToken") ||
    sessionStorage.getItem("jwt") ||
    ""
  );
}

function saveTradeflowUser(data = {}) {
  const rawData = data.data || {};
  const rawUser = data.user || rawData.user || rawData || data;
  const token =
    data.token ||
    data.accessToken ||
    data.jwt ||
    rawData.token ||
    rawData.accessToken ||
    rawData.jwt ||
    rawUser.token ||
    rawUser.accessToken;

  if (!token) {
    throw new Error("Authentication token missing");
  }

  const email = normalizeEmail(rawUser.email);

  const finalUser = {
    ...rawUser,
    email,
    token,
    accessToken: token,
    role: rawUser.role || "Founder",
    permissions: rawUser.permissions || {},
    isLoggedIn: true,
    isOwner: isOwnerEmail(email)
  };

  localStorage.setItem("tradeflowUser", JSON.stringify(finalUser));
  localStorage.setItem("user", JSON.stringify(finalUser));
  localStorage.setItem("currentUser", JSON.stringify(finalUser));

  localStorage.setItem("tradeflowAccessToken", token);
  localStorage.setItem("tradeflowToken", token);
  localStorage.setItem("token", token);
  localStorage.setItem("authToken", token);
  localStorage.setItem("jwt", token);

  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("tradeflowLoggedIn", "true");
  localStorage.setItem("tradeflowIsOwner", isOwnerEmail(email) ? "true" : "false");
  localStorage.setItem("tradeflowRole", finalUser.role);
  localStorage.setItem("role", finalUser.role);

  return finalUser;
}

function clearTradeflowSession() {
  localStorage.clear();
}

function requireAuthenticatedUser() {
  const user = getTradeflowUser();
  const token = getTradeflowToken();

  if (!user || !token) {
    if (window.location.pathname === "/app") {
      return false;
    }

    clearTradeflowSession();
    window.location.href = "/login";
    return false;
  }

  return true;
}

function protectDashboard() {
  return requireAuthenticatedUser();
}

function protectMasterAdmin() {
  const user = getTradeflowUser();
  const token = getTradeflowToken();

  if (!user || !token) {
    clearTradeflowSession();
    window.location.href = "/login";
    return false;
  }

  if (!isOwnerEmail(user.email)) {
    alert("Master Admin access required.");
    window.location.href = "/app";
    return false;
  }

  return true;
}

function logoutUser() {
  clearTradeflowSession();
  window.location.href = "/login";
}

function logoutMaster() {
  logoutUser();
}

function redirectAuthenticatedUser() {
  const user = getTradeflowUser();
  const token = getTradeflowToken();

  if (user && token && window.location.pathname === "/login") {
    window.location.href = "/app";
  }
}

function redirectAuthenticatedMaster() {
  redirectAuthenticatedUser();
}

window.saveTradeflowUser = saveTradeflowUser;
window.getTradeflowUser = getTradeflowUser;
window.getAuthToken = window.getAuthToken || getTradeflowToken;
window.getTradeflowToken = getTradeflowToken;
window.clearTradeflowSession = clearTradeflowSession;
window.protectDashboard = protectDashboard;
window.protectMasterAdmin = protectMasterAdmin;
window.logoutUser = logoutUser;
window.logoutMaster = logoutMaster;
window.redirectAuthenticatedUser = redirectAuthenticatedUser;
window.redirectAuthenticatedMaster = redirectAuthenticatedMaster;
window.isOwnerEmail = isOwnerEmail;

if (window.location.pathname === "/app") {
  protectDashboard();
}
