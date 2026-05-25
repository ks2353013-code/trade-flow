/* TradeFlow Unified Access Control Engine */

(function () {

  const OWNER_EMAILS = [
    "contact@tradeflowai.in",
    "ks2353013@gmail.com"
  ];

  const PLAN_KEY = "tradeflowSubscriptionPlan";

  const FREE_ALLOWED_PAGES = [
    "dashboard",
    "ai",
    "suppliers",
    "crm",
    "notifications"
  ];

  const PRO_PAGES = [
    "workspaces",
    "employees",
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

  function getPlan() {

    if (isMasterAdmin()) {
      return "Enterprise";
    }

    return (
      localStorage.getItem(PLAN_KEY)
      || "Pro"
    );
  }

  function isProOrAbove() {

    const plan = getPlan();

    return (
      plan === "Pro" ||
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
        "Enterprise"
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
        "Pro"
      );

    }
  }

  function pageRequiredPlan(page) {

    if (isMasterAdmin()) {
      return "Free";
    }

    if (
      FREE_ALLOWED_PAGES.includes(page)
    ) {
      return "Free";
    }

    if (
      PRO_PAGES.includes(page)
    ) {
      return "Pro";
    }

    if (
      ENTERPRISE_PAGES.includes(page)
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