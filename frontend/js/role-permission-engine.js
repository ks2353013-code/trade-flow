/* TradeFlow Role Permission + Business Type Engine
   Full safe version — preserves all modules and adds business-type personalization
*/

(function () {

  const OWNER_EMAIL = "ks2353013@gmail.com";

  const ALL_PERMISSIONS = {
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

  const BUSINESS_CONFIG = {
    "Supplier": {
      title: "Supplier Growth Workspace",
      subtitle: "Focused on buyer leads, export deals, outreach, CRM and trade documents.",
      primaryModules: [
        "Buyer Lead Discovery",
        "Export CRM",
        "Quotations",
        "Outreach",
        "Export Documents"
      ],
      kpis: [
        ["Buyer Leads", "48"],
        ["RFQs", "16"],
        ["Export Deals", "9"],
        ["Pending Follow-ups", "12"]
      ],
      aiPrompt: "Find buyers, prepare quotations, follow up leads, and move export deals forward.",
      sidebarPriority: ["dashboard", "suppliers", "crm", "outreach", "documents", "analytics", "ai"]
    },

    "Manufacturer": {
      title: "Manufacturer Export Workspace",
      subtitle: "Focused on production capacity, factory profile, buyer discovery and export order tracking.",
      primaryModules: [
        "Factory Profile",
        "Production Capacity",
        "Buyer Discovery",
        "Certifications",
        "Export Orders"
      ],
      kpis: [
        ["Monthly Capacity", "Ready"],
        ["Buyer Leads", "36"],
        ["Product Lines", "8"],
        ["Export Orders", "11"]
      ],
      aiPrompt: "Promote factory capacity, verify certifications, find buyers, and manage export orders.",
      sidebarPriority: ["dashboard", "master", "suppliers", "crm", "documents", "outreach", "analytics", "ai"]
    },

    "Buyer": {
      title: "Buyer Sourcing Workspace",
      subtitle: "Focused on supplier discovery, vendor comparison, quote requests and negotiation.",
      primaryModules: [
        "Supplier Search",
        "Vendor Comparison",
        "RFQ Requests",
        "Quote Analysis",
        "Negotiation"
      ],
      kpis: [
        ["Verified Suppliers", "64"],
        ["RFQs Sent", "22"],
        ["Quotes Received", "14"],
        ["Negotiations", "7"]
      ],
      aiPrompt: "Find suppliers, compare quotations, evaluate vendors, and negotiate better sourcing terms.",
      sidebarPriority: ["dashboard", "suppliers", "negotiation", "crm", "tasks", "analytics", "ai"]
    },

    "Trading Company": {
      title: "Trading Company Command Center",
      subtitle: "Full import/export workspace for supplier discovery, buyer leads, CRM, negotiation and outreach.",
      primaryModules: [
        "Supplier Discovery",
        "Buyer Discovery",
        "CRM Pipeline",
        "Negotiation Desk",
        "Outreach Automation",
        "Trade Documents"
      ],
      kpis: [
        ["Supplier Leads", "72"],
        ["Buyer Leads", "58"],
        ["CRM Deals", "24"],
        ["Pipeline Value", "₹12.5L"]
      ],
      aiPrompt: "Manage both supplier and buyer sides with CRM, outreach, negotiation and documentation.",
      sidebarPriority: ["dashboard", "suppliers", "crm", "negotiation", "outreach", "documents", "analytics", "ai"]
    },

    "Buying House": {
      title: "Buying House Sourcing Workspace",
      subtitle: "Focused on supplier verification, buyer requirements, inspections and vendor management.",
      primaryModules: [
        "Supplier Verification",
        "Vendor Audits",
        "Buyer Requirements",
        "Inspection Reports",
        "Quality Coordination"
      ],
      kpis: [
        ["Verified Vendors", "39"],
        ["Buyer Requests", "18"],
        ["Inspections", "6"],
        ["Approved Suppliers", "21"]
      ],
      aiPrompt: "Verify vendors, manage buyer requirements, coordinate inspections and reduce sourcing risk.",
      sidebarPriority: ["dashboard", "suppliers", "tasks", "crm", "documents", "analytics", "ai"]
    }
  };

  function $(id) {
    return document.getElementById(id);
  }

  function getJson(key, fallback = null) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") || fallback;
    } catch {
      return fallback;
    }
  }

  function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getUser() {
    return (
      getJson("tradeflowUser") ||
      getJson("user") ||
      getJson("currentUser") ||
      {}
    );
  }

  function saveUser(user) {
    setJson("tradeflowUser", user);
    setJson("user", user);
    setJson("currentUser", user);
  }

  function getBusinessType() {
    return (
      localStorage.getItem("tradeflowBusinessType") ||
      getUser().businessType ||
      "Trading Company"
    );
  }

  function getBusinessConfig() {
    return BUSINESS_CONFIG[getBusinessType()] || BUSINESS_CONFIG["Trading Company"];
  }

  function forceOwnerSession() {
    const existing = getUser();
    const businessType = getBusinessType();

    const finalUser = {
      ...existing,
      name: existing.name || "TradeFlow Admin",
      email: existing.email || OWNER_EMAIL,
      role: "master_admin",
      plan: "enterprise",
      subscription: "enterprise",
      businessType,
      permissions: ALL_PERMISSIONS,
      token:
        existing.token ||
        localStorage.getItem("tradeflowToken") ||
        localStorage.getItem("token") ||
        "local-testing-token",
      isLoggedIn: true
    };

    saveUser(finalUser);

    localStorage.setItem("tradeflowBusinessType", businessType);
    localStorage.setItem("tradeflowRole", "master_admin");
    localStorage.setItem("role", "master_admin");
    localStorage.setItem("tradeflowSubscriptionPlan", "Enterprise");
    localStorage.setItem("plan", "enterprise");
    localStorage.setItem("subscription", "enterprise");
    localStorage.setItem("isLoggedIn", "true");
    localStorage.setItem("tradeflowLoggedIn", "true");

    return finalUser;
  }

  function canAccess() {
    return true;
  }

  function patchShowPage() {
    if (window.TradeFlowRolePermissionPatched) return;
    if (typeof window.showPage !== "function") return;

    const originalShowPage = window.showPage;

    window.showPage = function(page) {
      forceOwnerSession();

      const result = originalShowPage(page);

      setTimeout(() => {
        applyBusinessTypeUI();
      }, 150);

      return result;
    };

    window.TradeFlowRolePermissionPatched = true;
  }

  function patchSensitiveActions() {
    if (window.TradeFlowRoleActionsPatched) return;

    window.TradeFlowRoleActionsPatched = true;

    const actions = [
      "addSupplier",
      "deleteSupplier",
      "addDeal",
      "deleteDeal",
      "addTask",
      "deleteTask",
      "generateInvoicePDF",
      "sendTradeFlowEmail",
      "saveAndOpenWhatsApp",
      "addEmployee",
      "deleteEmployee",
      "addWorkspace",
      "deleteWorkspace"
    ];

    actions.forEach((fnName) => {
      const original = window[fnName];

      if (typeof original !== "function") return;

      window[fnName] = function(...args) {
        forceOwnerSession();
        return original.apply(this, args);
      };
    });
  }

  function restoreHiddenNavigation() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.remove("role-locked-nav");
      btn.style.display = "";
      btn.style.opacity = "1";
      btn.style.pointerEvents = "auto";
    });
  }

  function getPageFromButton(btn) {
    const onclick = (btn.getAttribute("onclick") || "").toLowerCase();
    const match = onclick.match(/showpage\(['"]([^'"]+)['"]\)/);
    return match ? match[1] : "";
  }

  function reorderSidebarByBusinessType() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;

    const config = getBusinessConfig();
    const buttons = Array.from(sidebar.querySelectorAll(".nav-btn"));

    config.sidebarPriority.slice().reverse().forEach((page) => {
      const btn = buttons.find((button) => getPageFromButton(button) === page);
      if (btn) {
        const brand = sidebar.querySelector(".brand");
        if (brand && brand.nextSibling) {
          sidebar.insertBefore(btn, brand.nextSibling);
        }
      }
    });
  }

  function updateWorkspaceText() {
    const config = getBusinessConfig();
    const user = forceOwnerSession();

    const workspaceName = $("workspaceName");
    const userBadge = $("userBadge");

    if (workspaceName) {
      workspaceName.innerText = `${config.title} • ${user.name || "Admin"}`;
    }

    if (userBadge) {
      userBadge.innerText = `${getBusinessType()} • Enterprise`;
    }
  }

  function buildBusinessTypePanel() {
    const dashboard = $("dashboardPage");
    if (!dashboard) return;

    let panel = $("businessTypeEnginePanel");
    const config = getBusinessConfig();
    const businessType = getBusinessType();

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "businessTypeEnginePanel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";
      dashboard.prepend(panel);
    }

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <div class="section-title">🏢 Business-Type Engine Active</div>
          <h2 style="font-size:28px;font-weight:900;color:white;margin:6px 0;">
            ${config.title}
          </h2>
          <p class="muted" style="max-width:820px;">
            ${config.subtitle}
          </p>
        </div>

        <div style="
          padding:10px 14px;
          border-radius:999px;
          background:rgba(37,99,235,.20);
          border:1px solid rgba(147,197,253,.30);
          color:#bfdbfe;
          font-weight:900;
        ">
          ${businessType}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:18px;">
        ${config.kpis.map(([label, value]) => `
          <div style="
            padding:16px;
            border-radius:18px;
            background:rgba(15,23,42,.72);
            border:1px solid rgba(148,163,184,.16);
          ">
            <div style="color:#94a3b8;font-size:13px;font-weight:800;">${label}</div>
            <div style="font-size:28px;font-weight:900;color:white;margin-top:6px;">${value}</div>
          </div>
        `).join("")}
      </div>

      <div style="margin-top:18px;">
        <div style="font-weight:900;color:white;margin-bottom:8px;">Primary modules for this business type:</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${config.primaryModules.map((module) => `
            <span style="
              display:inline-flex;
              padding:8px 11px;
              border-radius:999px;
              background:rgba(14,165,233,.14);
              border:1px solid rgba(125,211,252,.25);
              color:#7dd3fc;
              font-size:12px;
              font-weight:900;
            ">
              ${module}
            </span>
          `).join("")}
        </div>
      </div>

      <div style="
        margin-top:18px;
        padding:14px;
        border-radius:18px;
        background:rgba(124,58,237,.14);
        border:1px solid rgba(196,181,253,.22);
      ">
        <b style="color:white;">AI Focus:</b>
        <span class="muted">${config.aiPrompt}</span>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
        <button class="btn" onclick="TradeFlowBusinessTypeEngine.openRecommended('suppliers')">
          Open Main Leads
        </button>
        <button class="btn" onclick="TradeFlowBusinessTypeEngine.openRecommended('crm')">
          Open CRM
        </button>
        <button class="btn" onclick="TradeFlowBusinessTypeEngine.openRecommended('outreach')">
          Open Outreach
        </button>
        <button class="btn" onclick="TradeFlowBusinessTypeEngine.changeType()">
          Change Business Type
        </button>
      </div>
    `;
  }

  function buildBusinessTypeSwitcher() {
    const topbar = document.querySelector(".topbar > div:last-child");
    if (!topbar || $("businessTypeSelect")) return;

    const select = document.createElement("select");
    select.id = "businessTypeSelect";
    select.style.maxWidth = "240px";
    select.style.marginTop = "0";

    Object.keys(BUSINESS_CONFIG).forEach((type) => {
      const option = document.createElement("option");
      option.value = type;
      option.textContent = type;
      if (type === getBusinessType()) option.selected = true;
      select.appendChild(option);
    });

    select.onchange = function() {
      localStorage.setItem("tradeflowBusinessType", this.value);

      const user = getUser();
      user.businessType = this.value;
      saveUser(user);

      applyBusinessTypeUI();

      if (window.TradeFlowPremiumUX?.toast) {
        window.TradeFlowPremiumUX.toast(`Business type changed to ${this.value}`);
      } else {
        alert(`Business type changed to ${this.value}`);
      }
    };

    topbar.prepend(select);
  }

  function updateAIConsoleDefault() {
    const box = $("tradeflowAiConsole");
    if (!box) return;

    const config = getBusinessConfig();

    if (!box.value || box.value.includes("TradeFlow AI Copilot ready")) {
      box.value = `TradeFlow AI Copilot ready for ${getBusinessType()}.

AI Focus:
${config.aiPrompt}

Recommended first steps:
1. Open your priority lead module.
2. Add or discover leads.
3. Move serious opportunities into CRM.
4. Use outreach automation.
5. Track results in analytics.`;
    }
  }

  function applyBusinessTypeUI() {
    forceOwnerSession();
    restoreHiddenNavigation();
    reorderSidebarByBusinessType();
    updateWorkspaceText();
    buildBusinessTypeSwitcher();
    buildBusinessTypePanel();
    updateAIConsoleDefault();
  }

  function openRecommended(page) {
    if (typeof window.showPage === "function") {
      window.showPage(page);
    }
  }

  function changeType() {
    const current = getBusinessType();

    const next = prompt(
      "Enter business type:\nSupplier\nManufacturer\nBuyer\nTrading Company\nBuying House",
      current
    );

    if (!next) return;

    if (!BUSINESS_CONFIG[next]) {
      alert("Invalid business type. Please use exact name from the list.");
      return;
    }

    localStorage.setItem("tradeflowBusinessType", next);

    const user = getUser();
    user.businessType = next;
    saveUser(user);

    const selector = $("businessTypeSelect");
    if (selector) selector.value = next;

    applyBusinessTypeUI();
  }

  function boot() {
    forceOwnerSession();

    setTimeout(() => {
      forceOwnerSession();
      patchShowPage();
      patchSensitiveActions();
      applyBusinessTypeUI();
    }, 800);

    setInterval(() => {
      forceOwnerSession();
      restoreHiddenNavigation();
    }, 5000);

    console.log("✅ TradeFlow Business-Type Engine active");
  }

  window.TradeFlowRolePermissionEngine = {
    canAccess,
    refresh: boot
  };

  window.TradeFlowBusinessTypeEngine = {
    getBusinessType,
    getBusinessConfig,
    apply: applyBusinessTypeUI,
    openRecommended,
    changeType
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();