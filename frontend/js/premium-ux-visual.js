/* TradeFlow Premium UX + Visual Intelligence */

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function injectPremiumStyles() {
    if ($("premiumUxVisualStyles")) return;

    const style = document.createElement("style");
    style.id = "premiumUxVisualStyles";
    style.innerHTML = `
      html {
        scroll-behavior: smooth;
      }

      body {
        transition: background .35s ease;
      }

      .sidebar {
        box-shadow: 18px 0 70px rgba(0,0,0,.22);
      }

      .nav-btn {
        position: relative;
        overflow: hidden;
      }

      .nav-btn::after {
        content: "";
        position: absolute;
        inset: 0;
        transform: translateX(-110%);
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent);
        transition: transform .55s ease;
      }

      .nav-btn:hover::after {
        transform: translateX(110%);
      }

      .nav-btn.active-nav {
        background: linear-gradient(135deg, rgba(14,165,233,.42), rgba(139,92,246,.32));
        border-color: rgba(56,189,248,.5);
        color: #fff;
        box-shadow: 0 14px 34px rgba(14,165,233,.16);
      }

      .card,
      .supplier-card,
      .deal,
      .dashboard-hero,
      .topbar {
        transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease, background .22s ease;
      }

      .card:hover,
      .supplier-card:hover {
        transform: translateY(-3px);
        border-color: rgba(56,189,248,.28);
        box-shadow: 0 24px 80px rgba(14,165,233,.10);
      }

      .btn,
      .mini-btn,
      .danger-btn,
      .approve-btn,
      .reject-btn {
        position: relative;
        overflow: hidden;
      }

      .btn::before,
      .mini-btn::before,
      .danger-btn::before,
      .approve-btn::before,
      .reject-btn::before {
        content: "";
        position: absolute;
        top: 0;
        left: -120%;
        width: 80%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.16), transparent);
        transition: left .55s ease;
      }

      .btn:hover::before,
      .mini-btn:hover::before,
      .danger-btn:hover::before,
      .approve-btn:hover::before,
      .reject-btn:hover::before {
        left: 120%;
      }

      .tf-toast-zone {
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 9999;
        display: grid;
        gap: 10px;
        width: min(380px, calc(100vw - 40px));
      }

      .tf-toast {
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(15,23,42,.92);
        border: 1px solid rgba(125,211,252,.22);
        color: #e5e7eb;
        box-shadow: 0 24px 80px rgba(0,0,0,.34);
        backdrop-filter: blur(18px);
        animation: tfToastIn .25s ease both;
        font-size: 13.5px;
        line-height: 1.5;
      }

      @keyframes tfToastIn {
        from { opacity: 0; transform: translateY(12px) scale(.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }

      .tf-floating-ai {
        position: fixed;
        right: 22px;
        bottom: 22px;
        z-index: 9998;
      }

      .tf-floating-ai button {
        width: 58px;
        height: 58px;
        border-radius: 999px;
        border: 1px solid rgba(125,211,252,.32);
        background: linear-gradient(135deg, #0ea5e9, #8b5cf6);
        color: white;
        font-size: 24px;
        box-shadow: 0 24px 70px rgba(14,165,233,.28);
        cursor: pointer;
        animation: tfFloatPulse 2.2s infinite;
      }

      @keyframes tfFloatPulse {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }

      .tf-command-palette {
        position: fixed;
        inset: 0;
        z-index: 10000;
        background: rgba(2,6,23,.68);
        backdrop-filter: blur(12px);
        display: none;
        align-items: flex-start;
        justify-content: center;
        padding: 9vh 18px 18px;
      }

      .tf-command-palette.show {
        display: flex;
      }

      .tf-command-box {
        width: min(760px, 100%);
        border-radius: 28px;
        background: rgba(15,23,42,.96);
        border: 1px solid rgba(125,211,252,.22);
        box-shadow: 0 32px 110px rgba(0,0,0,.48);
        overflow: hidden;
      }

      .tf-command-head {
        padding: 18px;
        border-bottom: 1px solid rgba(148,163,184,.14);
      }

      .tf-command-head input {
        margin: 0;
        font-size: 16px;
      }

      .tf-command-actions {
        padding: 16px;
        display: grid;
        grid-template-columns: repeat(auto-fit,minmax(190px,1fr));
        gap: 10px;
      }

      .tf-command-actions button {
        padding: 13px 14px;
        border-radius: 16px;
        border: 1px solid rgba(148,163,184,.14);
        background: rgba(2,6,23,.62);
        color: #e5e7eb;
        text-align: left;
        font-weight: 900;
        cursor: pointer;
      }

      .tf-command-actions button:hover {
        background: rgba(14,165,233,.18);
        border-color: rgba(56,189,248,.32);
      }

      .tf-page-loader {
        position: fixed;
        inset: 0;
        z-index: 10001;
        background:
          radial-gradient(circle at 20% 10%, rgba(56,189,248,.18), transparent 32%),
          radial-gradient(circle at 80% 20%, rgba(139,92,246,.18), transparent 32%),
          #020617;
        display: grid;
        place-items: center;
        transition: opacity .35s ease, visibility .35s ease;
      }

      .tf-page-loader.hide {
        opacity: 0;
        visibility: hidden;
      }

      .tf-loader-card {
        text-align: center;
        padding: 30px;
        border-radius: 30px;
        background: rgba(15,23,42,.74);
        border: 1px solid rgba(125,211,252,.22);
        box-shadow: 0 30px 100px rgba(0,0,0,.38);
      }

      .tf-loader-orb {
        width: 64px;
        height: 64px;
        border-radius: 999px;
        margin: 0 auto 18px;
        background: conic-gradient(from 0deg, #38bdf8, #8b5cf6, #22c55e, #38bdf8);
        animation: tfSpin 1.1s linear infinite;
      }

      @keyframes tfSpin {
        to { transform: rotate(360deg); }
      }

      .tf-visual-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit,minmax(220px,1fr));
        gap: 14px;
        margin-top: 16px;
      }

      .tf-visual-card {
        padding: 16px;
        border-radius: 22px;
        background: linear-gradient(135deg, rgba(15,23,42,.88), rgba(2,6,23,.64));
        border: 1px solid rgba(148,163,184,.14);
      }

      .tf-bar {
        height: 9px;
        border-radius: 999px;
        background: rgba(148,163,184,.14);
        overflow: hidden;
        margin-top: 10px;
      }

      .tf-bar span {
        display: block;
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #38bdf8, #8b5cf6, #22c55e);
        width: 0;
        transition: width .8s ease;
      }
    `;
    document.head.appendChild(style);
  }

  function createPageLoader() {
    if ($("tfPageLoader")) return;

    const loader = document.createElement("div");
    loader.id = "tfPageLoader";
    loader.className = "tf-page-loader";
    loader.innerHTML = `
      <div class="tf-loader-card">
        <div class="tf-loader-orb"></div>
        <div class="section-title">TradeFlow AI OS</div>
        <p class="muted">Loading enterprise workspace...</p>
      </div>
    `;
    document.body.appendChild(loader);

    setTimeout(() => loader.classList.add("hide"), 650);
    setTimeout(() => loader.remove(), 1100);
  }

  function createToastZone() {
    if ($("tfToastZone")) return;
    const zone = document.createElement("div");
    zone.id = "tfToastZone";
    zone.className = "tf-toast-zone";
    document.body.appendChild(zone);
  }

  function toast(message) {
    createToastZone();
    const zone = $("tfToastZone");
    const item = document.createElement("div");
    item.className = "tf-toast";
    item.innerHTML = message;
    zone.appendChild(item);
    setTimeout(() => item.remove(), 4200);
  }

  function createFloatingAI() {
    if ($("tfFloatingAI")) return;

    const div = document.createElement("div");
    div.id = "tfFloatingAI";
    div.className = "tf-floating-ai";
    div.innerHTML = `<button title="Open TradeFlow AI" onclick="TradeFlowPremiumUX.openCommand()">🤖</button>`;
    document.body.appendChild(div);
  }

  function createCommandPalette() {
    if ($("tfCommandPalette")) return;

    const div = document.createElement("div");
    div.id = "tfCommandPalette";
    div.className = "tf-command-palette";
    div.innerHTML = `
      <div class="tf-command-box">
        <div class="tf-command-head">
          <input id="tfCommandInput" placeholder="TradeFlow command: supplier, crm, ai, outreach, dashboard..." onkeydown="TradeFlowPremiumUX.handleCommandKey(event)">
          <p class="muted" style="margin:10px 0 0;">Press Escape to close. Use quick actions below.</p>
        </div>
        <div class="tf-command-actions">
          <button onclick="TradeFlowPremiumUX.go('dashboard')">📊 Open Dashboard</button>
          <button onclick="TradeFlowPremiumUX.go('ai')">🤖 Open AI Command Center</button>
          <button onclick="TradeFlowPremiumUX.go('suppliers')">🌍 Open Suppliers</button>
          <button onclick="TradeFlowPremiumUX.go('crm')">📈 Open CRM</button>
          <button onclick="TradeFlowPremiumUX.go('outreach')">📧 Open Outreach</button>
          <button onclick="TradeFlowPremiumUX.go('analytics')">📉 Open Analytics</button>
          <button onclick="TradeFlowPremiumUX.go('documents')">📄 Open Documents</button>
          <button onclick="TradeFlowPremiumUX.closeCommand()">✖ Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(div);

    div.addEventListener("click", (event) => {
      if (event.target === div) closeCommand();
    });
  }

  function openCommand() {
    const palette = $("tfCommandPalette");
    if (!palette) return;
    palette.classList.add("show");
    setTimeout(() => $("tfCommandInput")?.focus(), 60);
  }

  function closeCommand() {
    $("tfCommandPalette")?.classList.remove("show");
  }

  function handleCommandKey(event) {
    if (event.key === "Escape") {
      closeCommand();
      return;
    }

    if (event.key !== "Enter") return;

    const value = (event.target.value || "").toLowerCase();

    if (value.includes("supplier")) go("suppliers");
    else if (value.includes("crm") || value.includes("deal")) go("crm");
    else if (value.includes("ai") || value.includes("chat")) go("ai");
    else if (value.includes("outreach") || value.includes("email") || value.includes("whatsapp")) go("outreach");
    else if (value.includes("analytics")) go("analytics");
    else if (value.includes("document") || value.includes("invoice")) go("documents");
    else go("dashboard");
  }

  function go(page) {
    if (typeof showPage === "function") {
      showPage(page);
      setActiveNav(page);
      closeCommand();
      toast(`Opened <b>${page}</b> workspace.`);
    }
  }

  function setActiveNav(page) {
    const buttons = document.querySelectorAll(".nav-btn");
    buttons.forEach(btn => btn.classList.remove("active-nav"));

    buttons.forEach(btn => {
      const text = (btn.getAttribute("onclick") || "").toLowerCase();
      if (text.includes(`'${page}'`) || text.includes(`"${page}"`)) {
        btn.classList.add("active-nav");
      }
    });
  }

  function patchNavButtons() {
    document.querySelectorAll(".nav-btn").forEach(btn => {
      if (btn.dataset.premiumBound) return;
      btn.dataset.premiumBound = "true";
      btn.addEventListener("click", () => {
        const text = (btn.getAttribute("onclick") || "").toLowerCase();
        const match = text.match(/showpage\(['"]([^'"]+)['"]\)/);
        if (match && match[1]) setActiveNav(match[1]);
      });
    });
  }

  function addVisualIntelligencePanel() {
    const dashboard = $("dashboardPage");
    if (!dashboard || $("tfVisualIntelligencePanel")) return;

    const panel = document.createElement("div");
    panel.id = "tfVisualIntelligencePanel";
    panel.className = "card ai-panel";
    panel.innerHTML = `
      <div class="section-title">📊 Visual Intelligence Snapshot</div>
      <p class="muted">Premium visual indicators for operational clarity.</p>

      <div class="tf-visual-grid">
        <div class="tf-visual-card">
          <b>Supplier Readiness</b>
          <div class="tf-bar"><span id="tfSupplierBar"></span></div>
          <p class="muted" id="tfSupplierText">Calculating...</p>
        </div>

        <div class="tf-visual-card">
          <b>CRM Momentum</b>
          <div class="tf-bar"><span id="tfCrmBar"></span></div>
          <p class="muted" id="tfCrmText">Calculating...</p>
        </div>

        <div class="tf-visual-card">
          <b>Pipeline Health</b>
          <div class="tf-bar"><span id="tfPipelineBar"></span></div>
          <p class="muted" id="tfPipelineText">Calculating...</p>
        </div>

        <div class="tf-visual-card">
          <b>Alert Hygiene</b>
          <div class="tf-bar"><span id="tfAlertBar"></span></div>
          <p class="muted" id="tfAlertText">Calculating...</p>
        </div>
      </div>
    `;

    dashboard.appendChild(panel);
    updateVisualBars();
  }

  function readNumber(id) {
    const el = $(id);
    if (!el) return 0;
    return Number((el.innerText || "0").replace(/[^\d.-]/g, "")) || 0;
  }

  function setBar(barId, textId, percent, text) {
    const bar = $(barId);
    const label = $(textId);
    if (bar) setTimeout(() => bar.style.width = `${Math.max(5, Math.min(percent, 100))}%`, 80);
    if (label) label.innerText = text;
  }

  function updateVisualBars() {
    const suppliers = readNumber("supplierCount");
    const deals = readNumber("dashboardDealCount");
    const pipeline = readNumber("dashboardPipelineValue");
    const alerts = readNumber("dashboardUnreadNotifications");

    const supplierScore = suppliers === 0 ? 12 : Math.min(100, 35 + suppliers * 10);
    const crmScore = deals === 0 ? 10 : Math.min(100, 30 + deals * 12);
    const pipelineScore = pipeline === 0 ? 10 : Math.min(100, 40 + Math.log10(pipeline + 1) * 18);
    const alertScore = alerts === 0 ? 92 : Math.max(20, 90 - alerts * 15);

    setBar("tfSupplierBar", "tfSupplierText", supplierScore, `${supplierScore.toFixed(0)}% supplier readiness`);
    setBar("tfCrmBar", "tfCrmText", crmScore, `${crmScore.toFixed(0)}% CRM momentum`);
    setBar("tfPipelineBar", "tfPipelineText", pipelineScore, `${pipelineScore.toFixed(0)}% pipeline health`);
    setBar("tfAlertBar", "tfAlertText", alertScore, `${alertScore.toFixed(0)}% alert hygiene`);
  }

  function observeMetricChanges() {
    ["supplierCount", "dashboardDealCount", "dashboardPipelineValue", "dashboardUnreadNotifications"].forEach(id => {
      const el = $(id);
      if (!el || el.dataset.visualObserver) return;
      el.dataset.visualObserver = "true";

      const obs = new MutationObserver(updateVisualBars);
      obs.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  function bindKeyboardShortcuts() {
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openCommand();
      }

      if (event.key === "Escape") {
        closeCommand();
      }
    });
  }

  function boot() {
    injectPremiumStyles();
    createPageLoader();
    createToastZone();
    createCommandPalette();
    createFloatingAI();
    patchNavButtons();
    addVisualIntelligencePanel();
    observeMetricChanges();
    bindKeyboardShortcuts();

    setTimeout(() => {
      setActiveNav("dashboard");
      updateVisualBars();
      toast("TradeFlow Premium UX layer is active.");
    }, 900);

    setInterval(() => {
      patchNavButtons();
      observeMetricChanges();
      updateVisualBars();
    }, 3000);
  }

  window.TradeFlowPremiumUX = {
    openCommand,
    closeCommand,
    handleCommandKey,
    go,
    toast,
    updateVisualBars
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
