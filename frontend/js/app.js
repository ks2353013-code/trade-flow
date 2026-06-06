const TRADEFLOW_RENDER_BACKEND_URL = "https://trade-flow-lc1k.onrender.com";
const BACKEND_URL =
  window.TradeFlowSessionManager?.getBackendUrl?.() ||
  window.BACKEND_URL ||
  (
    ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
      ? window.location.origin
      : TRADEFLOW_RENDER_BACKEND_URL
  );
window.BACKEND_URL = BACKEND_URL;

const API_URL = `${BACKEND_URL}/suppliers`;
const AI_URL = `${BACKEND_URL}/api/ai`;
const DEAL_URL = `${BACKEND_URL}/api/deals`;
const TASK_URL = `${BACKEND_URL}/api/tasks`;
const PDF_URL = `${BACKEND_URL}/api/pdf`;
const ANALYTICS_URL = `${BACKEND_URL}/api/analytics`;
const OUTREACH_URL = `${BACKEND_URL}/api/outreach`;
const EMAIL_URL = `${BACKEND_URL}/api/email`;
const EMPLOYEE_URL = `${BACKEND_URL}/api/employees`;
const NOTIFICATION_URL = `${BACKEND_URL}/api/notifications`;
const WORKSPACE_URL = `${BACKEND_URL}/api/workspaces`;

let appReady = false;
let workspaceWaiters = [];
let bootstrapPromise = null;
const workspaceSubscribers = new Set();
const bootstrapState = {
  status: "idle",
  step: "idle",
  completed: false,
  error: "",
  sessionRestored: false,
  userLoaded: false,
  companyLoaded: false,
  workspacesLoaded: false,
  workspaceVerified: false,
  modulesInitialized: false
};
const requestLoading = {
  workspaces: false,
  analytics: false,
  notifications: false,
  suppliers: false,
  deals: false
};
let dashboardPollingStarted = false;
const WORKSPACE_ID_KEYS = [
  "tradeflowActiveWorkspace",
  "tradeflowActiveWorkspaceId",
  "tradeflowActiveWorkspaceV1",
  "activeWorkspace",
  "activeWorkspaceId",
  "workspaceId"
];
const workspaceState = {
  workspaceId: "",
  workspaceName: "",
  companyId: "",
  loaded: false
};

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

function bootstrapDebug(message) {
  debugLog(`[BOOTSTRAP] ${message}`);
}


function getUser() {
  const keys = ["tradeflowUser", "user", "currentUser"];

  for (const key of keys) {
    try {
      const user = localStorage.getItem(key);
      if (user) return JSON.parse(user);
    } catch (error) {
      localStorage.removeItem(key);
    }
  }

  try {
    const user = sessionStorage.getItem("tradeflowUser");
    return user ? JSON.parse(user) : null;
  } catch (error) {
    sessionStorage.removeItem("tradeflowUser");
    return null;
  }
}

function getStoredToken() {
  const user = getUser();

  return (
    user?.token ||
    user?.accessToken ||
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

window.getAuthToken = getStoredToken;

function storeAuthSession(data = {}) {
  const rawData = data?.data && typeof data.data === "object" ? data.data : data;
  const rawUser = rawData.user || data.user || {};
  const token =
    rawData.token ||
    rawData.accessToken ||
    rawUser.token ||
    rawUser.accessToken ||
    "";

  if (token) {
    localStorage.setItem("tradeflowAccessToken", token);
    localStorage.setItem("tradeflowToken", token);
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("jwt", token);
  }

  if (rawUser && Object.keys(rawUser).length) {
    const existingUser = getUser() || {};
    const user = {
      ...existingUser,
      ...rawUser,
      id: rawUser.id || rawUser._id || existingUser.id,
      _id: rawUser._id || rawUser.id || existingUser._id,
      token: token || existingUser.token,
      accessToken: token || existingUser.accessToken,
      isLoggedIn: true
    };

    localStorage.setItem("tradeflowUser", JSON.stringify(user));
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("currentUser", JSON.stringify(user));
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("tradeflowLoggedIn", "true");
  }

  return Boolean(token || Object.keys(rawUser || {}).length);
}

async function validateStoredSession() {
  const token = getStoredToken();
  if (!token) return false;

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/session`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      credentials: "include"
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.valid === true) {
        storeAuthSession(data);
        return true;
      }
    }

    if (!isConfirmedAuthFailureStatus(res.status)) {
      logAuthDebug("session validation deferred", `status ${res.status}`);
      return "deferred";
    }
  } catch (error) {
    logAuthDebug("session validation deferred", error.message);
    return "deferred";
  }

  try {
    const refreshRes = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include"
    });

    if (!refreshRes.ok) return false;

    const refreshData = await refreshRes.json();
    return storeAuthSession(refreshData);
  } catch (error) {
    logAuthDebug("session refresh failed", error.message);
    return false;
  }
}

function isMongoObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || "").trim());
}

function getJsonStorage(key, fallback = null) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getWorkspaceIdFromObject(workspace = {}) {
  const id = String(
    workspace._id ||
    workspace.id ||
    workspace.workspaceId ||
    ""
  ).trim();

  return isMongoObjectId(id) ? id : "";
}

function readLegacyActiveWorkspaceId() {
  const storedWorkspace = getJsonStorage("tradeflowActiveWorkspaceObject", {});
  const candidates = [
    ...WORKSPACE_ID_KEYS.map((key) => localStorage.getItem(key)),
    getWorkspaceIdFromObject(storedWorkspace)
  ];

  return candidates.find(isMongoObjectId) || "";
}

function getCanonicalActiveWorkspaceId() {
  return isMongoObjectId(workspaceState.workspaceId)
    ? workspaceState.workspaceId
    : "";
}

function getWorkspaceStateSnapshot() {
  return { ...workspaceState };
}

function subscribeWorkspace(callback) {
  if (typeof callback !== "function") return () => {};

  workspaceSubscribers.add(callback);
  callback(getWorkspaceStateSnapshot());

  return () => workspaceSubscribers.delete(callback);
}

function notifyWorkspaceSubscribers() {
  const snapshot = getWorkspaceStateSnapshot();
  workspaceSubscribers.forEach((callback) => {
    try {
      callback(snapshot);
    } catch (error) {
      debugLog("Workspace subscriber failed:", error.message);
    }
  });
}

function updateWorkspaceState(next = {}) {
  workspaceState.workspaceId = isMongoObjectId(next.workspaceId)
    ? next.workspaceId
    : "";
  workspaceState.workspaceName = next.workspaceName || "";
  workspaceState.companyId = isMongoObjectId(next.companyId)
    ? next.companyId
    : "";
  workspaceState.loaded = Boolean(next.loaded);

  notifyWorkspaceSubscribers();

  if (workspaceState.workspaceId) {
    notifyWorkspaceReady(workspaceState.workspaceId);
  }
}

function clearCanonicalActiveWorkspace() {
  [
    "tradeflowActiveWorkspaceId",
    "tradeflowActiveWorkspace",
    "tradeflowActiveWorkspaceV1",
    "tradeflowActiveWorkspaceName",
    "tradeflowActiveWorkspaceObject",
    "activeWorkspaceId",
    "activeWorkspace",
    "activeWorkspaceName",
    "workspaceId"
  ].forEach((key) => localStorage.removeItem(key));

  updateWorkspaceState({
    workspaceId: "",
    workspaceName: "",
    companyId: "",
    loaded: true
  });
}

function updateWorkspaceSelectValue(id, workspaceId) {
  const select = document.getElementById(id);
  if (!select || !workspaceId) return;

  const hasOption = Array.from(select.options || []).some(
    (option) => option.value === workspaceId
  );

  if (hasOption) {
    select.value = workspaceId;
  }
}

function setCanonicalActiveWorkspace(workspace = {}) {
  const workspaceId = getWorkspaceIdFromObject(workspace);

  if (!workspaceId) {
    clearCanonicalActiveWorkspace();
    return "";
  }

  const workspaceName = workspaceDisplayName(workspace);
  const companyId = String(
    workspace.companyId ||
    workspace.company?._id ||
    workspace.company?.id ||
    ""
  ).trim();
  const canonicalWorkspace = {
    ...workspace,
    _id: workspaceId,
    id: workspaceId,
    name: workspace.name || workspace.workspaceName || workspaceName,
    workspaceName: workspace.workspaceName || workspace.name || workspaceName
  };

  localStorage.setItem("tradeflowActiveWorkspaceId", workspaceId);
  localStorage.setItem("tradeflowActiveWorkspace", workspaceId);
  localStorage.setItem("tradeflowActiveWorkspaceV1", workspaceId);
  localStorage.setItem("tradeflowActiveWorkspaceName", workspaceName);
  localStorage.setItem("tradeflowActiveWorkspaceObject", JSON.stringify(canonicalWorkspace));
  localStorage.setItem("activeWorkspaceId", workspaceId);
  localStorage.setItem("activeWorkspace", workspaceId);
  localStorage.setItem("activeWorkspaceName", workspaceName);
  localStorage.setItem("workspaceId", workspaceId);

  if (isMongoObjectId(companyId)) {
    localStorage.setItem("tradeflowActiveCompany", companyId);
  }

  updateWorkspaceState({
    workspaceId,
    workspaceName,
    companyId,
    loaded: true
  });

  document.dispatchEvent(
    new CustomEvent("tradeflow:workspace-change", {
      detail: {
        workspace: canonicalWorkspace,
        state: getWorkspaceStateSnapshot()
      }
    })
  );

  return workspaceId;
}

function getCanonicalActiveWorkspaceObject() {
  const storedWorkspace = getJsonStorage("tradeflowActiveWorkspaceObject", {});
  const workspaceId = getCanonicalActiveWorkspaceId();

  if (workspaceId && getWorkspaceIdFromObject(storedWorkspace) === workspaceId) {
    return storedWorkspace;
  }

  const cachedWorkspaces = getJsonStorage("tradeflowWorkspacesV1", []);
  if (Array.isArray(cachedWorkspaces)) {
    return cachedWorkspaces.find((workspace) =>
      getWorkspaceIdFromObject(workspace) === workspaceId
    ) || null;
  }

  return null;
}

function notifyWorkspaceReady(workspaceId) {
  if (!isMongoObjectId(workspaceId)) return;

  const waiters = workspaceWaiters.slice();
  workspaceWaiters = [];
  waiters.forEach((resolve) => resolve(workspaceId));
}

function normalizeWorkspaceForStorage(workspace = {}) {
  const workspaceId = getWorkspaceIdFromObject(workspace);
  if (!workspaceId) return null;

  const name = workspaceDisplayName(workspace);

  return {
    ...workspace,
    _id: workspaceId,
    id: workspaceId,
    name: workspace.name || workspace.workspaceName || name,
    workspaceName: workspace.workspaceName || workspace.name || name,
    backend: true
  };
}

function restoreActiveWorkspace(workspaces = []) {
  sanitizeWorkspaceHeaderState();

  const normalized = (Array.isArray(workspaces) ? workspaces : [])
    .map(normalizeWorkspaceForStorage)
    .filter(Boolean);

  if (normalized.length) {
    localStorage.setItem("tradeflowWorkspacesV1", JSON.stringify(normalized));
  }

  const currentId = getCanonicalActiveWorkspaceId() || readLegacyActiveWorkspaceId();
  const currentWorkspace =
    normalized.find((workspace) => workspace._id === currentId) ||
    normalized[0] ||
    getCanonicalActiveWorkspaceObject();

  return currentWorkspace ? setCanonicalActiveWorkspace(currentWorkspace) : "";
}

function waitForWorkspace(options = {}) {
  const timeoutMs = Number(options.timeoutMs || 8000);
  const existingId = getCanonicalActiveWorkspaceId();

  if (existingId) return Promise.resolve(existingId);

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(""), timeoutMs);

    workspaceWaiters.push((workspaceId) => {
      window.clearTimeout(timer);
      resolve(workspaceId);
    });
  });
}

function getActiveCompanyId() {
  const user = getUser() || {};
  const candidates = [
    localStorage.getItem("tradeflowActiveCompany"),
    user.companyId,
    user.company?._id,
    user.company?.id,
    getCanonicalActiveWorkspaceObject()?.companyId,
    getCanonicalActiveWorkspaceObject()?.company?._id,
    getCanonicalActiveWorkspaceObject()?.company?.id
  ];

  return candidates.find(isMongoObjectId) || "";
}

function getStoredActiveWorkspaceId() {
  return getCanonicalActiveWorkspaceId();
}

function rememberActiveWorkspace(id, name) {
  return setCanonicalActiveWorkspace({
    _id: id,
    id,
    name,
    workspaceName: name
  });
}

function workspaceDisplayName(workspace = {}) {
  return (
    workspace.companyName ||
    workspace.workspaceName ||
    workspace.name ||
    "Workspace"
  );
}

function normalizeApiList(data, key) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.data?.[key])) return data.data[key];
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (key === "workspaces" && data?.workspace && typeof data.workspace === "object") {
    return [data.workspace];
  }
  if (key === "workspaces" && data?.data?.workspace && typeof data.data.workspace === "object") {
    return [data.data.workspace];
  }
  return [];
}

function sanitizeWorkspaceHeaderState() {
  WORKSPACE_ID_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);

    if (value && !isMongoObjectId(value)) {
      localStorage.removeItem(key);
    }
  });

  const cachedWorkspaces = getJsonStorage("tradeflowWorkspacesV1", []);
  if (Array.isArray(cachedWorkspaces)) {
    const backendWorkspaces = cachedWorkspaces.filter((workspace) =>
      isMongoObjectId(workspace?._id || workspace?.id)
    );

    localStorage.setItem("tradeflowWorkspacesV1", JSON.stringify(backendWorkspaces));
  }

  const activeObject = getJsonStorage("tradeflowActiveWorkspaceObject", null);
  if (activeObject && !getWorkspaceIdFromObject(activeObject)) {
    localStorage.removeItem("tradeflowActiveWorkspaceObject");
  }
}

sanitizeWorkspaceHeaderState();

function syncWorkspaceChrome(state) {
  const workspaceId = state.workspaceId || "";
  const workspaceName = state.workspaceName || "None";

  updateWorkspaceSelectValue("activeWorkspaceSelect", workspaceId);
  updateWorkspaceSelectValue("workspaceAccessSelect", workspaceId);

  const currentWorkspaceName = document.getElementById("currentWorkspaceName");
  if (currentWorkspaceName) currentWorkspaceName.innerText = workspaceName;

  const adminActiveCompany = document.getElementById("adminActiveCompany");
  if (adminActiveCompany && workspaceName !== "None") {
    adminActiveCompany.innerText = workspaceName;
  }

  const workspaceNameHeader = document.getElementById("workspaceName");
  const user = getUser();
  if (workspaceNameHeader && user && workspaceName !== "None") {
    workspaceNameHeader.innerText =
      `${workspaceName} â€¢ ${user.name || "User"} Workspace`;
  }

  if (window.TradeFlowWorkspaceDataIsolationV2?.updateIsolationStatus) {
    window.TradeFlowWorkspaceDataIsolationV2.updateIsolationStatus();
  }
}

window.getCanonicalActiveWorkspaceId = getCanonicalActiveWorkspaceId;
window.setCanonicalActiveWorkspace = setCanonicalActiveWorkspace;
window.clearCanonicalActiveWorkspace = clearCanonicalActiveWorkspace;
window.TradeFlowWorkspace = {
  state: workspaceState,
  getState: getWorkspaceStateSnapshot,
  subscribe: subscribeWorkspace,
  isValidWorkspaceId: isMongoObjectId,
  getActiveWorkspaceId: getCanonicalActiveWorkspaceId,
  getActiveWorkspace: getCanonicalActiveWorkspaceObject,
  setActiveWorkspace: setCanonicalActiveWorkspace,
  clearActiveWorkspace: clearCanonicalActiveWorkspace,
  restoreActiveWorkspace,
  waitForWorkspace
};
window.TradeFlowWorkspace.subscribe(syncWorkspaceChrome);
function protectDashboard() {
  const user = getUser();
  const token = getStoredToken();

  if (!user || !token) {
    return false;
  }

  document.getElementById("workspaceName").innerText =
    `${user.companyName || "TradeFlow Company"} • ${user.name || "User"} Workspace`;

  document.getElementById("userBadge").innerText =
    user.email || "Authenticated User";

  const adminActiveCompany = document.getElementById("adminActiveCompany");
  const adminUserName = document.getElementById("adminUserName");

  if (adminActiveCompany) {
    adminActiveCompany.innerText =
      workspaceState.workspaceName || user.companyName || "TradeFlow Company";
  }

  if (adminUserName) {
    adminUserName.innerText = user.name || user.email || "Admin";
  }

  appReady = true;
  return true;
}

function getAuthHeaders() {
  const user = getUser();
  const token = getStoredToken();

  if (!user || !token) {
    throw new Error("Token missing");
  }

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  const workspaceId = getStoredActiveWorkspaceId();
  if (workspaceId) {
    headers["x-workspace-id"] = workspaceId;
  }

  return headers;
}

function isConfirmedAuthFailureStatus(status) {
  return status === 401 || status === 403;
}

function logAuthDebug(message, value) {
  debugLog("[AUTH DEBUG] " + message, value);
}

function redirectToLogin(reason) {
  logAuthDebug("redirect reason", reason);
  window.location.replace("/login");
}

function handleModuleAuthFailure(reason) {
  logAuthDebug("redirect reason", `module auth failure ignored: ${reason}`);
}

function logoutUser(options = {}) {
  if (!options.explicit) {
    handleModuleAuthFailure("logoutUser called without explicit user action");
    return;
  }

  localStorage.removeItem("tradeflowUser");
  window.location.href = "/login";
}

async function restoreTradeFlowAppSession() {
  logAuthDebug("token on app boot", getStoredToken() ? "present" : "missing");

  if (getUser() && getStoredToken()) {
    const validated = await validateStoredSession();
    if (validated === true || validated === "deferred") return true;
    logAuthDebug("redirect reason", "stored token rejected by backend");
    return false;
  }

  if (window.TradeFlowSessionManager?.restoreSession) {
    return await window.TradeFlowSessionManager.restoreSession();
  }

  return false;
}

function getBootstrapStateSnapshot() {
  return { ...bootstrapState };
}

function updateBootstrapState(patch = {}) {
  Object.assign(bootstrapState, patch);

  document.dispatchEvent(
    new CustomEvent("tradeflow:bootstrap-state", {
      detail: getBootstrapStateSnapshot()
    })
  );
}

function withTimeout(promise, timeoutMs, message) {
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = window.setTimeout(() => {
      reject(new Error(message || "Operation timed out"));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timer);
  });
}

async function waitForBootstrapForDataLoad(options = {}) {
  if (options.duringBootstrap || bootstrapState.completed) return;
  if (window.TradeFlowBootstrap?.whenReady) {
    await window.TradeFlowBootstrap.whenReady();
  }
}

function hasWorkspaceForDataLoad(options = {}) {
  if (options.duringBootstrap || options.allowWithoutWorkspace) return true;
  return Boolean(getCanonicalActiveWorkspaceId());
}

async function waitForBootstrap(timeoutMs = 15000) {
  const pending = bootstrapPromise || bootstrap();

  if (bootstrapState.completed) {
    return getBootstrapStateSnapshot();
  }

  return withTimeout(pending, timeoutMs, "Timed out waiting for app bootstrap")
    .catch((error) => {
      updateBootstrapState({
        status: "error",
        error: error.message
      });
      return getBootstrapStateSnapshot();
    });
}

window.TradeFlowBootstrap = {
  state: bootstrapState,
  bootstrap,
  whenReady: waitForBootstrap,
  getState: getBootstrapStateSnapshot
};

const pages = [
  "dashboard",
  "master",
  "workspaces",
  "employees",
  "suppliers",
  "crm",
  "negotiation",
  "tasks",
  "marketing",
  "documents",
  "outreach",
  "analytics",
  "executiveTower",
  "ai",
  "notifications"
];

function showPage(page) {
  if (!appReady) return;

  if (
    (page === "ai" || page === "executiveTower") &&
    window.TradeFlowAISubscriptionGate?.isBlocked?.()
  ) {
    window.TradeFlowAISubscriptionGate.showUpgradePrompt();
    page = "dashboard";
  }

  pages.forEach((p) => {
    const el = document.getElementById(`${p}Page`);
    if (el) el.classList.add("hidden");
  });

  const targetPage = document.getElementById(`${page}Page`);

  if (!targetPage) {
    alert("This page is not available yet: " + page);
    return;
  }

  targetPage.classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active-nav");
    const onclick = (btn.getAttribute("onclick") || "").toLowerCase();
    if (onclick.includes(`showpage('${page}')`) || onclick.includes(`showpage("${page}")`)) {
      btn.classList.add("active-nav");
    }
  });

  document.dispatchEvent(
    new CustomEvent("tradeflow:page-change", {
      detail: { page }
    })
  );

  // Fast dashboard: only lightweight summary calls.
  if (page === "dashboard") {
    startDashboardPolling();
    return;
  }

  // Lazy-load heavy modules only when opened.
  if (page === "suppliers") safeRun(fetchSuppliers);
  if (page === "crm") safeRun(fetchDeals);
  if (page === "analytics") safeRun(fetchAnalytics);
  if (page === "outreach") safeRun(fetchOutreachRecords);
  if (page === "employees") safeRun(fetchEmployees);
  if (page === "notifications") safeRun(fetchNotifications);
  if (page === "workspaces" || page === "master") safeRun(fetchWorkspaces);
  if (page === "tasks") safeRun(fetchTasks);
}

function safeRun(fn) {
  try {
    if (typeof fn === "function") fn();
  } catch (error) {
    debugLog("Module skipped:", error.message);
  }
}

function getEmployeePermissionsFromForm() {
  return {
    dashboard: document.getElementById("permDashboard").checked,
    suppliers: document.getElementById("permSuppliers").checked,
    crm: document.getElementById("permCrm").checked,
    tasks: document.getElementById("permTasks").checked,
    analytics: document.getElementById("permAnalytics").checked,
    documents: document.getElementById("permDocuments").checked,
    outreach: document.getElementById("permOutreach").checked,
    ai: document.getElementById("permAi").checked
  };
}

function setEmployeePermissions(perms) {
  document.getElementById("permDashboard").checked = !!perms.dashboard;
  document.getElementById("permSuppliers").checked = !!perms.suppliers;
  document.getElementById("permCrm").checked = !!perms.crm;
  document.getElementById("permTasks").checked = !!perms.tasks;
  document.getElementById("permAnalytics").checked = !!perms.analytics;
  document.getElementById("permDocuments").checked = !!perms.documents;
  document.getElementById("permOutreach").checked = !!perms.outreach;
  document.getElementById("permAi").checked = !!perms.ai;
}

function applyRolePreset() {
  const role = document.getElementById("employeeRole").value;

  const presets = {
    "Admin": {
      dashboard: true,
      suppliers: true,
      crm: true,
      tasks: true,
      analytics: true,
      documents: true,
      outreach: true,
      ai: true
    },
    "Sales Manager": {
      dashboard: true,
      suppliers: true,
      crm: true,
      tasks: true,
      analytics: true,
      documents: false,
      outreach: true,
      ai: true
    },
    "Operations": {
      dashboard: true,
      suppliers: true,
      crm: false,
      tasks: true,
      analytics: true,
      documents: true,
      outreach: false,
      ai: false
    },
    "Documentation": {
      dashboard: true,
      suppliers: false,
      crm: false,
      tasks: true,
      analytics: false,
      documents: true,
      outreach: false,
      ai: false
    },
    "Viewer": {
      dashboard: true,
      suppliers: false,
      crm: false,
      tasks: false,
      analytics: true,
      documents: false,
      outreach: false,
      ai: false
    }
  };

  setEmployeePermissions(presets[role]);
}

async function fetchEmployees() {
  try {
    const res = await fetch(EMPLOYEE_URL, {
      headers: getAuthHeaders()
    });

    if (res.status === 401) {
      logoutUser();
      return;
    }

    const data = await res.json();
    const employees = normalizeApiList(data, "employees");

    renderEmployees(employees);
  } catch (error) {
    debugLog("Employee backend not connected:", error.message);
  }
}

function renderEmployees(employees) {
  const list = document.getElementById("employeeList");

  if (!list) return;

  list.innerHTML = "";

  let activeCount = 0;
  let adminCount = 0;

  employees.forEach((employee) => {
    if (employee.status === "Active") activeCount++;
    if (employee.role === "Admin") adminCount++;

    const permissions = employee.permissions || {};

    list.innerHTML += `
      <div class="supplier-card">
        <h2 style="font-size:20px;font-weight:900;color:white;">
          ${employee.name}
        </h2>

        <p class="muted">Email: ${employee.email}</p>
        <p class="muted">Role: ${employee.role}</p>
        <p class="muted">Status: ${employee.status}</p>

        <span class="status">
          ${employee.status || "Active"}
        </span>

        <div class="deal">
          <b>Permissions:</b><br>
          Dashboard: ${permissions.dashboard ? "✅" : "❌"} |
          Suppliers: ${permissions.suppliers ? "✅" : "❌"} |
          CRM: ${permissions.crm ? "✅" : "❌"} |
          Tasks: ${permissions.tasks ? "✅" : "❌"}<br>
          Analytics: ${permissions.analytics ? "✅" : "❌"} |
          Documents: ${permissions.documents ? "✅" : "❌"} |
          Outreach: ${permissions.outreach ? "✅" : "❌"} |
          AI: ${permissions.ai ? "✅" : "❌"}
        </div>

        <select onchange="quickUpdateEmployeeStatus('${employee._id}', this.value)">
          <option ${employee.status === "Active" ? "selected" : ""}>Active</option>
          <option ${employee.status === "Inactive" ? "selected" : ""}>Inactive</option>
        </select>

        <button class="danger-btn" onclick="deleteEmployee('${employee._id}')">
          Delete Employee
        </button>
      </div>
    `;
  });

  const employeeCount = document.getElementById("employeeCount");
  const activeEmployeeCount = document.getElementById("activeEmployeeCount");
  const adminEmployeeCount = document.getElementById("adminEmployeeCount");

  if (employeeCount) employeeCount.innerText = employees.length;
  if (activeEmployeeCount) activeEmployeeCount.innerText = activeCount;
  if (adminEmployeeCount) adminEmployeeCount.innerText = adminCount;
}

async function addEmployee() {
  const name = document.getElementById("employeeName").value;
  const email = document.getElementById("employeeEmail").value;
  const role = document.getElementById("employeeRole").value;
  const status = document.getElementById("employeeStatus").value;
  const permissions = getEmployeePermissionsFromForm();

  if (!name || !email) {
    alert("Employee name and email are required.");
    return;
  }

  const res = await fetch(EMPLOYEE_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      name,
      email,
      role,
      status,
      permissions
    })
  });

  if (res.status === 401) {
    logoutUser();
    return;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    alert(data.message || "Failed to save employee.");
    return;
  }

  document.getElementById("employeeName").value = "";
  document.getElementById("employeeEmail").value = "";
  document.getElementById("employeeRole").value = "Viewer";
  document.getElementById("employeeStatus").value = "Active";
  applyRolePreset();

  fetchEmployees();
}

async function quickUpdateEmployeeStatus(id, status) {
  await fetch(`${EMPLOYEE_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });

  fetchEmployees();
}

async function deleteEmployee(id) {
  await fetch(`${EMPLOYEE_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  fetchEmployees();
}



function getActiveWorkspaceId() {
  return getCanonicalActiveWorkspaceId();
}

function getActiveWorkspaceName() {
  return workspaceState.workspaceName || "None";
}

function setActiveWorkspace() {
  const select = document.getElementById("activeWorkspaceSelect");
  if (!select) return;

  const selectedOption = select.options[select.selectedIndex];
  const selectedName = selectedOption?.text || "None";
  const workspaceId = select.value || "";

  if (!isMongoObjectId(workspaceId)) {
    clearCanonicalActiveWorkspace();
    alert("Select a valid backend workspace first.");
    return;
  }

  setCanonicalActiveWorkspace({
    _id: workspaceId,
    workspaceName: selectedName,
    name: selectedName
  });

  const currentWorkspaceName = document.getElementById("currentWorkspaceName");
  if (currentWorkspaceName) currentWorkspaceName.innerText = selectedName;

  document.getElementById("workspaceName").innerText =
    `${selectedOption.text || "TradeFlow Company"} • Active Workspace`;

  createSystemNotification(
    "Workspace Switched",
    `Active workspace changed to ${selectedOption.text}`,
    "System",
    "Low"
  );

  fetchSuppliers();
  fetchDeals();
  fetchEmployees();
}

async function fetchWorkspaces(options = {}) {
  await waitForBootstrapForDataLoad(options);

  if (requestLoading.workspaces) {
    return getJsonStorage("tradeflowWorkspacesV1", []);
  }

  requestLoading.workspaces = true;

  try {
    if (!options.duringBootstrap) {
      bootstrapDebug("workspace load");
    }

    const res = await fetch(WORKSPACE_URL, {
      headers: getAuthHeaders()
    });

    if (res.status === 401) {
      logoutUser();
      return;
    }

    const contentType = res.headers.get("content-type") || "";
    const rawBody = await res.text();

    if (!contentType.includes("application/json")) {
      console.error("[WORKSPACE API DEBUG] non-json response", {
        status: res.status,
        url: WORKSPACE_URL,
        contentType,
        bodyPreview: rawBody.slice(0, 300)
      });
      throw new Error(`Workspace API returned non-JSON response (${res.status})`);
    }

    const data = rawBody ? JSON.parse(rawBody) : {};
    if (!res.ok) {
      console.error("[WORKSPACE API DEBUG] failed response", {
        status: res.status,
        body: data
      });
    }

    const workspaces = normalizeApiList(data, "workspaces");
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      debugLog(
        `[WORKSPACE API DEBUG] frontend workspace response status=${res.status} count=${workspaces.length} keys=${Object.keys(data || {}).join(",")}`
      );
    }

    renderWorkspaces(workspaces);
    return workspaces;
  } catch (error) {
    debugLog("Workspace backend not connected:", error.message);
    return [];
  } finally {
    requestLoading.workspaces = false;
  }
}

function syncWorkspaceState(workspaces) {
  const mapped = (Array.isArray(workspaces) ? workspaces : [])
    .filter((workspace) => (workspace.status || "Active") === "Active")
    .map((workspace) => ({
      id: String(workspace._id || workspace.id || ""),
      _id: String(workspace._id || workspace.id || ""),
      name: workspaceDisplayName(workspace),
      workspaceName: workspace.workspaceName || workspaceDisplayName(workspace),
      product: workspace.industry || workspace.product || "",
      targetMarket: workspace.country || workspace.targetMarket || "",
      businessType: workspace.businessType || workspace.type || "Trading Company",
      status: workspace.status || "Active",
      backend: true,
      createdAt: workspace.createdAt || new Date().toISOString()
    }))
    .filter((workspace) => isMongoObjectId(workspace.id));

  if (!mapped.length) {
    clearCanonicalActiveWorkspace();
    return;
  }

  restoreActiveWorkspace(mapped);
}

function renderWorkspaces(workspaces) {
  workspaces = Array.isArray(workspaces) ? workspaces : normalizeApiList(workspaces, "workspaces");
  syncWorkspaceState(workspaces);

  const backendWorkspaces = workspaces.filter((workspace) =>
    isMongoObjectId(String(workspace._id || workspace.id || ""))
  );

  const list = document.getElementById("workspaceList");
  const select = document.getElementById("activeWorkspaceSelect");
  const approvalList = document.getElementById("masterCompanyApprovalList");

  let activeCount = 0;
  let rejectedCount = 0;

  if (list) list.innerHTML = "";
  if (approvalList) approvalList.innerHTML = "";
  if (select) select.innerHTML = `<option value="">Select Workspace</option>`;

  backendWorkspaces.forEach((workspace) => {
    const workspaceId = String(workspace._id || workspace.id || "");
    const workspaceName = workspaceDisplayName(workspace);
    const isApproved = (workspace.status || "Active") === "Active";
    const statusLabel = isApproved ? "Approved" : "Rejected";
    const statusClass = isApproved ? "status-approved" : "status-rejected";

    if (isApproved) activeCount++;
    if (!isApproved) rejectedCount++;

    if (select && isApproved) {
      const selected = getActiveWorkspaceId() === workspaceId ? "selected" : "";
      select.innerHTML += `
        <option value="${workspaceId}" ${selected}>
          ${workspaceName}
        </option>
      `;
    }

    const companyNameSafe = workspaceName.replace(/'/g, "\\'");

    const companyCard = `
      <div class="supplier-card">
        <h2 style="font-size:20px;font-weight:900;color:white;">
          ${workspaceName}
        </h2>

        <p class="muted">Business Type: ${workspace.businessType || workspace.type || "N/A"}</p>
        <p class="muted">Country: ${workspace.country || "N/A"}</p>
        <p class="muted">GST: ${workspace.gstNumber || "N/A"}</p>
        <p class="muted">IEC: ${workspace.iecCode || "N/A"}</p>
        <p class="muted">Industry: ${workspace.industry || "N/A"}</p>
        <p class="muted">Currency: ${workspace.defaultCurrency || "USD"}</p>

        <span class="status ${statusClass}">
          ${statusLabel}
        </span>

        <div class="approval-actions">
          <button class="approve-btn" onclick="approveWorkspace('${workspaceId}')">
            Approve
          </button>

          <button class="reject-btn" onclick="rejectWorkspace('${workspaceId}')">
            Reject
          </button>
        </div>

        <button class="mini-btn" onclick="activateWorkspace('${workspaceId}', '${companyNameSafe}')">
          Set Active Workspace
        </button>

        <button class="danger-btn" onclick="deleteWorkspace('${workspaceId}')">
          Delete Workspace
        </button>
      </div>
    `;

    if (list) list.innerHTML += companyCard;
    if (approvalList) approvalList.innerHTML += companyCard;
  });

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  };

  setText("workspaceCount", backendWorkspaces.length);
  setText("activeWorkspaceCount", activeCount);
  setText("dashboardWorkspaceCount", backendWorkspaces.length);
  setText("currentWorkspaceName", getActiveWorkspaceName());

  setText("masterTotalCompanies", backendWorkspaces.length);
  setText("masterApprovedCompanies", activeCount);
  setText("masterRejectedCompanies", rejectedCount);

  if (select && getActiveWorkspaceId()) {
    select.value = getActiveWorkspaceId();
  }

  if (getActiveWorkspaceName() !== "None") {
    const user = getUser();
    document.getElementById("workspaceName").innerText =
      `${getActiveWorkspaceName()} • ${user?.name || "User"} Workspace`;

    const adminActiveCompany = document.getElementById("adminActiveCompany");
    if (adminActiveCompany) adminActiveCompany.innerText = getActiveWorkspaceName();
  }

  if (window.TradeFlowWorkspaceEngineV1?.render) {
    setTimeout(() => window.TradeFlowWorkspaceEngineV1.render(), 0);
  }

  if (window.TradeFlowWorkspaceDataIsolationV2?.updateIsolationStatus) {
    window.TradeFlowWorkspaceDataIsolationV2.updateIsolationStatus();
  }
}

async function approveWorkspace(id) {
  await fetch(`${WORKSPACE_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status: "Active" })
  });

  createSystemNotification(
    "Company Approved",
    "A company workspace has been approved by admin.",
    "System",
    "Medium"
  );

  fetchWorkspaces();
}

async function rejectWorkspace(id) {
  await fetch(`${WORKSPACE_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status: "Inactive" })
  });

  createSystemNotification(
    "Company Rejected",
    "A company workspace has been rejected by admin.",
    "System",
    "High"
  );

  fetchWorkspaces();
}

function saveMasterProfile() {
  const companyName = document.getElementById("masterCompanyName").value || "TradeFlow Company";
  const ownerName = document.getElementById("masterOwnerName").value || "Admin";

  localStorage.setItem("tradeflowMasterCompany", companyName);
  localStorage.setItem("tradeflowMasterOwner", ownerName);

  const adminActiveCompany = document.getElementById("adminActiveCompany");
  const adminUserName = document.getElementById("adminUserName");

  if (adminActiveCompany) adminActiveCompany.innerText = companyName;
  if (adminUserName) adminUserName.innerText = ownerName;

  alert("Master admin profile saved.");
}

function saveSubscriptionSettings() {
  const plan = document.getElementById("subscriptionPlan").value;
  const status = document.getElementById("subscriptionStatus").value;

  localStorage.setItem("tradeflowSubscriptionPlan", plan);
  localStorage.setItem("tradeflowSubscriptionStatus", status);

  const planText = document.getElementById("subscriptionPlanText");
  const statusText = document.getElementById("subscriptionStatusText");
  const masterPlan = document.getElementById("masterSubscriptionPlan");

  if (planText) planText.innerText = plan;
  if (statusText) statusText.innerText = status;
  if (masterPlan) masterPlan.innerText = plan;

  alert("Subscription settings saved.");
}

function activateWorkspace(id, name) {
  const workspaceId = rememberActiveWorkspace(id, name);

  if (!workspaceId) {
    alert("This workspace is not connected to the backend. Create or select a saved workspace first.");
    return;
  }

  const select = document.getElementById("activeWorkspaceSelect");
  if (select) select.value = workspaceId;

  const currentWorkspaceName = document.getElementById("currentWorkspaceName");
  if (currentWorkspaceName) currentWorkspaceName.innerText = name;

  const user = getUser();
  document.getElementById("workspaceName").innerText =
    `${name} • ${user?.name || "User"} Workspace`;

  createSystemNotification(
    "Workspace Activated",
    `${name} is now active`,
    "System",
    "Low"
  );

  fetchSuppliers();
  fetchDeals();
  fetchEmployees();

  if (window.TradeFlowWorkspaceEngineV1?.render) {
    window.TradeFlowWorkspaceEngineV1.render();
  }

  if (window.TradeFlowMissionCenterUIV1?.render) {
    window.TradeFlowMissionCenterUIV1.render();
  }
}

async function addWorkspace() {
  const companyName = document.getElementById("workspaceCompanyName").value;
  const businessType = document.getElementById("workspaceBusinessType").value;
  const country = document.getElementById("workspaceCountry").value;
  const gstNumber = document.getElementById("workspaceGstNumber").value;
  const iecCode = document.getElementById("workspaceIecCode").value;
  const industry = document.getElementById("workspaceIndustry").value;
  const defaultCurrency = document.getElementById("workspaceCurrency").value;
  const status = document.getElementById("workspaceStatus").value;

  if (!companyName) {
    alert("Workspace company name is required.");
    return;
  }

  const res = await fetch(WORKSPACE_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      workspaceName: companyName,
      type: businessType || "Management",
      country,
      gstNumber,
      iecCode,
      industry,
      defaultCurrency,
      status: status === "Inactive" ? "Archived" : status
    })
  });

  if (res.status === 401) {
    logoutUser();
    return;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    alert(data.message || "Failed to create workspace.");
    return;
  }

  const workspace = data.workspace || data;
  const workspaceId = String(workspace._id || workspace.id || "");
  const workspaceName = workspaceDisplayName(workspace);

  document.getElementById("workspaceCompanyName").value = "";
  document.getElementById("workspaceCountry").value = "";
  document.getElementById("workspaceGstNumber").value = "";
  document.getElementById("workspaceIecCode").value = "";
  document.getElementById("workspaceIndustry").value = "";

  if (isMongoObjectId(workspaceId)) {
    setCanonicalActiveWorkspace({
      ...workspace,
      _id: workspaceId,
      id: workspaceId,
      name: workspaceName,
      workspaceName
    });
  }

  fetchWorkspaces();
}

async function deleteWorkspace(id) {
  const activeId = getActiveWorkspaceId();

  await fetch(`${WORKSPACE_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  if (activeId === id) {
    clearCanonicalActiveWorkspace();
  }

  fetchWorkspaces();
}

async function fetchNotifications(options = {}) {
  await waitForBootstrapForDataLoad(options);
  if (!hasWorkspaceForDataLoad(options)) return;
  if (requestLoading.notifications) return;

  requestLoading.notifications = true;

  try {
    const res = await fetch(NOTIFICATION_URL, {
      headers: getAuthHeaders()
    });

    if (res.status === 401) {
      logoutUser();
      return;
    }

    const notifications = await res.json();

    renderNotifications(notifications);
  } catch (error) {
    debugLog("Notifications backend not connected:", error.message);
  } finally {
    requestLoading.notifications = false;
  }
}

function renderNotifications(notifications) {
  const list = document.getElementById("notificationList");

  if (list) list.innerHTML = "";

  let unread = 0;
  let highPriority = 0;

  notifications.forEach((item) => {
    if (item.status === "Unread") unread++;
    if (item.priority === "High") highPriority++;

    if (list) {
      list.innerHTML += `
        <div class="supplier-card">
          <h2 style="font-size:20px;font-weight:900;color:white;">
            ${item.title}
          </h2>

          <p class="muted">Message: ${item.message}</p>
          <p class="muted">Type: ${item.type}</p>
          <p class="muted">Priority: ${item.priority}</p>
          <p class="muted">Status: ${item.status}</p>

          <span class="status">
            ${item.status} • ${item.priority}
          </span>

          <button class="mini-btn" onclick="markNotificationRead('${item._id}')">
            Mark as Read
          </button>

          <button class="danger-btn" onclick="deleteNotification('${item._id}')">
            Delete Notification
          </button>
        </div>
      `;
    }
  });

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  };

  setText("notificationCount", notifications.length);
  setText("unreadNotificationCount", unread);
  setText("highPriorityNotificationCount", highPriority);
  setText("dashboardUnreadNotifications", unread);

  const sidebarUnread = document.getElementById("sidebarUnreadCount");
  if (sidebarUnread) {
    sidebarUnread.innerText = unread > 0 ? `(${unread})` : "";
  }
}

async function addNotification() {
  const title = document.getElementById("notificationTitle").value;
  const message = document.getElementById("notificationMessage").value;
  const type = document.getElementById("notificationType").value;
  const priority = document.getElementById("notificationPriority").value;

  if (!title || !message) {
    alert("Notification title and message are required.");
    return;
  }

  const res = await fetch(NOTIFICATION_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title,
      message,
      type,
      priority,
      status: "Unread"
    })
  });

  if (res.status === 401) {
    logoutUser();
    return;
  }

  document.getElementById("notificationTitle").value = "";
  document.getElementById("notificationMessage").value = "";
  document.getElementById("notificationType").value = "General";
  document.getElementById("notificationPriority").value = "Medium";

  fetchNotifications();
}

async function markNotificationRead(id) {
  await fetch(`${NOTIFICATION_URL}/${id}/read`, {
    method: "PUT",
    headers: getAuthHeaders()
  });

  fetchNotifications();
}

async function deleteNotification(id) {
  await fetch(`${NOTIFICATION_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  fetchNotifications();
}

async function createSystemNotification(title, message, type = "System", priority = "Medium") {
  try {
    await fetch(NOTIFICATION_URL, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        title,
        message,
        type,
        priority,
        status: "Unread"
      })
    });

    fetchNotifications();
  } catch (error) {
    debugLog("Auto notification skipped:", error.message);
  }
}

async function fetchSuppliers(options = {}) {
  await waitForBootstrapForDataLoad(options);
  if (!hasWorkspaceForDataLoad(options)) return;
  if (requestLoading.suppliers) return;

  requestLoading.suppliers = true;

  try {
    const res = await fetch(API_URL, {
      headers: getAuthHeaders()
    });

    if (res.status === 401) {
      logoutUser();
      return;
    }

    const data = await res.json().catch(() => ([]));

    if (!res.ok || data.success === false) {
      throw new Error(data.message || "Supplier request failed.");
    }

    const suppliers = normalizeApiList(data, "suppliers");

    document.getElementById("supplierCount").innerText = suppliers.length;

    const supplierList = document.getElementById("supplierList");

    if (!supplierList) return;

    supplierList.innerHTML = "";

    if (suppliers.length === 0) {
      supplierList.innerHTML =
        `<p class="muted">No suppliers yet. Add your first supplier lead.</p>`;
      return;
    }

    suppliers.forEach((supplier) => {
      supplierList.innerHTML += `
        <div class="supplier-card">
          <h2 style="font-size:20px;font-weight:900;color:white;">
            ${supplier.supplierName}
          </h2>

          <p class="muted">Product: ${supplier.product}</p>
          <p class="muted">Country: ${supplier.country}</p>
          <p class="muted">Email: ${supplier.email}</p>
          <p class="muted">Phone: ${supplier.phone}</p>
          <p class="muted">Source: ${supplier.source || "Manual Entry"}</p>
          <p class="muted">Notes: ${supplier.notes || "No notes"}</p>

          <span class="status">
            Score ${supplier.score || 75} • ${supplier.status || "Verified Lead"}
          </span>

          <br/>

          <button class="danger-btn" onclick="deleteSupplier('${supplier._id}')">
            Delete
          </button>
        </div>
      `;
    });

  } catch (error) {
    console.warn("API request failed but session preserved:", error.message);
  } finally {
    requestLoading.suppliers = false;
  }
}

async function addSupplier() {
  const supplierName = document.getElementById("supplierName").value;
  const product = document.getElementById("product").value;
  const country = document.getElementById("country").value;
  const email = document.getElementById("email").value;
  const phone = document.getElementById("phone").value;
  const notes = document.getElementById("notes").value;

  if (!supplierName || !product || !country || !email || !phone) {
    alert("Please fill all supplier fields.");
    return;
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      supplierName,
      product,
      country,
      email,
      phone,
      notes,
      source: "Manual Entry",
      score: 75,
      status: "Verified Lead"
    })
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    logoutUser();
    return;
  }

  if (!res.ok || data.success === false) {
    alert(data.message || "Failed to save supplier.");
    return;
  }

  document.getElementById("supplierName").value = "";
  document.getElementById("product").value = "";
  document.getElementById("country").value = "";
  document.getElementById("email").value = "";
  document.getElementById("phone").value = "";
  document.getElementById("notes").value = "";

  fetchSuppliers();
}

async function deleteSupplier(id) {
  await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  fetchSuppliers();
}

async function fetchDeals(options = {}) {
  await waitForBootstrapForDataLoad(options);
  if (!hasWorkspaceForDataLoad(options)) return;
  if (requestLoading.deals) return;

  requestLoading.deals = true;

  try {
    const res = await fetch(DEAL_URL, {
      headers: getAuthHeaders()
    });

    if (res.status === 401) {
      logoutUser();
      return;
    }

    const data = await res.json().catch(() => ([]));

    if (!res.ok || data.success === false) {
      throw new Error(data.message || "CRM request failed.");
    }

    const deals = normalizeApiList(data, "deals");

    renderDeals(deals);
  } catch (error) {
    debugLog("CRM backend not connected:", error.message);
  } finally {
    requestLoading.deals = false;
  }
}

function renderDeals(deals) {
  const stageContainers = {
    "New Lead": document.getElementById("newLeadDeals"),
    "Contacted": document.getElementById("contactedDeals"),
    "Negotiation": document.getElementById("negotiationDeals"),
    "Closed": document.getElementById("closedDeals"),
    "Lost": document.getElementById("lostDeals")
  };

  Object.values(stageContainers).forEach((container) => {
    if (container) container.innerHTML = "";
  });

  let closedCount = 0;
  let pipelineValue = 0;

  deals.forEach((deal) => {
    pipelineValue += Number(deal.value || 0);

    if (deal.stage === "Closed") {
      closedCount++;
    }

    const html = `
      <div class="deal" draggable="true" ondragstart="dragDeal(event)" data-deal-id="${deal._id}">
        <b>${deal.companyName}</b>
        <p class="muted">Product: ${deal.product}</p>
        <p class="muted">Country: ${deal.country || "N/A"}</p>
        <p class="muted">Value: ${deal.value || 0}</p>
        <p class="muted">Priority: ${deal.priority || "Medium"}</p>
        <p class="muted">Contact: ${deal.contactPerson || "N/A"}</p>

        <select onchange="updateDealStage('${deal._id}', this.value)">
          <option ${deal.stage === "New Lead" ? "selected" : ""}>New Lead</option>
          <option ${deal.stage === "Contacted" ? "selected" : ""}>Contacted</option>
          <option ${deal.stage === "Negotiation" ? "selected" : ""}>Negotiation</option>
          <option ${deal.stage === "Closed" ? "selected" : ""}>Closed</option>
          <option ${deal.stage === "Lost" ? "selected" : ""}>Lost</option>
        </select>

        <button class="danger-btn" onclick="deleteDeal('${deal._id}')">
          Delete
        </button>
      </div>
    `;

    if (stageContainers[deal.stage]) {
      stageContainers[deal.stage].innerHTML += html;
    }
  });

  const dealCountEl = document.getElementById("dealCount");
  const closedDealCountEl = document.getElementById("closedDealCount");
  const pipelineValueEl = document.getElementById("pipelineValue");

  if (dealCountEl) dealCountEl.innerText = deals.length;
  if (closedDealCountEl) closedDealCountEl.innerText = closedCount;
  if (pipelineValueEl) pipelineValueEl.innerText = pipelineValue;

  const dashboardDealCount = document.getElementById("dashboardDealCount");
  const dashboardPipelineValue = document.getElementById("dashboardPipelineValue");
  const dashboardClosedDeals = document.getElementById("dashboardClosedDeals");

  if (dashboardDealCount) dashboardDealCount.innerText = deals.length;
  if (dashboardPipelineValue) dashboardPipelineValue.innerText = pipelineValue;
  if (dashboardClosedDeals) dashboardClosedDeals.innerText = closedCount;
}

function dragDeal(event) {
  event.dataTransfer.setData("dealId", event.currentTarget.dataset.dealId);
}

function allowDealDrop(event) {
  event.preventDefault();
}

function highlightDropZone(event) {
  event.preventDefault();
  const column = event.currentTarget;
  column.classList.add("drag-over");
}

function removeDropHighlight(event) {
  const column = event.currentTarget;
  column.classList.remove("drag-over");
}

async function dropDeal(event) {
  event.preventDefault();

  const column = event.currentTarget;
  column.classList.remove("drag-over");

  const dealId = event.dataTransfer.getData("dealId");
  const newStage = column.dataset.stage;

  if (!dealId || !newStage) return;

  await updateDealStage(dealId, newStage);
}

async function addDeal() {
  const companyName = document.getElementById("dealCompanyName").value;
  const contactPerson = document.getElementById("dealContactPerson").value;
  const email = document.getElementById("dealEmail").value;
  const phone = document.getElementById("dealPhone").value;
  const product = document.getElementById("dealProduct").value;
  const country = document.getElementById("dealCountry").value;
  const value = document.getElementById("dealValue").value;
  const stage = document.getElementById("dealStage").value;
  const priority = document.getElementById("dealPriority").value;
  const notes = document.getElementById("dealNotes").value;

  if (!companyName || !product) {
    alert("Company name and product are required.");
    return;
  }

  const res = await fetch(DEAL_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      companyName,
      contactPerson,
      email,
      phone,
      product,
      country,
      value,
      stage,
      priority,
      notes
    })
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    logoutUser();
    return;
  }

  if (!res.ok || data.success === false) {
    alert(data.message || "Failed to save CRM deal.");
    return;
  }

  document.getElementById("dealCompanyName").value = "";
  document.getElementById("dealContactPerson").value = "";
  document.getElementById("dealEmail").value = "";
  document.getElementById("dealPhone").value = "";
  document.getElementById("dealProduct").value = "";
  document.getElementById("dealCountry").value = "";
  document.getElementById("dealValue").value = "";
  document.getElementById("dealNotes").value = "";

  fetchDeals();
  createSystemNotification("New CRM Deal", `Deal saved for ${companyName}`, "CRM", "Medium");
}

async function updateDealStage(id, stage) {
  await fetch(`${DEAL_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ stage })
  });

  fetchDeals();
}

async function deleteDeal(id) {
  await fetch(`${DEAL_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  fetchDeals();
}

async function findAISuppliers() {
  const product = document.getElementById("aiProduct").value;
  const country = document.getElementById("aiCountry").value;

  if (!product || !country) {
    alert("Enter product and country");
    return;
  }

  const res = await fetch(`${AI_URL}/find-suppliers`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      product,
      country
    })
  });

  if (res.status === 401) {
    logoutUser();
    return;
  }

  const leads = await res.json();

  const results = document.getElementById("aiSupplierResults");

  results.innerHTML = "";

  if (!Array.isArray(leads) || leads.length === 0) {
    results.innerHTML = `<p class="muted">No AI leads found.</p>`;
    return;
  }

  leads.forEach((lead) => {
    const encodedLead = encodeURIComponent(JSON.stringify(lead));

    results.innerHTML += `
      <div class="supplier-card">
        <h2 style="font-size:20px;font-weight:900;color:white;">
          ${lead.supplierName}
        </h2>

        <p class="muted">Product: ${lead.product}</p>
        <p class="muted">Country: ${lead.country}</p>
        <p class="muted">Email: ${lead.email}</p>
        <p class="muted">Phone: ${lead.phone}</p>
        <p class="muted">Source: ${lead.source}</p>
        <p class="muted">Notes: ${lead.notes}</p>

        <span class="status">
          Score ${lead.score} • ${lead.status}
        </span>

        <button class="btn" onclick="saveAISupplier('${encodedLead}')">
          Save to Workspace
        </button>
      </div>
    `;
  });
}

async function saveAISupplier(encodedLead) {
  const lead = JSON.parse(decodeURIComponent(encodedLead));

  const res = await fetch(`${AI_URL}/save-supplier`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(lead)
  });

  if (res.status === 401) {
    logoutUser();
    return;
  }

  alert("AI Supplier Saved to Workspace");

  fetchSuppliers();
  showPage("suppliers");
}


function generateAIEmail() {
  const product = document.getElementById("aiEmailProduct").value || "your product";
  const receiver = document.getElementById("aiEmailReceiver").value || "business partner";

  document.getElementById("aiEmailOutput").value =
`Subject: Business Opportunity for ${product}

Hello,

I hope you are doing well.

We are reaching out regarding a potential export/import opportunity for ${product}. We would like to understand your requirements, pricing expectations, quantity, documentation needs, and preferred timelines.

Please share the relevant details so we can proceed with a professional quotation and next steps.

Regards,
TradeFlow Team`;
}

function copyAIEmailToSender() {
  const text = document.getElementById("aiEmailOutput").value;

  if (!text) {
    alert("Generate AI email first.");
    return;
  }

  showPage("outreach");

  document.getElementById("emailSubject").value = "Business Opportunity from TradeFlow";
  document.getElementById("emailMessage").value = text;
}

function generateOutreach() {
  const product = document.getElementById("aiOutreachProduct").value || "your product";
  const buyer = document.getElementById("aiOutreachBuyer").value || "potential buyer";

  document.getElementById("aiOutreachOutput").value =
`Subject: Business Opportunity for ${product}

Hello,

I hope you are doing well.

We are exploring serious export/import opportunities for ${product} and would like to connect with your team regarding pricing, availability, MOQ, packaging, and delivery timelines.

Please share your latest catalogue, quotation, certifications, and export terms.

Regards,
TradeFlow Team`;
}

function generateNegotiationAdvice() {
  const quoted = document.getElementById("aiQuotedPrice").value || "quoted price";
  const target = document.getElementById("aiTargetPrice").value || "target price";

  document.getElementById("aiNegotiationOutput").value =
`Negotiation Strategy:

Quoted Price: ${quoted}
Target Price: ${target}

1. Do not reject the quote directly.
2. Ask for bulk order discount.
3. Request better payment terms.
4. Compare logistics and packaging cost.
5. Offer long-term repeat business as leverage.
6. Try closing slightly above target if quality and delivery are strong.`;
}

function generateDocumentHelp() {
  const product = document.getElementById("aiDocProduct").value || "selected product";
  const country = document.getElementById("aiDocCountry").value || "destination country";

  document.getElementById("aiDocOutput").value =
`Export Document Checklist for ${product} to ${country}:

1. Commercial Invoice
2. Packing List
3. Proforma Invoice
4. Purchase Order
5. Certificate of Origin
6. Shipping Bill
7. Bill of Lading / Airway Bill
8. Insurance Certificate
9. Product-specific compliance certificates
10. Buyer and supplier contract copy`;
}

function generateCrmAdvice() {
  const stage = document.getElementById("aiDealStage").value || "current stage";
  const value = document.getElementById("aiDealValue").value || "deal value";

  document.getElementById("aiCrmOutput").value =
`CRM Deal Advice:

Stage: ${stage}
Deal Value: ${value}

1. Mark this deal priority based on value and buyer response.
2. Schedule next follow-up within 24 hours.
3. Prepare pricing comparison before negotiation.
4. Keep supplier documents ready.
5. Move deal forward only after buyer confirms quantity and payment terms.`;
}

function generateTaskPlan() {
  const goal = document.getElementById("aiTaskGoal").value || "business goal";

  document.getElementById("aiTaskOutput").value =
`AI Task Plan for: ${goal}

Today:
1. Identify top 5 relevant leads.
2. Send first outreach message.
3. Save replies inside CRM.

Tomorrow:
1. Follow up with non-responders.
2. Compare quotes.
3. Shortlist best suppliers.

This Week:
1. Negotiate pricing.
2. Prepare documents.
3. Move qualified deals to pipeline.`;
}


async function generateInvoicePDF() {
  const companyName = document.getElementById("pdfCompanyName").value;
  const buyerName = document.getElementById("pdfBuyerName").value;
  const product = document.getElementById("pdfProduct").value;
  const quantity = document.getElementById("pdfQuantity").value;
  const price = document.getElementById("pdfPrice").value;
  const country = document.getElementById("pdfCountry").value;
  const notes = document.getElementById("pdfNotes").value;

  if (!companyName || !buyerName || !product) {
    alert("Company name, buyer name, and product are required.");
    return;
  }

  const res = await fetch(`${PDF_URL}/invoice`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      companyName,
      buyerName,
      product,
      quantity,
      price,
      country,
      notes
    })
  });

  if (res.status === 401) {
    logoutUser();
    return;
  }

  if (!res.ok) {
    alert("PDF generation failed. Check backend server.");
    return;
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "tradeflow-invoice.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}


async function fetchAnalytics(options = {}) {
  await waitForBootstrapForDataLoad(options);
  if (!hasWorkspaceForDataLoad(options)) return;
  if (requestLoading.analytics) return;

  requestLoading.analytics = true;

  try {
    bootstrapDebug("analytics load");

    const res = await fetch(ANALYTICS_URL, {
      headers: getAuthHeaders()
    });

    if (res.status === 401) {
      logoutUser();
      return;
    }

    const data = await res.json();

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.innerText = value;
    };

    setText("analyticsTotalSuppliers", data.totalSuppliers || 0);
    setText("analyticsTotalDeals", data.totalDeals || 0);
    setText("analyticsTotalTasks", data.totalTasks || 0);
    setText("analyticsPipelineValue", data.pipelineValue || 0);
    setText("analyticsClosedValue", data.closedValue || 0);
    setText("analyticsConversionRate", `${data.conversionRate || 0}%`);
    setText("analyticsTaskCompletionRate", `${data.taskCompletionRate || 0}%`);
    setText("analyticsAverageSupplierScore", data.averageSupplierScore || 0);
    setText("analyticsPendingTasks", data.pendingTasks || 0);
    setText("analyticsCompletedTasks", data.completedTasks || 0);

    setText("analyticsNewLead", data.dealStages?.newLead || 0);
    setText("analyticsContacted", data.dealStages?.contacted || 0);
    setText("analyticsNegotiation", data.dealStages?.negotiation || 0);
    setText("analyticsClosed", data.dealStages?.closed || 0);
    setText("analyticsLost", data.dealStages?.lost || 0);

    setText("dashboardDealCount", data.totalDeals || 0);
    setText("dashboardPipelineValue", data.pipelineValue || 0);
    setText("dashboardClosedDeals", data.closedDeals || 0);
  } catch (error) {
    debugLog("Analytics backend not connected:", error.message);
  } finally {
    requestLoading.analytics = false;
  }
}



function generateEmailMessage() {
  const product = document.getElementById("outreachProduct")?.value || document.getElementById("waAiProduct")?.value || "your product";
  const buyer = document.getElementById("waAiBuyer")?.value || "your company";

  document.getElementById("emailSubject").value =
    `Business Opportunity for ${product}`;

  document.getElementById("emailMessage").value =
`Hello,

I hope you are doing well.

We are exploring serious export/import business opportunities regarding ${product}. We would like to discuss pricing, MOQ, availability, packaging details, certifications, and delivery timelines.

Please share your latest catalogue, quotation, payment terms, and export terms.

We are looking for a reliable long-term business relationship.

Regards,
${buyer}`;
}

function useEmailTemplate(type) {
  if (type === "supplier") {
    document.getElementById("emailSubject").value =
      "Supplier Inquiry for Export / Import Business";

    document.getElementById("emailMessage").value =
`Hello,

We are interested in sourcing products from your company for export/import business.

Please share:
1. Product catalogue
2. MOQ
3. Best pricing
4. Certifications
5. Packaging details
6. Delivery timeline
7. Payment terms

Looking forward to your response.

Regards,
TradeFlow Team`;
  }

  if (type === "buyer") {
    document.getElementById("emailSubject").value =
      "Export Supply Proposal";

    document.getElementById("emailMessage").value =
`Hello,

We can support your import requirements with reliable sourcing, supplier coordination, documentation, and export/import operations.

Please let us know your product requirement, quantity, destination country, and preferred delivery timeline.

Regards,
TradeFlow Team`;
  }

  if (type === "followup") {
    document.getElementById("emailSubject").value =
      "Follow-up Regarding Business Opportunity";

    document.getElementById("emailMessage").value =
`Hello,

This is a quick follow-up regarding our previous discussion.

Please confirm if you are available to proceed with pricing, product details, and next steps.

Looking forward to your response.

Regards,
TradeFlow Team`;
  }
}

async function sendTradeFlowEmail() {
  const to = document.getElementById("emailTo").value;
  const subject = document.getElementById("emailSubject").value;
  const message = document.getElementById("emailMessage").value;

  if (!to || !subject || !message) {
    alert("Recipient email, subject, and message are required.");
    return;
  }

  const res = await fetch(`${EMAIL_URL}/send`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      to,
      subject,
      message
    })
  });

  if (res.status === 401) {
    logoutUser();
    return;
  }

  const data = await res.json();

  if (!res.ok) {
    alert(data.message || "Email sending failed. Check EMAIL_USER and EMAIL_PASS in .env");
    return;
  }

  alert("Email sent successfully from TradeFlow.");
  createSystemNotification("Email Sent", `Email sent to ${to}`, "Outreach", "Medium");
}

async function fetchOutreachRecords() {
  try {
    const res = await fetch(OUTREACH_URL, {
      headers: getAuthHeaders()
    });

    if (res.status === 401) {
      logoutUser();
      return;
    }

    const records = await res.json();

    renderOutreachRecords(records);
  } catch (error) {
    debugLog("Outreach backend not connected:", error.message);
  }
}

function renderOutreachRecords(records) {
  const list = document.getElementById("outreachList");

  if (!list) return;

  list.innerHTML = "";

  let followups = 0;
  let converted = 0;

  records.forEach((record) => {
    if (record.status === "Follow-up Needed") followups++;
    if (record.status === "Converted") converted++;

    const safePhone = (record.phone || "").replace(/\D/g, "");
    const encodedMessage = encodeURIComponent(record.message || "");

    list.innerHTML += `
      <div class="supplier-card">
        <h2 style="font-size:20px;font-weight:900;color:white;">
          ${record.contactName}
        </h2>

        <p class="muted">Phone: ${record.phone}</p>
        <p class="muted">Product: ${record.product || "N/A"}</p>
        <p class="muted">Channel: ${record.channel || "WhatsApp"}</p>
        <p class="muted">Message: ${record.message}</p>
        <p class="muted">Notes: ${record.notes || "No notes"}</p>

        <span class="status">
          ${record.status || "Draft"}
        </span>

        <select onchange="updateOutreachStatus('${record._id}', this.value)">
          <option ${record.status === "Draft" ? "selected" : ""}>Draft</option>
          <option ${record.status === "Opened" ? "selected" : ""}>Opened</option>
          <option ${record.status === "Follow-up Needed" ? "selected" : ""}>Follow-up Needed</option>
          <option ${record.status === "Converted" ? "selected" : ""}>Converted</option>
          <option ${record.status === "Closed" ? "selected" : ""}>Closed</option>
        </select>

        <button class="mini-btn" onclick="window.open('https://wa.me/${safePhone}?text=${encodedMessage}', '_blank')">
          Open WhatsApp
        </button>

        <button class="danger-btn" onclick="deleteOutreachRecord('${record._id}')">
          Delete
        </button>
      </div>
    `;
  });

  const outreachCount = document.getElementById("outreachCount");
  const outreachFollowupCount = document.getElementById("outreachFollowupCount");
  const outreachConvertedCount = document.getElementById("outreachConvertedCount");

  if (outreachCount) outreachCount.innerText = records.length;
  if (outreachFollowupCount) outreachFollowupCount.innerText = followups;
  if (outreachConvertedCount) outreachConvertedCount.innerText = converted;
}

function generateWhatsAppMessage() {
  const product = document.getElementById("waAiProduct").value || "your product";
  const buyer = document.getElementById("waAiBuyer").value || "your company";

  const message =
`Hello,

I hope you are doing well.

We are interested in discussing export/import business opportunities regarding ${product}. Please share your latest pricing, MOQ, availability, packaging details, certifications, and delivery timeline.

We are looking for a serious long-term business relationship.

Regards,
${buyer}`;

  document.getElementById("outreachProduct").value = product;
  document.getElementById("outreachMessage").value = message;
}

async function saveOutreachRecord() {
  const contactName = document.getElementById("outreachContactName").value;
  const phone = document.getElementById("outreachPhone").value;
  const product = document.getElementById("outreachProduct").value;
  const message = document.getElementById("outreachMessage").value;
  const status = document.getElementById("outreachStatus").value;
  const notes = document.getElementById("outreachNotes").value;

  if (!contactName || !phone || !message) {
    alert("Contact name, phone, and message are required.");
    return null;
  }

  const res = await fetch(OUTREACH_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      contactName,
      phone,
      product,
      message,
      channel: "WhatsApp",
      status,
      notes
    })
  });

  if (res.status === 401) {
    logoutUser();
    return null;
  }

  const record = await res.json();

  fetchOutreachRecords();
fetchEmployees();

  return record;
}

async function saveAndOpenWhatsApp() {
  const record = await saveOutreachRecord();

  if (!record) return;

  const phone = (record.phone || "").replace(/\D/g, "");
  const message = encodeURIComponent(record.message || "");

  await updateOutreachStatus(record._id, "Opened", false);

  window.open(`https://wa.me/${phone}?text=${message}`, "_blank");

  fetchOutreachRecords();
fetchEmployees();
}

async function updateOutreachStatus(id, status, refresh = true) {
  await fetch(`${OUTREACH_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });

  if (refresh) fetchOutreachRecords();
fetchEmployees();
}

async function deleteOutreachRecord(id) {
  await fetch(`${OUTREACH_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  fetchOutreachRecords();
fetchEmployees();
}

function sendEmail() {
  const email = document.getElementById("outreachEmail").value;
  const message = document.getElementById("outreachMessage").value;

  if (!email) {
    alert("Enter supplier email.");
    return;
  }

  window.location.href =
    `mailto:${email}?subject=Business Opportunity from TradeFlow&body=${encodeURIComponent(message)}`;
}

function openWhatsApp() {
  const phone = document.getElementById("outreachPhone").value;
  const message = document.getElementById("outreachMessage").value;

  if (!phone) {
    alert("Enter WhatsApp number with country code.");
    return;
  }

  window.open(
    `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
    "_blank"
  );
}


async function fetchTasks() {
  try {
    const res = await fetch(TASK_URL, {
      headers: getAuthHeaders()
    });

    if (res.status === 401) {
      logoutUser();
      return;
    }

    const tasks = await res.json();

    renderTasks(tasks);
  } catch (error) {
    debugLog("Task backend not connected:", error.message);
  }
}

function renderTasks(tasks) {
  const taskList = document.getElementById("taskList");

  if (taskList) {
    taskList.innerHTML = "";
  }

  let completed = 0;
  let pending = 0;

  tasks.forEach((task) => {
    if (task.status === "Completed") {
      completed++;
    } else {
      pending++;
    }

    const html = `
      <div class="supplier-card">
        <h2 style="font-size:20px;font-weight:900;color:white;">
          ${task.title}
        </h2>

        <p class="muted">Related To: ${task.relatedTo || "N/A"}</p>
        <p class="muted">Due Date: ${task.dueDate || "N/A"}</p>
        <p class="muted">Priority: ${task.priority || "Medium"}</p>
        <p class="muted">Status: ${task.status || "Pending"}</p>
        <p class="muted">Notes: ${task.notes || "No Notes"}</p>

        <select onchange="updateTaskStatus('${task._id}', this.value)">
          <option ${task.status === "Pending" ? "selected" : ""}>Pending</option>
          <option ${task.status === "In Progress" ? "selected" : ""}>In Progress</option>
          <option ${task.status === "Completed" ? "selected" : ""}>Completed</option>
        </select>

        <button class="danger-btn" onclick="deleteTask('${task._id}')">
          Delete
        </button>
      </div>
    `;

    if (taskList) {
      taskList.innerHTML += html;
    }
  });

  const taskCount = document.getElementById("taskCount");
  const completedTaskCount = document.getElementById("completedTaskCount");
  const pendingTaskCount = document.getElementById("pendingTaskCount");

  if (taskCount) taskCount.innerText = tasks.length;
  if (completedTaskCount) completedTaskCount.innerText = completed;
  if (pendingTaskCount) pendingTaskCount.innerText = pending;
}

async function addTask() {
  const title = document.getElementById("taskTitle").value;
  const relatedTo = document.getElementById("taskRelatedTo").value;
  const dueDate = document.getElementById("taskDueDate").value;
  const priority = document.getElementById("taskPriority").value;
  const status = document.getElementById("taskStatus").value;
  const notes = document.getElementById("taskNotes").value;

  if (!title) {
    alert("Task title required");
    return;
  }

  await fetch(TASK_URL, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      title,
      relatedTo,
      dueDate,
      priority,
      status,
      notes
    })
  });

  document.getElementById("taskTitle").value = "";
  document.getElementById("taskRelatedTo").value = "";
  document.getElementById("taskDueDate").value = "";
  document.getElementById("taskNotes").value = "";

  fetchTasks();
}

async function updateTaskStatus(id, status) {
  await fetch(`${TASK_URL}/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status })
  });

  fetchTasks();
}

async function deleteTask(id) {
  await fetch(`${TASK_URL}/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  fetchTasks();
}

function contactSupport() {
  const user = getUser();
  const subject = encodeURIComponent("TradeFlow Support Query");
  const body = encodeURIComponent(
    `Hello TradeFlow Support,\n\nI need help regarding my TradeFlow company workspace.\n\nCompany: ${user?.companyName || ""}\nUser: ${user?.name || ""}\nEmail: ${user?.email || ""}\n\nQuery / Issue:\n`
  );

  window.location.href = `mailto:ks2353013@gmail.com?subject=${subject}&body=${body}`;
}

function startDashboardPolling() {
  if (dashboardPollingStarted) return;

  dashboardPollingStarted = true;
  bootstrapDebug("dashboard polling started");

  setTimeout(() => safeRun(fetchSuppliers), 150);
  setTimeout(() => safeRun(fetchDeals), 300);
  setTimeout(() => safeRun(fetchAnalytics), 450);
  setTimeout(() => safeRun(fetchNotifications), 600);
}

function bootTradeFlow() {
  if (!appReady) return;

  // Smooth first load: dashboard first, then background summaries.
  showPage("dashboard");
}

async function loadUser() {
  if (!protectDashboard()) {
    throw new Error("Authenticated user could not be loaded");
  }

  updateBootstrapState({
    step: "loadUser",
    userLoaded: true
  });

  return getUser();
}

async function loadCompany() {
  updateBootstrapState({
    step: "loadCompany",
    companyLoaded: true
  });

  return getActiveCompanyId();
}

async function loadWorkspacesForBootstrap() {
  updateBootstrapState({ step: "loadWorkspaces" });
  bootstrapDebug("workspace load");
  const workspaces = await withTimeout(
    fetchWorkspaces({ duringBootstrap: true }),
    12000,
    "Timed out loading workspaces"
  );

  updateBootstrapState({
    workspacesLoaded: true
  });

  return Array.isArray(workspaces) ? workspaces : [];
}

function restoreWorkspaceForBootstrap(workspaces) {
  updateBootstrapState({ step: "restoreWorkspace" });
  const workspaceId = restoreActiveWorkspace(workspaces);
  bootstrapDebug(`workspace restored ${workspaceId || "none"}`);
  return workspaceId;
}

function verifyWorkspaceForBootstrap() {
  updateBootstrapState({ step: "verifyWorkspace" });
  const workspaceId = window.TradeFlowWorkspace.getActiveWorkspaceId();
  const workspaceVerified = Boolean(workspaceId);

  if (!workspaceVerified) {
    updateWorkspaceState({
      workspaceId: "",
      workspaceName: "",
      companyId: getActiveCompanyId(),
      loaded: true
    });
  }

  updateBootstrapState({
    workspaceVerified
  });

  return workspaceVerified;
}

function initializeModules() {
  updateBootstrapState({ step: "initializeModules" });
  bootTradeFlow();
  updateBootstrapState({
    modulesInitialized: true
  });
}

async function bootstrap() {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    updateBootstrapState({
      status: "running",
      step: "restoreSession",
      completed: false,
      error: ""
    });

    const restored = await withTimeout(
      restoreTradeFlowAppSession(),
      12000,
      "Timed out restoring session"
    );

    if (!restored) {
      throw new Error("Session restore failed");
    }

    updateBootstrapState({
      sessionRestored: true
    });

    await loadUser();
    document.dispatchEvent(
      new CustomEvent("tradeflow:session-ready", {
        detail: { user: getUser() }
      })
    );

    await loadCompany();
    const workspaces = await loadWorkspacesForBootstrap();
    restoreWorkspaceForBootstrap(workspaces);
    verifyWorkspaceForBootstrap();
    initializeModules();

    updateBootstrapState({
      status: "ready",
      step: "complete",
      completed: true
    });

    document.dispatchEvent(
      new CustomEvent("tradeflow:bootstrap-complete", {
        detail: getBootstrapStateSnapshot()
      })
    );

    return getBootstrapStateSnapshot();
  })().catch((error) => {
    updateBootstrapState({
      status: "error",
      step: "error",
      completed: true,
      error: error.message
    });

    if (error.message === "Session restore failed") {
      const lastAuthStatus =
        window.TradeFlowSessionManager?.getLastAuthStatus?.() || 0;

      if (!getStoredToken()) {
        redirectToLogin("no token exists on app boot");
      } else if (isConfirmedAuthFailureStatus(lastAuthStatus)) {
        redirectToLogin(`confirmed auth ${lastAuthStatus}`);
      } else {
        logAuthDebug(
          "redirect reason",
          `not redirecting: ${error.message}; auth status ${lastAuthStatus || "pending/transient"}`
        );
      }
    }

    return getBootstrapStateSnapshot();
  });

  return bootstrapPromise;
}

function bootTradeFlowApp() {
  return bootstrap();
}

function getInvalidWorkspaceKeysFound() {
  const keys = [
    "tradeflowActiveWorkspace",
    "tradeflowActiveWorkspaceId",
    "tradeflowActiveWorkspaceV1",
    "activeWorkspace",
    "activeWorkspaceId",
    "workspaceId"
  ];

  return keys.filter((key) => {
    const value = localStorage.getItem(key);
    return value && !isMongoObjectId(value);
  });
}

window.tradeflowSmokeStatus = function () {
  const activeWorkspace = getCanonicalActiveWorkspaceObject();
  const selector = document.getElementById("activeWorkspaceSelect");
  const headerWorkspace = document.getElementById("workspaceName");

  return {
    tokenPresent: Boolean(getStoredToken()),
    userPresent: Boolean(getUser()),
    companyId: getActiveCompanyId(),
    activeWorkspaceId: window.TradeFlowWorkspace.getActiveWorkspaceId(),
    activeWorkspaceName:
      workspaceState.workspaceName ||
      activeWorkspace?.workspaceName ||
      activeWorkspace?.name ||
      "",
    selectorValue: selector?.value || "",
    headerWorkspaceName: headerWorkspace?.innerText || "",
    missionCenterReady: Boolean(window.TradeFlowMissionCenterReady),
    invalidWorkspaceKeysFound: getInvalidWorkspaceKeysFound(),
    apiBaseUrl: BACKEND_URL,
    bootstrap: getBootstrapStateSnapshot()
  };
};

window.TradeFlowBootstrap = {
  state: bootstrapState,
  bootstrap,
  whenReady: waitForBootstrap,
  getState: getBootstrapStateSnapshot
};

bootTradeFlowApp();


/* =========================================================
   TRADEFLOW AI OPERATING SYSTEM UPGRADE
   Full replacement-safe block. Keep this at the end of app.js.
   This creates a fake AI business engine now and can later be
   connected to OpenAI / supplier APIs without changing the UI.
========================================================= */

function setTradeFlowAIConsole(text) {
  const box = document.getElementById("tradeflowAiConsole");
  if (box) box.value = text.trim();
}

function getAIField(id, fallback) {
  const el = document.getElementById(id);
  return el && el.value.trim() ? el.value.trim() : fallback;
}

function tradeFlowQuickAI(type) {
  const product = getAIField("aiProduct", "export product");
  const country = getAIField("aiCountry", "target country");

  const outputs = {
    supplier: `🌍 TRADEFLOW AI SUPPLIER STRATEGY\n\nProduct: ${product}\nTarget Market: ${country}\n\nBest sourcing approach:\n1. Shortlist 10 suppliers with export history.\n2. Check GST/IEC/company registration where applicable.\n3. Ask for MOQ, packaging, certifications, lead time, and port of shipment.\n4. Compare price, reliability, communication speed, and document readiness.\n5. Move only verified suppliers into CRM.\n\nRisk signals:\n• No company email\n• No export documents\n• Very low pricing\n• Unclear payment terms\n\nRecommended next step:\nSend professional inquiry + request catalogue and quotation.`,

    email: `📧 TRADEFLOW AI EXPORT EMAIL\n\nSubject: Export Business Inquiry for ${product}\n\nHello,\n\nI hope you are doing well.\n\nWe are exploring a serious export/import opportunity for ${product} in ${country}. Please share your latest catalogue, MOQ, pricing, packaging details, certifications, payment terms, and delivery timeline.\n\nIf the pricing and documentation are suitable, we can move ahead with a formal quotation discussion.\n\nRegards,\nTradeFlow Workspace`,

    whatsapp: `📱 TRADEFLOW AI WHATSAPP MESSAGE\n\nHello,\nWe are interested in ${product} for ${country}. Please share your catalogue, MOQ, pricing, packaging details, certifications, and export timeline.\n\nIf suitable, we can discuss quotation and next steps.\n\nRegards,\nTradeFlow Team`,

    negotiation: `💰 TRADEFLOW AI NEGOTIATION PLAN\n\nProduct: ${product}\nMarket: ${country}\n\nSuggested negotiation strategy:\n1. Start 10–12% below quoted price.\n2. Ask for better rate based on repeat orders.\n3. Negotiate packaging and shipping support.\n4. Request payment flexibility: advance + balance after document scan.\n5. Ask for sample or third-party inspection before bulk order.\n\nClose only if:\n• Quality is verified\n• Documents are ready\n• Timeline is clear\n• Margin remains profitable`,

    crm: `📈 TRADEFLOW AI CRM NEXT ACTION\n\nRecommended action:\nMove this lead to Contacted or Negotiation only after receiving catalogue, pricing, MOQ, and payment terms.\n\nPriority score: High if buyer replies within 24 hours.\n\nFollow-up timing:\n• First follow-up: after 24 hours\n• Second follow-up: after 72 hours\n• Final follow-up: after 7 days\n\nSuggested CRM note:\nLead requires quotation validation and document verification before closing.`,

    documents: `📄 TRADEFLOW AI EXPORT DOCUMENT CHECKLIST\n\nProduct: ${product}\nDestination: ${country}\n\nCore documents:\n1. Commercial Invoice\n2. Packing List\n3. Proforma Invoice\n4. Purchase Order\n5. Certificate of Origin\n6. Bill of Lading / Airway Bill\n7. Insurance Certificate\n8. Shipping Bill\n9. IEC / GST details\n10. Product-specific certificates\n\nAI note:\nConfirm destination-country compliance before dispatch.`
  };

  setTradeFlowAIConsole(outputs[type] || "TradeFlow AI ready.");
}

function copyTradeFlowAIConsole() {
  const box = document.getElementById("tradeflowAiConsole");
  if (!box || !box.value.trim()) {
    alert("No AI output to copy.");
    return;
  }
  navigator.clipboard.writeText(box.value).then(() => {
    alert("AI output copied.");
  }).catch(() => {
    box.select();
    document.execCommand("copy");
    alert("AI output copied.");
  });
}

function sendAIConsoleToOutreach() {
  const box = document.getElementById("tradeflowAiConsole");
  if (!box || !box.value.trim()) {
    alert("Generate AI output first.");
    return;
  }

  showPage("outreach");

  const subject = document.getElementById("emailSubject");
  const message = document.getElementById("emailMessage");

  if (subject) subject.value = "TradeFlow Business Outreach";
  if (message) message.value = box.value;
}

async function findAISuppliers() {
  const product = getAIField("aiProduct", "Rice");
  const country = getAIField("aiCountry", "UAE");
  const results = document.getElementById("aiSupplierResults");

  if (!results) return;

  results.innerHTML = `<p class="muted">AI is preparing supplier intelligence...</p>`;

  try {
    const res = await fetch(`${AI_URL}/find-suppliers`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ product, country })
    });

    if (res.status === 401) {
      logoutUser();
      return;
    }

    if (res.ok) {
      const leads = await res.json();
      if (Array.isArray(leads) && leads.length > 0) {
        results.innerHTML = "";
        leads.forEach((lead) => {
          const encodedLead = encodeURIComponent(JSON.stringify(lead));
          results.innerHTML += `
            <div class="supplier-card">
              <h2 style="font-size:20px;font-weight:900;color:white;">${lead.supplierName || "AI Supplier Lead"}</h2>
              <p class="muted">Product: ${lead.product || product}</p>
              <p class="muted">Country: ${lead.country || country}</p>
              <p class="muted">Email: ${lead.email || "Not available"}</p>
              <p class="muted">Phone: ${lead.phone || "Not available"}</p>
              <p class="muted">Source: ${lead.source || "TradeFlow AI"}</p>
              <p class="muted">Notes: ${lead.notes || "Verify company details before outreach."}</p>
              <span class="status">Score ${lead.score || 78} • ${lead.status || "Warm Lead"}</span>
              <button class="btn" onclick="saveAISupplier('${encodedLead}')">Save to Workspace</button>
            </div>`;
        });
        setTradeFlowAIConsole(`AI found ${leads.length} supplier leads for ${product} in ${country}. Review and save only verified leads.`);
        return;
      }
    }
  } catch (error) {
    console.warn("Backend AI unavailable. Using fake AI supplier engine.", error);
  }

  const fakeLeads = [
    {
      supplierName: `${country} Premium ${product} Trade Co.`,
      product,
      country,
      email: `sales@${product.toLowerCase().replace(/\s+/g, "")}trade.com`,
      phone: "+971-000-000000",
      source: "TradeFlow Fake AI Engine",
      notes: "Demo lead. Verify before real outreach.",
      score: 82,
      status: "Warm Lead"
    },
    {
      supplierName: `Global ${product} Export Network`,
      product,
      country,
      email: "export@example.com",
      phone: "+91-000-0000000",
      source: "TradeFlow Fake AI Engine",
      notes: "Useful for demo and workflow testing.",
      score: 76,
      status: "Research Needed"
    },
    {
      supplierName: `${product} Wholesale International`,
      product,
      country,
      email: "contact@example.com",
      phone: "+1-000-0000000",
      source: "TradeFlow Fake AI Engine",
      notes: "Ask for catalogue, MOQ, and certifications.",
      score: 71,
      status: "New Lead"
    }
  ];

  results.innerHTML = "";
  fakeLeads.forEach((lead) => {
    const encodedLead = encodeURIComponent(JSON.stringify(lead));
    results.innerHTML += `
      <div class="supplier-card">
        <h2 style="font-size:20px;font-weight:900;color:white;">${lead.supplierName}</h2>
        <p class="muted">Product: ${lead.product}</p>
        <p class="muted">Country: ${lead.country}</p>
        <p class="muted">Email: ${lead.email}</p>
        <p class="muted">Phone: ${lead.phone}</p>
        <p class="muted">Source: ${lead.source}</p>
        <p class="muted">Notes: ${lead.notes}</p>
        <span class="status">Score ${lead.score} • ${lead.status}</span>
        <button class="btn" onclick="saveAISupplier('${encodedLead}')">Save to Workspace</button>
      </div>`;
  });

  setTradeFlowAIConsole(`Fake AI supplier engine generated ${fakeLeads.length} demo leads for ${product} in ${country}. Later this can connect to real supplier APIs.`);
}

function generateAIEmail() {
  const product = getAIField("aiEmailProduct", "your product");
  const receiver = getAIField("aiEmailReceiver", "business partner");
  const output = `Subject: Export / Import Opportunity for ${product}\n\nHello,\n\nI hope you are doing well.\n\nWe are exploring a serious business opportunity for ${product} and would like to connect with a reliable ${receiver}. Please share your latest catalogue, pricing, MOQ, packaging details, certifications, payment terms, and shipment timeline.\n\nIf the details are suitable, we can proceed with a formal quotation and next steps.\n\nRegards,\nTradeFlow Team`;
  const el = document.getElementById("aiEmailOutput");
  if (el) el.value = output;
  setTradeFlowAIConsole(output);
}

function generateOutreach() {
  const product = getAIField("aiOutreachProduct", "your product");
  const buyer = getAIField("aiOutreachBuyer", "potential buyer");
  const output = `Subject: Business Opportunity for ${product}\n\nHello,\n\nWe are looking to discuss a serious export/import opportunity for ${product} with a ${buyer}.\n\nPlease share your requirements, MOQ, pricing expectations, packaging standards, documentation needs, and preferred delivery timeline.\n\nWe can proceed with quotation and product details after your confirmation.\n\nRegards,\nTradeFlow Team`;
  const el = document.getElementById("aiOutreachOutput");
  if (el) el.value = output;
  setTradeFlowAIConsole(output);
}

function generateNegotiationAdvice() {
  const quoted = getAIField("aiQuotedPrice", "quoted price");
  const target = getAIField("aiTargetPrice", "target price");
  const output = `AI Negotiation Strategy\n\nQuoted Price: ${quoted}\nTarget Price: ${target}\n\n1. Start politely and show long-term buying intent.\n2. Ask for volume discount instead of directly rejecting the quote.\n3. Request packaging or shipping support if price cannot be reduced.\n4. Ask for payment flexibility.\n5. Close slightly above target only if quality, delivery, and documentation are strong.\n\nSuggested message:\nYour price is close to our working range, but for repeat orders we need stronger support. Can you improve the rate or include better packaging/shipping terms?`;
  const el = document.getElementById("aiNegotiationOutput");
  if (el) el.value = output;
  setTradeFlowAIConsole(output);
}

function generateDocumentHelp() {
  const product = getAIField("aiDocProduct", "selected product");
  const country = getAIField("aiDocCountry", "destination country");
  const output = `Export Document Checklist for ${product} to ${country}\n\n1. Commercial Invoice\n2. Packing List\n3. Proforma Invoice\n4. Purchase Order\n5. Certificate of Origin\n6. Shipping Bill\n7. Bill of Lading / Airway Bill\n8. Insurance Certificate\n9. IEC and GST details\n10. Product-specific compliance certificates\n\nAI Advice:\nBefore dispatch, confirm buyer requirements, destination compliance, payment terms, and shipment responsibility.`;
  const el = document.getElementById("aiDocOutput");
  if (el) el.value = output;
  setTradeFlowAIConsole(output);
}

function generateCrmAdvice() {
  const stage = getAIField("aiDealStage", "current stage");
  const value = getAIField("aiDealValue", "deal value");
  const output = `CRM Deal Intelligence\n\nStage: ${stage}\nDeal Value: ${value}\n\nRecommended next action:\n1. If this is a new lead, send first outreach immediately.\n2. If contacted, schedule a 24-hour follow-up.\n3. If in negotiation, prepare price comparison and margin calculation.\n4. If closed, prepare documents and payment tracking.\n\nDeal probability:\n• New Lead: 25%\n• Contacted: 45%\n• Negotiation: 70%\n• Closed: 100%\n\nAI note: Save every response inside CRM so the system can recommend the next step.`;
  const el = document.getElementById("aiCrmOutput");
  if (el) el.value = output;
  setTradeFlowAIConsole(output);
}

function generateTaskPlan() {
  const goal = getAIField("aiTaskGoal", "business goal");
  const output = `AI Task Plan for: ${goal}\n\nToday:\n1. Identify 5 qualified leads.\n2. Send first outreach message.\n3. Save replies inside CRM.\n\nTomorrow:\n1. Follow up with non-responders.\n2. Compare quotes and quality indicators.\n3. Shortlist best suppliers/buyers.\n\nThis Week:\n1. Negotiate pricing and terms.\n2. Prepare required documents.\n3. Move qualified opportunities forward in the pipeline.`;
  const el = document.getElementById("aiTaskOutput");
  if (el) el.value = output;
  setTradeFlowAIConsole(output);
}
