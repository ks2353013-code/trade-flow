/* TradeFlow Unified Access Control Engine */

(function () {

  const OWNER_EMAILS = [
    "contact@tradeflowai.in",
    "ks2353013@gmail.com"
  ];

  const PLAN_KEY = "tradeflowSubscriptionPlan";

  const FREE_ALLOWED_PAGES = [
    "dashboard",
    "suppliers",
    "crm",
    "notifications",
    "workspaces",
    "employees"
  ];

  const STARTER_PAGES = [
    "ai",
    "executivetower"
  ];

  const PRO_PAGES = [
    "negotiation",
    "tasks",
    "marketing",
    "documents",
    "outreach",
    "analytics"
  ];

  const ENTERPRISE_PAGES = [
    "master"
  ];

  function normalizeEmail(email) {
    return String(email || "")
      .trim()
      .toLowerCase();
  }

  function getJson(key, fallback = null) {
    try {
      return JSON.parse(
        localStorage.getItem(key) || "null"
      ) || fallback;
    } catch {
      return fallback;
    }
  }

  function getUser() {
    return getJson("tradeflowUser");
  }

  function getMasterAdmin() {
    return getJson("tradeflowMasterAdmin");
  }

  function isMasterAdmin() {

    const user = getUser();
    const master = getMasterAdmin();

    const email =
      normalizeEmail(
        master?.email ||
        user?.email
      );

    return OWNER_EMAILS.includes(email);
  }

  function normalizePlan(plan) {
    const value = String(plan || "")
      .trim()
      .toLowerCase();

    if (value.includes("enterprise")) return "Enterprise";
    if (value.includes("growth")) return "Growth";
    if (value.includes("pro") || value.includes("professional")) return "Pro";
    if (value.includes("free")) return "Free";

    return "Starter";
  }

  function getPlan() {

    if (isMasterAdmin()) {
      return "Enterprise";
    }

    const user = getUser() || {};

    return normalizePlan(
      user.subscriptionPlan ||
      user.plan ||
      localStorage.getItem(PLAN_KEY) ||
      "Starter"
    );
  }

  function isProOrAbove() {

    const plan = getPlan();

    return (
      plan === "Pro" ||
      plan === "Growth" ||
      plan === "Enterprise"
    );
  }

  function isEnterprise() {
    return getPlan() === "Enterprise";
  }

  function setDefaultPlan() {

    if (isMasterAdmin()) {

      localStorage.setItem(
        PLAN_KEY,
        "Enterprise AI OS"
      );

      return;
    }

    const current =
      localStorage.getItem(
        PLAN_KEY
      );

    if (!current) {

      localStorage.setItem(
        PLAN_KEY,
        "Starter"
      );

    }
  }

  function pageRequiredPlan(page) {
    const normalizedPage = String(page || "")
      .trim()
      .toLowerCase();

    if (isMasterAdmin()) {
      return "Free";
    }

    if (
      FREE_ALLOWED_PAGES.includes(normalizedPage)
    ) {
      return "Free";
    }

    if (
      STARTER_PAGES.includes(normalizedPage)
    ) {
      return "Starter";
    }

    if (
      PRO_PAGES.includes(normalizedPage)
    ) {
      return "Pro";
    }

    if (
      ENTERPRISE_PAGES.includes(normalizedPage)
    ) {
      return "Enterprise";
    }

    return "Pro";
  }

  function canAccessPage(page) {

    if (isMasterAdmin()) {
      return true;
    }

    const required =
      pageRequiredPlan(page);

    if (required === "Free") {
      return true;
    }

    if (required === "Starter") {
      return getPlan() !== "Free";
    }

    if (required === "Pro") {
      return isProOrAbove();
    }

    if (required === "Enterprise") {
      return isEnterprise();
    }

    return false;
  }

  function toast(message) {

    if (
      window.TradeFlowPremiumUX &&
      typeof window.TradeFlowPremiumUX.toast === "function"
    ) {

      window.TradeFlowPremiumUX.toast(message);
      return;

    }

    alert(
      message.replace(/<[^>]*>/g, "")
    );
  }

  function openUpgrade() {

    alert(
      "Upgrade system coming next."
    );

  }

  function patchNavigationGate() {

    if (
      window.TradeFlowAccessGatePatched
    ) {
      return;
    }

    if (
      typeof window.showPage !== "function"
    ) {
      return;
    }

    const originalShowPage =
      window.showPage;

    window.showPage = function(page) {

      if (
        !canAccessPage(page)
      ) {

        toast(
          `🔒 ${page} requires ${pageRequiredPlan(page)} access.`
        );

        return originalShowPage(
          "dashboard"
        );
      }

      return originalShowPage(page);
    };

    window.TradeFlowAccessGatePatched = true;
  }

  function updateNavLocks() {

    document
      .querySelectorAll(".nav-btn")
      .forEach((btn) => {

        const onclick =
          (
            btn.getAttribute("onclick")
            || ""
          ).toLowerCase();

        const match =
          onclick.match(
            /showpage\(['"]([^'"]+)['"]\)/
          );

        if (!match) {
          return;
        }

        const page = match[1];

        if (
          canAccessPage(page)
        ) {

          btn.classList.remove(
            "locked-nav"
          );

          btn.title = "";

        } else {

          btn.classList.add(
            "locked-nav"
          );

          btn.title =
            `${pageRequiredPlan(page)} required`;
        }
      });
  }

  function injectStyles() {

    if (
      document.getElementById(
        "accessControlStyles"
      )
    ) {
      return;
    }

    const style =
      document.createElement(
        "style"
      );

    style.id =
      "accessControlStyles";

    style.innerHTML = `
      .locked-nav{
        opacity:.55;
        position:relative;
      }

      .locked-nav::before{
        content:"🔒";
        position:absolute;
        right:12px;
        top:50%;
        transform:translateY(-50%);
      }
    `;

    document.head.appendChild(style);
  }

  function boot() {

    setDefaultPlan();

    injectStyles();

    setTimeout(() => {

      patchNavigationGate();

      updateNavLocks();

    }, 1200);

    setInterval(() => {

      patchNavigationGate();

      updateNavLocks();

    }, 3000);
  }

  window.TradeFlowAccessControl = {
    getPlan,
    isMasterAdmin,
    canAccessPage,
    openUpgrade
  };

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      boot
    );

  } else {

    boot();

  }

})();
