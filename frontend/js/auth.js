/* TradeFlow shared authentication + route protection
   Place this file at: frontend/js/auth.js
*/

const TRADEFLOW_OWNER_EMAIL = "ks2353013@gmail.com";
const API_BASE = window.TRADEFLOW_API_BASE || "https://trade-flow-lc1k.onrender.com";

function safeJsonParse(value, fallback = null) {
  try {
    return JSON.parse(value || "null") || fallback;
  } catch (error) {
    return fallback;
  }
}

function getTradeflowUser() {
  return safeJsonParse(localStorage.getItem("tradeflowUser"));
}

function getTradeflowMasterAdmin() {
  return safeJsonParse(localStorage.getItem("tradeflowMasterAdmin"));
}

function saveTradeflowUser(data) {
  localStorage.removeItem("tradeflowMasterAdmin");
  localStorage.setItem("tradeflowUser", JSON.stringify(data));
}

function saveTradeflowMasterAdmin(data) {
  localStorage.removeItem("tradeflowUser");
  localStorage.setItem("tradeflowMasterAdmin", JSON.stringify(data));
}

function clearTradeflowSession() {
  localStorage.removeItem("tradeflowUser");
  localStorage.removeItem("tradeflowMasterAdmin");
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
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await res.json();
  } catch (error) {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.message || "Authentication failed");
  }

  if (!data.token) {
    throw new Error("Token not received from backend.");
  }

  return data;
}

async function signupUser(name, email, password, companyName) {
  const btn = event?.target || null;

  const finalName = name || getInputValue("name");
  const finalCompanyName = companyName || getInputValue("companyName");
  const finalEmail = (email || getInputValue("email")).toLowerCase();
  const finalPassword = password || getInputValue("password");

  if (!finalName || !finalCompanyName || !finalEmail || !finalPassword) {
    alert("Please fill all fields");
    return;
  }

  try {
    setButtonLoading(btn, true, "Creating workspace...");
    const data = await requestAuth("/api/auth/register", {
      name: finalName,
      email: finalEmail,
      password: finalPassword,
      companyName: finalCompanyName,
    });

    saveTradeflowUser(data);
    window.location.href = "index.html";
  } catch (error) {
    alert(error.message || "Signup failed");
  } finally {
    setButtonLoading(btn, false);
  }
}

async function loginUser(email, password) {
  const btn = event?.target || null;

  const finalEmail = (email || getInputValue("email")).toLowerCase();
  const finalPassword = password || getInputValue("password");

  if (!finalEmail || !finalPassword) {
    alert("Please enter email and password");
    return;
  }

  try {
    setButtonLoading(btn, true, "Logging in...");
    const data = await requestAuth("/api/auth/login", {
      email: finalEmail,
      password: finalPassword,
    });

    saveTradeflowUser(data);
    window.location.href = "index.html";
  } catch (error) {
    alert(error.message || "Login failed");
  } finally {
    setButtonLoading(btn, false);
  }
}

async function loginMasterAdmin(email, password) {
  const btn = event?.target || null;

  const finalEmail = (email || getInputValue("email")).toLowerCase();
  const finalPassword = password || getInputValue("password");

  if (!finalEmail || !finalPassword) {
    alert("Enter admin email and password");
    return;
  }

  if (finalEmail !== TRADEFLOW_OWNER_EMAIL) {
    alert("Access denied. Master Admin is only for the TradeFlow owner email.");
    return;
  }

  try {
    setButtonLoading(btn, true, "Opening Master Admin...");
    const data = await requestAuth("/api/auth/login", {
      email: finalEmail,
      password: finalPassword,
    });

    if ((data.email || finalEmail).toLowerCase() !== TRADEFLOW_OWNER_EMAIL) {
      throw new Error("Unauthorized master admin account.");
    }

    saveTradeflowMasterAdmin(data);
    window.location.href = "master-admin.html";
  } catch (error) {
    alert(error.message || "Master admin login failed");
  } finally {
    setButtonLoading(btn, false);
  }
}

function logoutUser() {
  clearTradeflowSession();
  window.location.href = "login.html";
}

function logoutMaster() {
  clearTradeflowSession();
  window.location.href = "master-login.html";
}

function protectDashboard() {
  const user = getTradeflowUser();

  if (!user || !user.token) {
    clearTradeflowSession();
    window.location.replace("login.html");
    return false;
  }

  return true;
}

function protectMasterAdmin() {
  const admin = getTradeflowMasterAdmin();
  const email = (admin?.email || "").toLowerCase();

  if (!admin || !admin.token || email !== TRADEFLOW_OWNER_EMAIL) {
    clearTradeflowSession();
    alert("Master Admin is restricted to the owner email only.");
    window.location.replace("master-login.html");
    return false;
  }

  return true;
}

function redirectAuthenticatedUser() {
  const user = getTradeflowUser();
  if (user?.token) {
    window.location.replace("index.html");
  }
}

function redirectAuthenticatedMaster() {
  const admin = getTradeflowMasterAdmin();
  if (admin?.token && (admin.email || "").toLowerCase() === TRADEFLOW_OWNER_EMAIL) {
    window.location.replace("master-admin.html");
  }
}
