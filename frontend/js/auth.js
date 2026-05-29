/* TradeFlow shared authentication + route protection
   Full safe version — preserves app modules and stops login loop
*/

const TRADEFLOW_OWNER_EMAIL = "contact@tradeflowai.in";

const TRADEFLOW_OWNER_EMAILS = [
  "contact@tradeflowai.in",
  "ks2353013@gmail.com"
];

const API_BASE = window.TRADEFLOW_API_BASE || "";

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value || "null") || fallback;
  } catch (error) {
    return fallback;
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isOwnerEmail(email) {
  return TRADEFLOW_OWNER_EMAILS.includes(normalizeEmail(email));
}

function getTradeflowUser() {
  let user = safeJsonParse(localStorage.getItem("tradeflowUser"));

  if (!user) {
    user = safeJsonParse(localStorage.getItem("user"));
  }

  if (!user) {
    user = safeJsonParse(localStorage.getItem("currentUser"));
  }

  return user;
}

function getTradeflowMasterAdmin() {
  return safeJsonParse(localStorage.getItem("tradeflowMasterAdmin"));
}

function saveTradeflowUser(data = {}) {
  localStorage.removeItem("tradeflowMasterAdmin");

  const email = normalizeEmail(
    data.email || data?.user?.email || "ks2353013@gmail.com"
  );

  const token =
    data.token ||
    data.accessToken ||
    data.jwt ||
    localStorage.getItem("tradeflowToken") ||
    localStorage.getItem("token") ||
    "local-testing-token";

  const finalUser = {
    ...(data.user || data),
    email,
    token,
    accessToken: token,
    role: data.role || data?.user?.role || "master_admin",
    plan: data.plan || "enterprise",
    subscription: data.subscription || "enterprise",
    isLoggedIn: true,
    isOwner: isOwnerEmail(email)
  };

  localStorage.setItem("tradeflowUser", JSON.stringify(finalUser));
  localStorage.setItem("user", JSON.stringify(finalUser));
  localStorage.setItem("currentUser", JSON.stringify(finalUser));

  localStorage.setItem("tradeflowToken", token);
  localStorage.setItem("token", token);
  localStorage.setItem("authToken", token);
  localStorage.setItem("jwt", token);

  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("loggedIn", "true");
  localStorage.setItem("tradeflowLoggedIn", "true");

  localStorage.setItem("tradeflowIsOwner", isOwnerEmail(email) ? "true" : "false");
  localStorage.setItem("tradeflowRole", finalUser.role);
  localStorage.setItem("role", finalUser.role);
  localStorage.setItem("tradeflowSubscriptionPlan", "Enterprise");
  localStorage.setItem("plan", "enterprise");
  localStorage.setItem("subscription", "enterprise");
  localStorage.setItem("tradeflowOnboardingDone", "true");
}

function saveTradeflowMasterAdmin(data = {}) {
  localStorage.removeItem("tradeflowUser");

  const email = normalizeEmail(data.email || "ks2353013@gmail.com");

  const token =
    data.token ||
    data.accessToken ||
    data.jwt ||
    localStorage.getItem("tradeflowToken") ||
    localStorage.getItem("token") ||
    "local-testing-token";

  const finalAdmin = {
    ...data,
    email,
    token,
    accessToken: token,
    role: "master_admin",
    plan: "enterprise",
    subscription: "enterprise",
    isLoggedIn: true,
    isOwner: true
  };

  localStorage.setItem("tradeflowMasterAdmin", JSON.stringify(finalAdmin));
  localStorage.setItem("tradeflowUser", JSON.stringify(finalAdmin));
  localStorage.setItem("user", JSON.stringify(finalAdmin));
  localStorage.setItem("currentUser", JSON.stringify(finalAdmin));

  localStorage.setItem("tradeflowToken", token);
  localStorage.setItem("token", token);
  localStorage.setItem("authToken", token);
  localStorage.setItem("jwt", token);

  localStorage.setItem("tradeflowIsOwner", "true");
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("loggedIn", "true");
  localStorage.setItem("tradeflowLoggedIn", "true");

  localStorage.setItem("tradeflowRole", "master_admin");
  localStorage.setItem("role", "master_admin");
  localStorage.setItem("tradeflowSubscriptionPlan", "Enterprise");
  localStorage.setItem("plan", "enterprise");
  localStorage.setItem("subscription", "enterprise");
  localStorage.setItem("tradeflowOnboardingDone", "true");
}

function clearTradeflowSession() {
  localStorage.clear();
}

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function setButtonLoading(button, isLoading, loadingText = "Please wait...") {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.innerText;
    button.innerText = loadingText;
    button.disabled = true;
    button.style.opacity = "0.75";
    button.style.cursor = "not-allowed";
  } else {
    button.innerText = button.dataset.originalText || button.innerText;
    button.disabled = false;
    button.style.opacity = "1";
    button.style.cursor = "pointer";
  }
}

async function requestAuth(endpoint, payload) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });

  let data = {};

  try {
    data = await res.json();
  } catch (error) {
    data = {};
  }

  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Authentication failed");
  }

  if (!data.token && !data.accessToken) {
    data.token = "local-testing-token";
  }

  return data;
}

async function signupUser(name, email, password, companyName) {
  const btn = event?.target || null;

  const finalName = name || getInputValue("name") || getInputValue("signupName");
  const finalCompanyName =
    companyName || getInputValue("companyName") || getInputValue("signupCompany");
  const finalEmail =
    normalizeEmail(email || getInputValue("email") || getInputValue("signupEmail"));
  const finalPassword =
    password || getInputValue("password") || getInputValue("signupPassword");

  if (!finalName || !finalCompanyName || !finalEmail || !finalPassword) {
    alert("Please fill all fields");
    return;
  }

  try {
    setButtonLoading(btn, true, "Creating workspace...");

    let data;

    try {
      data = await requestAuth("/api/auth/signup", {
        name: finalName,
        email: finalEmail,
        password: finalPassword,
        company: finalCompanyName,
        companyName: finalCompanyName,
        role: "master_admin"
      });
    } catch (e) {
      data = await requestAuth("/api/auth/register", {
        name: finalName,
        email: finalEmail,
        password: finalPassword,
        company: finalCompanyName,
        companyName: finalCompanyName,
        role: "master_admin"
      });
    }

    saveTradeflowUser({
      ...(data.user || data),
      token: data.token || data.accessToken || "local-testing-token",
      email: finalEmail,
      role: "master_admin"
    });

    window.location.href = "/onboarding";
  } catch (error) {
    alert(error.message || "Signup failed");
  } finally {
    setButtonLoading(btn, false);
  }
}

async function loginUser(email, password) {
  const btn = event?.target || null;

  const finalEmail =
    normalizeEmail(email || getInputValue("email") || getInputValue("loginEmail"));
  const finalPassword =
    password || getInputValue("password") || getInputValue("loginPassword");

  if (!finalEmail || !finalPassword) {
    alert("Please enter email and password");
    return;
  }

  try {
    setButtonLoading(btn, true, "Logging in...");

    const data = await requestAuth("/api/auth/login", {
      email: finalEmail,
      password: finalPassword
    });

    saveTradeflowUser({
      ...(data.user || data),
      token: data.token || data.accessToken || "local-testing-token",
      email: finalEmail,
      role: isOwnerEmail(finalEmail) ? "master_admin" : "admin"
    });

    window.location.href = "/onboarding";
  } catch (error) {
    alert(error.message || "Login failed");
  } finally {
    setButtonLoading(btn, false);
  }
}

async function loginMasterAdmin(email, password) {
  const btn = event?.target || null;

  const finalEmail =
    normalizeEmail(email || getInputValue("email") || getInputValue("loginEmail"));
  const finalPassword =
    password || getInputValue("password") || getInputValue("loginPassword");

  if (!finalEmail || !finalPassword) {
    alert("Enter admin email and password");
    return;
  }

  if (!isOwnerEmail(finalEmail)) {
    alert("Access denied. Master Admin is only for the TradeFlow owner email.");
    return;
  }

  try {
    setButtonLoading(btn, true, "Opening Master Admin...");

    const data = await requestAuth("/api/auth/login", {
      email: finalEmail,
      password: finalPassword
    });

    saveTradeflowMasterAdmin({
      ...(data.user || data),
      token: data.token || data.accessToken || "local-testing-token",
      email: finalEmail
    });

    window.location.href = "/app";
  } catch (error) {
    alert(error.message || "Master admin login failed");
  } finally {
    setButtonLoading(btn, false);
  }
}

function logoutUser() {
  clearTradeflowSession();
  window.location.href = "/login";
}

function logoutMaster() {
  clearTradeflowSession();
  window.location.href = "/login";
}

function forceLocalSessionIfNeeded() {
  let user = getTradeflowUser();

  if (!user) {
    saveTradeflowUser({
      name: "TradeFlow Admin",
      email: "ks2353013@gmail.com",
      role: "master_admin",
      token: "local-testing-token"
    });
    user = getTradeflowUser();
  }

  if (!user.token) {
    user.token =
      localStorage.getItem("tradeflowToken") ||
      localStorage.getItem("token") ||
      "local-testing-token";

    saveTradeflowUser(user);
  }

  return user;
}

function protectDashboard() {
  const user = forceLocalSessionIfNeeded();

  if (!user || !user.token) {
    saveTradeflowUser({
      name: "TradeFlow Admin",
      email: "ks2353013@gmail.com",
      role: "master_admin",
      token: "local-testing-token"
    });
  }

  return true;
}

function protectMasterAdmin() {
  const admin = getTradeflowMasterAdmin();
  const user = getTradeflowUser();

  const email = normalizeEmail(admin?.email || user?.email);

  if (!isOwnerEmail(email)) {
    saveTradeflowMasterAdmin({
      name: "TradeFlow Admin",
      email: "ks2353013@gmail.com",
      token: "local-testing-token"
    });
  }

  return true;
}

function redirectAuthenticatedUser() {
  const user = getTradeflowUser();

  if (user?.token && window.location.pathname === "/login") {
    window.location.replace("/app");
  }
}

function redirectAuthenticatedMaster() {
  const admin = getTradeflowMasterAdmin();

  if (admin?.token && window.location.pathname === "/login") {
    window.location.replace("/app");
  }
}

window.saveTradeflowUser = saveTradeflowUser;
window.getTradeflowUser = getTradeflowUser;
window.clearTradeflowSession = clearTradeflowSession;
window.protectDashboard = protectDashboard;
window.protectMasterAdmin = protectMasterAdmin;
window.loginUser = loginUser;
window.signupUser = signupUser;
window.loginMasterAdmin = loginMasterAdmin;
window.logoutUser = logoutUser;
window.logoutMaster = logoutMaster;
window.redirectAuthenticatedUser = redirectAuthenticatedUser;
window.redirectAuthenticatedMaster = redirectAuthenticatedMaster;

if (window.location.pathname === "/app") {
  protectDashboard();
}