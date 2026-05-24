/* TradeFlow Role Permission Engine */

(function () {
  const OWNER_EMAIL = "ks2353013@gmail.com";
  const EMPLOYEE_CACHE = "tradeflowEmployeeManagementCache";
  const USER_KEY = "tradeflowUser";

  const DEFAULT_PERMISSIONS = {
    dashboard: true,
    suppliers: false,
    crm: false,
    tasks: false,
    analytics: false,
    documents: false,
    outreach: false,
    ai: false,
    billing: false,
    admin: false,
    workspaces: false,
    employees: false,
    master: false,
    negotiation: false,
    marketing: false,
    notifications: true
  };

  const OWNER_PERMISSIONS = {
    dashboard: true,
    suppliers: true,
    crm: true,
    tasks: true,
    analytics: true,
    documents: true,
    outreach: true,
    ai: true,
    billing: true,
    admin: true,
    workspaces: true,
    employees: true,
    master: true,
    negotiation: true,
    marketing: true,
    notifications: true
  };

  const ROLE_PRESETS = {
    Owner: OWNER_PERMISSIONS,
    Admin: OWNER_PERMISSIONS,
    Manager: {
      ...DEFAULT_PERMISSIONS,
      suppliers: true,
      crm: true,
      tasks: true,
      analytics: true,
      documents: true,
      outreach: true,
      ai: true,
      workspaces: true,
      employees: true,
      negotiation: true,
      notifications: true
    },
    Sales: {
      ...DEFAULT_PERMISSIONS,
      suppliers: true,
      crm: true,
      tasks: true,
      outreach: true,
      ai: true,
      negotiation: true,
      notifications: true
    },
    Operations: {
      ...DEFAULT_PERMISSIONS,
      suppliers: true,
      tasks: true,
      analytics: true,
      documents: true,
      ai: true,
      notifications: true
    },
    Documentation: {
      ...DEFAULT_PERMISSIONS,
      tasks: true,
      documents: true,
      notifications: true
    },
    Viewer: {
      ...DEFAULT_PERMISSIONS,
      analytics: true,
      notifications: true
    }
  };

  function $(id) {
    return document.getElementById(id);
  }

  function getJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getUser() {
    try {
      if (typeof window.getUser === "function") return window.getUser();
    } catch {}
    return getJson(USER_KEY, {});
  }

  function isMasterOwner() {
    const user = getUser();
    const email = (user?.email || "").toLowerCase();
    return email === OWNER_EMAIL;
  }

  function getEmployees() {
    return getJson(EMPLOYEE_CACHE, []);
  }

  function findCurrentEmployee() {
    const user = getUser();
    const email = (user?.email || "").toLowerCase();

    if (!email) return null;

    return getEmployees().find((emp) => {
      return (emp.email || "").toLowerCase() === email;
    });
  }

  function getCurrentPermissions() {
    if (isMasterOwner()) return OWNER_PERMISSIONS;

    const employee = findCurrentEmployee();

    if (employee?.permissions) {
      return {
        ...DEFAULT_PERMISSIONS,
        ...employee.permissions,
        notifications: true,
        dashboard: true
      };
    }

    const user = getUser();
    const role = user?.role || "Owner";

    if (ROLE_PRESETS[role]) return ROLE_PRESETS[role];

    return DEFAULT_PERMISSIONS;
  }

  function permissionForPage(page) {
    const map = {
      dashboard: "dashboard",
      suppliers: "suppliers",
      crm: "crm",
      negotiation: "negotiation",
      tasks: "tasks",
      marketing: "marketing",
      documents: "documents",
      outreach: "outreach",
      analytics: "analytics",
      ai: "ai",
      notifications: "notifications",
      workspaces: "workspaces",
      employees: "employees",
      master: "master"
    };

    return map[page] || page;
  }

  function canAccess(page) {
    const permissions = getCurrentPermissions();
    const permissionName = permissionForPage(page);
    return !!permissions[permissionName];
  }

  function toast(message) {
    if (window.TradeFlowPremiumUX && typeof window.TradeFlowPremiumUX.toast === "function") {
      window.TradeFlowPremiumUX.toast(message);
      return;
    }

    alert(message.replace(/<[^>]*>/g, ""));
  }

  let originalShowPage = null;

  function patchShowPage() {
    if (window.TradeFlowRolePermissionPatched) return;
    if (typeof window.showPage !== "function") return;

    originalShowPage = window.showPage;

    window.showPage = function (page) {
      if (!canAccess(page)) {
        toast(`🚫 Access denied: <b>${page}</b> is not allowed for your role.`);
        return originalShowPage("dashboard");
      }

      return originalShowPage(page);
    };

    window.TradeFlowRolePermissionPatched = true;
  }

  function injectStyles() {
    if ($("rolePermissionStyles")) return;

    const style = document.createElement("style");
    style.id = "rolePermissionStyles";
    style.innerHTML = `
      .role-locked-nav {
        display: none !important;
      }

      .role-permission-banner {
        padding: 16px;
        border-radius: 22px;
        background: linear-gradient(135deg, rgba(15,23,42,.94), rgba(2,6,23,.66));
        border: 1px solid rgba(56,189,248,.20);
        margin-bottom: 16px;
      }

      .role-permission-chip {
        display: inline-flex;
        margin: 6px 6px 0 0;
        padding: 7px 10px;
        border-radius: 999px;
        background: rgba(56,189,248,.12);
        border: 1px solid rgba(56,189,248,.22);
        color: #7dd3fc;
        font-size: 12px;
        font-weight: 900;
      }

      .role-denied-overlay {
        opacity: .45;
        pointer-events: none;
        filter: grayscale(.45);
      }
    `;
    document.head.appendChild(style);
  }

  function updateNavByRole() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      const onclick = (btn.getAttribute("onclick") || "").toLowerCase();
      const match = onclick.match(/showpage\(['"]([^'"]+)['"]\)/);

      if (!match) return;

      const page = match[1];

      if (canAccess(page)) {
        btn.classList.remove("role-locked-nav");
      } else {
        btn.classList.add("role-locked-nav");
      }
    });
  }

  function buildRoleBanner() {
    const dashboard = $("dashboardPage");
    if (!dashboard || $("rolePermissionBanner")) return;

    const user = getUser();
    const employee = findCurrentEmployee();
    const permissions = getCurrentPermissions();

    const allowed = Object.keys(permissions)
      .filter((key) => permissions[key])
      .slice(0, 16);

    const banner = document.createElement("div");
    banner.id = "rolePermissionBanner";
    banner.className = "role-permission-banner";
    banner.innerHTML = `
      <div class="section-title">🛡️ Role Permission Engine Active</div>
      <p class="muted">
        ${isMasterOwner()
          ? "Master owner has full access."
          : `Logged in as ${employee?.role || user?.role || "Owner"}. Modules are filtered based on permissions.`
        }
      </p>
      <div>
        ${allowed.map((item) => `<span class="role-permission-chip">${item}</span>`).join("")}
      </div>
    `;

    const accessBanner = $("accessControlBanner");
    if (accessBanner && accessBanner.nextSibling) {
      dashboard.insertBefore(banner, accessBanner.nextSibling);
    } else {
      dashboard.prepend(banner);
    }
  }

  function patchSensitiveActions() {
    if (window.TradeFlowRoleActionsPatched) return;
    window.TradeFlowRoleActionsPatched = true;

    const patch = (fnName, permission, label) => {
      const original = window[fnName];
      if (typeof original !== "function") return;

      window[fnName] = function (...args) {
        if (!getCurrentPermissions()[permission]) {
          toast(`🚫 You do not have permission for ${label}.`);
          return;
        }

        return original.apply(this, args);
      };
    };

    patch("addSupplier", "suppliers", "supplier management");
    patch("deleteSupplier", "suppliers", "supplier deletion");
    patch("addDeal", "crm", "CRM management");
    patch("deleteDeal", "crm", "CRM deletion");
    patch("addTask", "tasks", "task management");
    patch("deleteTask", "tasks", "task deletion");
    patch("generateInvoicePDF", "documents", "document generation");
    patch("sendTradeFlowEmail", "outreach", "email outreach");
    patch("saveAndOpenWhatsApp", "outreach", "WhatsApp outreach");
    patch("addEmployee", "employees", "employee management");
    patch("deleteEmployee", "employees", "employee deletion");
    patch("addWorkspace", "workspaces", "workspace management");
    patch("deleteWorkspace", "workspaces", "workspace deletion");
  }

  function syncRoleFromEmployee() {
    const employee = findCurrentEmployee();
    const user = getUser();

    if (!employee || !user) return;

    user.role = employee.role || user.role || "Viewer";
    user.permissions = employee.permissions || DEFAULT_PERMISSIONS;

    setJson(USER_KEY, user);
  }

  function refresh() {
    syncRoleFromEmployee();
    updateNavByRole();

    const banner = $("rolePermissionBanner");
    if (banner) banner.remove();

    buildRoleBanner();
  }

  window.TradeFlowRolePermissionEngine = {
    getPermissions: getCurrentPermissions,
    canAccess,
    refresh
  };

  function boot() {
    injectStyles();

    setTimeout(() => {
      syncRoleFromEmployee();
      patchShowPage();
      patchSensitiveActions();
      updateNavByRole();
      buildRoleBanner();
    }, 1500);

    setInterval(() => {
      patchShowPage();
      patchSensitiveActions();
      updateNavByRole();
    }, 3500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
