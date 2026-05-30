/* TradeFlow Business-Type Engine V2 Locked
   Business type is chosen during onboarding and locked after first save.
*/

(function () {
  if (window.TradeFlowBusinessTypeEngineV2) return;

  const OWNER_EMAILS = [
    "ks2353013@gmail.com",
    "contact@tradeflowai.in"
  ];

  const BUSINESS_TYPES = {
    Supplier: {
      title: "Supplier Growth Workspace",
      subtitle: "Buyer leads, RFQs, export CRM, outreach and documents.",
      kpis: [["Buyer Leads","48"],["RFQs","16"],["Export Deals","9"],["Follow-ups","12"]],
      modules: ["Buyer Discovery","Export CRM","Quotations","Outreach","Export Documents"],
      aiFocus: "Find buyers, generate quotations, follow up leads and move export deals forward."
    },
    Manufacturer: {
      title: "Manufacturer Export Workspace",
      subtitle: "Factory profile, production capacity, buyer discovery and export orders.",
      kpis: [["Capacity","Ready"],["Export Orders","11"],["Product Lines","8"],["Buyer Leads","36"]],
      modules: ["Factory Profile","Production Capacity","Export Orders","Certifications","Buyer Discovery"],
      aiFocus: "Promote factory capacity, prepare export offers and find distributors or buyers."
    },
    Buyer: {
      title: "Buyer Sourcing Workspace",
      subtitle: "Supplier search, RFQs, vendor comparison, quote analysis and negotiation.",
      kpis: [["Verified Suppliers","64"],["RFQs Sent","22"],["Quotes Received","14"],["Negotiations","7"]],
      modules: ["Supplier Discovery","RFQ Center","Vendor Comparison","Quote Analysis","Negotiation"],
      aiFocus: "Find suppliers, compare quotations, analyze risks and negotiate better sourcing terms."
    },
    "Trading Company": {
      title: "Global Trade Command Center",
      subtitle: "Supplier discovery, buyer discovery, CRM, negotiation, outreach and documents.",
      kpis: [["Supplier Leads","72"],["Buyer Leads","58"],["CRM Deals","24"],["Pipeline Value","₹12.5L"]],
      modules: ["Supplier Discovery","Buyer Discovery","CRM Pipeline","Negotiation Desk","Outreach","Trade Documents"],
      aiFocus: "Manage both supplier and buyer sides with CRM, outreach, negotiation and documentation."
    },
    "Buying House": {
      title: "Vendor Verification Workspace",
      subtitle: "Supplier verification, vendor audits, inspection reports and buyer requirements.",
      kpis: [["Verified Vendors","39"],["Audits","8"],["Inspection Requests","6"],["Approved Suppliers","21"]],
      modules: ["Supplier Verification","Vendor Audits","Inspection Reports","Buyer Requirements","Quality Control"],
      aiFocus: "Verify vendors, manage audits, coordinate inspections and reduce sourcing risk."
    }
  };

  function $(id) {
    return document.getElementById(id);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowUser") || "null");
    } catch {
      return null;
    }
  }

  function saveUser(user) {
    if (!user) return;
    localStorage.setItem("tradeflowUser", JSON.stringify(user));
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("currentUser", JSON.stringify(user));
  }

  function getToken() {
    return (
      localStorage.getItem("tradeflowToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      ""
    );
  }

  function requireLogin() {
    if (!getUser() || !getToken()) {
      localStorage.clear();
      window.location.href = "/login";
      return false;
    }
    return true;
  }

  function isOwner() {
    const email = String(getUser()?.email || "").toLowerCase().trim();
    return OWNER_EMAILS.includes(email);
  }

  function getBusinessType() {
    return (
      localStorage.getItem("tradeflowBusinessType") ||
      getUser()?.businessType ||
      "Trading Company"
    );
  }

  function isBusinessTypeLocked() {
    return localStorage.getItem("tradeflowBusinessTypeLocked") === "true";
  }

  function getConfig() {
    return BUSINESS_TYPES[getBusinessType()] || BUSINESS_TYPES["Trading Company"];
  }

  function lockBusinessType(type) {
    if (!BUSINESS_TYPES[type]) return;

    localStorage.setItem("tradeflowBusinessType", type);
    localStorage.setItem("tradeflowBusinessTypeLocked", "true");

    const user = getUser();
    if (user) {
      user.businessType = type;
      user.businessTypeLocked = true;
      saveUser(user);
    }

    render();
  }

  function requestBusinessTypeChange() {
    alert(
      "Business Type is locked for this company. To change it, contact TradeFlow support or Master Admin approval."
    );
  }

  function ownerUnlockBusinessType() {
    if (!isOwner()) {
      requestBusinessTypeChange();
      return;
    }

    const confirmUnlock = confirm(
      "Master Admin only: unlock business type for this account?"
    );

    if (!confirmUnlock) return;

    localStorage.removeItem("tradeflowBusinessTypeLocked");

    const user = getUser();
    if (user) {
      user.businessTypeLocked = false;
      saveUser(user);
    }

    alert("Business Type unlocked by Master Admin.");
    render();
  }

  function saveBusinessType(type) {
    if (!BUSINESS_TYPES[type]) return;

    if (isBusinessTypeLocked() && !isOwner()) {
      requestBusinessTypeChange();
      render();
      return;
    }

    lockBusinessType(type);
  }

  function renderPanel() {
    const dashboard = $("dashboardPage");
    if (!dashboard) return;

    const config = getConfig();
    const type = getBusinessType();
    const locked = isBusinessTypeLocked();

    let panel = $("businessTypeV2Panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "businessTypeV2Panel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";
      dashboard.prepend(panel);
    }

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <div class="section-title">🚀 Business-Type Engine V2</div>
          <h2 style="font-size:30px;font-weight:900;color:white;margin:6px 0;">
            ${config.title}
          </h2>
          <p class="muted" style="max-width:820px;">
            ${config.subtitle}
          </p>
          <div style="margin-top:10px;font-weight:900;color:${locked ? "#22c55e" : "#facc15"};">
            ${locked ? "🔒 Business Type Locked" : "⚠ Business Type Not Locked Yet"}
          </div>
        </div>

        <div>
          <select id="businessTypeV2Select" style="max-width:240px;" ${locked && !isOwner() ? "disabled" : ""}>
            ${Object.keys(BUSINESS_TYPES).map(item => `
              <option value="${item}" ${item === type ? "selected" : ""}>
                ${item}
              </option>
            `).join("")}
          </select>

          <button class="btn" style="margin-top:10px;" onclick="TradeFlowBusinessTypeEngineV2.requestChange()">
            Request Change
          </button>

          ${isOwner() ? `
            <button class="btn" style="margin-top:10px;background:#7c3aed;" onclick="TradeFlowBusinessTypeEngineV2.ownerUnlock()">
              Master Unlock
            </button>
          ` : ""}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-top:18px;">
        ${config.kpis.map(([label, value]) => `
          <div style="padding:16px;border-radius:18px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.16);">
            <div style="color:#94a3b8;font-size:13px;font-weight:800;">${label}</div>
            <div style="font-size:28px;font-weight:900;color:white;margin-top:6px;">${value}</div>
          </div>
        `).join("")}
      </div>

      <div style="margin-top:18px;">
        <div style="font-weight:900;color:white;margin-bottom:8px;">Priority modules:</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${config.modules.map(module => `
            <span style="display:inline-flex;padding:8px 11px;border-radius:999px;background:rgba(14,165,233,.14);border:1px solid rgba(125,211,252,.25);color:#7dd3fc;font-size:12px;font-weight:900;">
              ${module}
            </span>
          `).join("")}
        </div>
      </div>

      <div style="margin-top:18px;padding:14px;border-radius:18px;background:rgba(124,58,237,.14);border:1px solid rgba(196,181,253,.22);">
        <b style="color:white;">AI Focus:</b>
        <span class="muted">${config.aiFocus}</span>
      </div>
    `;

    const selector = $("businessTypeV2Select");
    if (selector) {
      selector.onchange = function () {
        saveBusinessType(this.value);
      };
    }
  }

  function updateWorkspaceLabels() {
    const config = getConfig();
    const user = getUser();

    const workspaceName = $("workspaceName");
    const userBadge = $("userBadge");

    if (workspaceName) {
      workspaceName.innerText = `${config.title} • ${user?.name || "User"}`;
    }

    if (userBadge) {
      userBadge.innerText = `${getBusinessType()} • ${user?.role || "User"}`;
    }
  }

  function updateAIConsole() {
    const box = $("tradeflowAiConsole");
    if (!box) return;

    const config = getConfig();

    if (!box.value || box.value.includes("TradeFlow AI Copilot ready")) {
      box.value = `TradeFlow AI Copilot ready for ${getBusinessType()}.

AI Focus:
${config.aiFocus}

Recommended actions:
1. Open your priority module.
2. Add or discover leads.
3. Move serious opportunities into CRM.
4. Use outreach automation.
5. Track performance in analytics.`;
    }
  }

  function render() {
    if (!requireLogin()) return;

    renderPanel();
    updateWorkspaceLabels();
    updateAIConsole();
  }

  function boot() {
    if (!requireLogin()) return;

    if (!localStorage.getItem("tradeflowBusinessType")) {
      localStorage.setItem("tradeflowBusinessType", "Trading Company");
    }

    setTimeout(render, 700);

    document.addEventListener("tradeflow:page-change", function () {
      setTimeout(render, 150);
    });

    console.log("✅ TradeFlow Business-Type Engine V2 locked active");
  }

  window.TradeFlowBusinessTypeEngineV2 = {
    getBusinessType,
    getConfig,
    saveBusinessType,
    lockBusinessType,
    requestChange: requestBusinessTypeChange,
    ownerUnlock: ownerUnlockBusinessType,
    render
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();