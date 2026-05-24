/* TradeFlow Access Control + Upgrade Gate Engine */

(function () {
  const OWNER_EMAIL = "ks2353013@gmail.com";
  const PLAN_KEY = "tradeflowSubscriptionPlan";
  const ACCESS_NOTICE_KEY = "tradeflowAccessNoticeSeen";

  const FREE_ALLOWED_PAGES = ["dashboard", "ai", "suppliers", "crm", "notifications"];
  const PRO_PAGES = ["workspaces", "employees", "negotiation", "tasks", "marketing", "documents", "outreach", "analytics"];
  const ENTERPRISE_PAGES = ["master"];

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

  function getUser() {
    try {
      if (typeof window.getUser === "function") return window.getUser();
    } catch {}
    return getJson("tradeflowUser", null);
  }

  function getMasterAdmin() {
    return getJson("tradeflowMasterAdmin", null);
  }

  function isMasterAdmin() {
    const user = getUser();
    const master = getMasterAdmin();
    const email = (master?.email || user?.email || "").toLowerCase();
    return email === OWNER_EMAIL;
  }

  function getPlan() {
    if (isMasterAdmin()) return "Enterprise";
    return localStorage.getItem(PLAN_KEY) || "Free";
  }

  function isProOrAbove() {
    const plan = getPlan();
    return plan === "Pro" || plan === "Enterprise";
  }

  function isEnterprise() {
    return getPlan() === "Enterprise";
  }

  function setDefaultPlan() {
    if (isMasterAdmin()) {
      localStorage.setItem(PLAN_KEY, "Enterprise");
      return;
    }

    const plan = localStorage.getItem(PLAN_KEY);
    if (!plan || plan === "Enterprise") {
      localStorage.setItem(PLAN_KEY, "Free");
    }
  }

  function toast(message) {
    if (window.TradeFlowPremiumUX && typeof window.TradeFlowPremiumUX.toast === "function") {
      window.TradeFlowPremiumUX.toast(message);
      return;
    }
    alert(message.replace(/<[^>]*>/g, ""));
  }

  function openUpgrade() {
    if (window.TradeFlowSubscriptionEngine && typeof window.TradeFlowSubscriptionEngine.openUpgrade === "function") {
      window.TradeFlowSubscriptionEngine.openUpgrade();
      return;
    }
    alert("Upgrade required. Please activate Pro or Enterprise plan.");
  }

  function pageRequiredPlan(page) {
    if (isMasterAdmin()) return "Free";
    if (FREE_ALLOWED_PAGES.includes(page)) return "Free";
    if (PRO_PAGES.includes(page)) return "Pro";
    if (ENTERPRISE_PAGES.includes(page)) return "Enterprise";
    return "Pro";
  }

  function canAccessPage(page) {
    if (isMasterAdmin()) return true;

    const required = pageRequiredPlan(page);
    if (required === "Free") return true;
    if (required === "Pro") return isProOrAbove();
    if (required === "Enterprise") return isEnterprise();
    return false;
  }

  let originalShowPage = null;

  function patchNavigationGate() {
    if (window.TradeFlowAccessGatePatched) return;
    if (typeof window.showPage !== "function") return;

    originalShowPage = window.showPage;

    window.showPage = function (page) {
      if (!canAccessPage(page)) {
        toast(`🔒 <b>${page}</b> is a ${pageRequiredPlan(page)} feature. Upgrade to unlock.`);
        openUpgrade();
        return originalShowPage("dashboard");
      }

      return originalShowPage(page);
    };

    window.TradeFlowAccessGatePatched = true;
  }

  function injectStyles() {
    if ($("accessControlStyles")) return;

    const style = document.createElement("style");
    style.id = "accessControlStyles";
    style.innerHTML = `
      .locked-nav {
        opacity: .55;
        position: relative;
      }

      .locked-nav::before {
        content: "🔒";
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
      }

      .access-banner {
        padding: 18px;
        border-radius: 24px;
        background:
          radial-gradient(circle at top left, rgba(250,204,21,.15), transparent 42%),
          linear-gradient(135deg, rgba(15,23,42,.92), rgba(2,6,23,.70));
        border: 1px solid rgba(250,204,21,.24);
        margin-bottom: 18px;
      }

      .access-pill {
        display: inline-flex;
        padding: 8px 12px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 900;
        background: rgba(56,189,248,.12);
        border: 1px solid rgba(56,189,248,.24);
        color: #7dd3fc;
        margin-top: 10px;
      }

      .feature-lock-card {
        padding: 18px;
        border-radius: 22px;
        background: linear-gradient(135deg, rgba(15,23,42,.90), rgba(2,6,23,.65));
        border: 1px solid rgba(250,204,21,.22);
        margin-bottom: 14px;
      }
    `;
    document.head.appendChild(style);
  }

  function updateNavLocks() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      const onclick = (btn.getAttribute("onclick") || "").toLowerCase();
      const match = onclick.match(/showpage\(['"]([^'"]+)['"]\)/);
      if (!match) return;

      const page = match[1];

      if (canAccessPage(page)) {
        btn.classList.remove("locked-nav");
        btn.title = "";
      } else {
        btn.classList.add("locked-nav");
        btn.title = `${pageRequiredPlan(page)} plan required`;
      }
    });
  }

  function buildAccessBanner() {
    const dashboard = $("dashboardPage");
    if (!dashboard || $("accessControlBanner")) return;

    const plan = getPlan();
    const owner = isMasterAdmin();

    const banner = document.createElement("div");
    banner.id = "accessControlBanner";
    banner.className = "access-banner";
    banner.innerHTML = `
      <div class="section-title">🔐 Access Control Active</div>
      <p class="muted">
        ${owner
          ? "Master admin has full platform access."
          : "This workspace is on Free access. Upgrade to unlock automation, documents, outreach, analytics, employees, multi-company control, and advanced workflows."
        }
      </p>
      <span class="access-pill">Current Access: ${owner ? "Master Admin / Enterprise" : plan}</span>
      ${owner ? "" : `<button class="btn" onclick="TradeFlowAccessControl.openUpgrade()" style="max-width:260px;margin-top:14px;">Upgrade Workspace</button>`}
    `;

    const hero = dashboard.querySelector(".dashboard-hero");
    if (hero && hero.nextSibling) dashboard.insertBefore(banner, hero.nextSibling);
    else dashboard.prepend(banner);
  }

  function buildLockedFeaturePreview() {
    const dashboard = $("dashboardPage");
    if (!dashboard || $("lockedFeaturePreview") || isMasterAdmin()) return;

    const panel = document.createElement("div");
    panel.id = "lockedFeaturePreview";
    panel.className = "card subscription-card";
    panel.innerHTML = `
      <div class="section-title">🚀 Upgrade To Unlock Full TradeFlow AI OS</div>
      <p class="muted">Free users get limited access. Pro/Enterprise unlocks the full business operating system.</p>

      <div class="grid grid-3" style="margin-top:16px;">
        <div class="feature-lock-card"><b>📧 Outreach Automation</b><p class="muted">Email + WhatsApp workflows and follow-ups.</p></div>
        <div class="feature-lock-card"><b>📄 Export Documents</b><p class="muted">Invoices, checklists, and document intelligence.</p></div>
        <div class="feature-lock-card"><b>📉 Advanced Analytics</b><p class="muted">Pipeline, conversion, and business reports.</p></div>
        <div class="feature-lock-card"><b>👥 Employees & Roles</b><p class="muted">Team seats and permissions.</p></div>
        <div class="feature-lock-card"><b>🏬 Multi-company Workspaces</b><p class="muted">Manage multiple companies.</p></div>
        <div class="feature-lock-card"><b>⚙️ Automation Engine</b><p class="muted">Daily plans, task automation, and risk alerts.</p></div>
      </div>

      <button class="btn" onclick="TradeFlowAccessControl.openUpgrade()">Upgrade Now</button>
    `;

    dashboard.appendChild(panel);
  }

  function limitFreeAI() {
    if (isMasterAdmin() || isProOrAbove()) return true;

    const usage = JSON.parse(localStorage.getItem("tradeflowUsageStats") || "{}");
    const aiUsed = Number(usage.aiUsed || 0);

    if (aiUsed >= 20) {
      toast("🔒 Free AI limit reached. Upgrade to Pro for more AI usage.");
      openUpgrade();
      return false;
    }

    return true;
  }

  function patchActionLimits() {
    if (window.TradeFlowAccessActionsPatched) return;
    window.TradeFlowAccessActionsPatched = true;

    const patch = (fnName, type, message) => {
      const original = window[fnName];
      if (typeof original !== "function") return;

      window[fnName] = function (...args) {
        if (isMasterAdmin()) return original.apply(this, args);

        if (type === "pro" && !isProOrAbove()) {
          toast(`🔒 ${message} requires Pro plan.`);
          openUpgrade();
          return;
        }

        if (type === "enterprise" && !isEnterprise()) {
          toast(`🔒 ${message} requires Enterprise plan.`);
          openUpgrade();
          return;
        }

        return original.apply(this, args);
      };
    };

    patch("addWorkspace", "pro", "Multi-company workspace");
    patch("addEmployee", "pro", "Employee and role management");
    patch("generateInvoicePDF", "pro", "Export document generation");
    patch("sendTradeFlowEmail", "pro", "Email outreach sending");
    patch("saveAndOpenWhatsApp", "pro", "WhatsApp outreach automation");
    patch("saveOutreachRecord", "pro", "Outreach automation");
    patch("addTask", "pro", "Task automation");

    if (window.TradeFlowAIChat && typeof window.TradeFlowAIChat.ask === "function") {
      const originalAsk = window.TradeFlowAIChat.ask;
      window.TradeFlowAIChat.ask = function (...args) {
        if (!limitFreeAI()) return;
        return originalAsk.apply(this, args);
      };
    }
  }

  function showFirstNotice() {
    if (isMasterAdmin()) return;
    if (localStorage.getItem(ACCESS_NOTICE_KEY)) return;

    localStorage.setItem(ACCESS_NOTICE_KEY, "yes");
    setTimeout(() => toast("🔐 Free workspace activated. Upgrade to unlock full TradeFlow AI OS."), 1600);
  }

  function boot() {
    setDefaultPlan();
    injectStyles();

    setTimeout(() => {
      patchNavigationGate();
      patchActionLimits();
      updateNavLocks();
      buildAccessBanner();
      buildLockedFeaturePreview();
      showFirstNotice();
    }, 1000);

    setInterval(() => {
      patchNavigationGate();
      patchActionLimits();
      updateNavLocks();
    }, 2500);
  }

  window.TradeFlowAccessControl = {
    getPlan,
    isMasterAdmin,
    canAccessPage,
    openUpgrade,
    updateNavLocks
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
