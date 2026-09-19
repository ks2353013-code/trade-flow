/* TradeFlow Government Trade Gateway */
(function () {
  if (window.TradeFlowGovernmentGateway) return;

  function apiBase() {
    return window.TRADEFLOW_API_BASE || window.TRADEFLOW_API_BASE_URL || window.BACKEND_URL ||
      (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
        ? window.location.origin
        : "https://trade-flow-lc1k.onrender.com");
  }

  function backendBase() {
    return window.TRADEFLOW_API_BASE || window.TRADEFLOW_API_BASE_URL || window.BACKEND_URL ||
      (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
        ? window.location.origin
        : "https://trade-flow-lc1k.onrender.com");
  }

  function token() {
    try {
      const user = JSON.parse(localStorage.getItem("tradeflowUser") || "null");
      return user?.token || user?.accessToken || localStorage.getItem("tradeflowAccessToken") || "";
    } catch {
      return localStorage.getItem("tradeflowAccessToken") || "";
    }
  }

  function workspaceId() {
    return window.TradeFlowWorkspace?.getActiveWorkspaceId?.() || "";
  }

  function headers() {
    const value = { "Content-Type": "application/json", Authorization: token() ? `Bearer ${token()}` : "" };
    if (workspaceId()) value["x-workspace-id"] = workspaceId();
    return value;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  async function request(path, options = {}) {
    const response = await fetch(`${apiBase()}${path}`, {
      credentials: "include",
      ...options,
      headers: { ...headers(), ...(options.headers || {}) }
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || "Government Gateway request failed");
    return data;
  }

  function notify(message) {
    const panel = document.getElementById("governmentGatewayNotice");
    if (panel) panel.innerHTML = `<div class="deal">${escapeHtml(message)}</div>`;
  }

  function renderStatus(status) {
    const target = document.getElementById("governmentGatewayStatus");
    if (!target) return;
    target.innerHTML =
      `<div class="stats-grid"><div class="stat"><div class="stat-number">${status.systems || 0}</div><div class="stat-label">Official systems</div></div>` +
      `<div class="stat"><div class="stat-number">${status.actions || 0}</div><div class="stat-label">Workflow actions</div></div>` +
      `<div class="stat"><div class="stat-number">${status.completed || 0}</div><div class="stat-label">Completed</div></div>` +
      `<div class="stat"><div class="stat-number">${status.readinessPercent || 0}%</div><div class="stat-label">Readiness</div></div></div>`;
  }

  function renderConnections(connections) {
    const target = document.getElementById("governmentGatewayConnections");
    if (!target) return;

    target.innerHTML = connections.map((connection) => {
      const actions = Array.isArray(connection.actions) ? connection.actions : [];
      const completed = actions.filter((action) => action.status === "completed").length;

      return `<div class="supplier-card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
          <div><h3 style="font-size:18px;font-weight:900;">${escapeHtml(connection.displayName)}</h3>
          <p class="muted">${escapeHtml(connection.connectionMode.replaceAll("_", " "))} • ${completed}/${actions.length} actions complete</p></div>
          <a class="mini-btn" href="${escapeHtml(connection.officialUrl)}" target="_blank" rel="noopener noreferrer">Official portal ↗</a>
        </div>
        <div style="margin-top:12px;display:grid;gap:8px;">
          ${actions.map((action) => `<div class="deal" style="padding:10px 12px;">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
              <div><strong>${escapeHtml(action.title)}</strong><div class="muted">${escapeHtml(action.description)}</div></div>
              <select onchange="TradeFlowGovernmentGateway.updateAction('${escapeHtml(connection.systemKey)}','${escapeHtml(action.actionKey)}',this.value)">
                ${["not_started","ready","in_progress","submitted","completed","blocked","manual_required"].map((value) =>
                  `<option value="${value}" ${value === action.status ? "selected" : ""}>${value.replaceAll("_"," ")}</option>`
                ).join("")}
              </select>
            </div>
          </div>`).join("")}
        </div>
      </div>`;
    }).join("");
  }

  async function refresh() {
    if (!workspaceId()) { notify("Select or create a workspace before using Government Trade Gateway."); return; }
    try {
      const [connectionsResponse, statusResponse] = await Promise.all([
        request("/api/government-gateway/connections"),
        request("/api/government-gateway/status")
      ]);
      renderConnections(connectionsResponse.connections || []);
      renderStatus(statusResponse.status || {});
      notify("Government Gateway synchronized with this workspace.");
    } catch (error) { notify(error.message); }
  }

  async function createMissionPlan() {
    const product = document.getElementById("governmentGatewayProduct")?.value.trim();
    const country = document.getElementById("governmentGatewayCountry")?.value.trim();
    const direction = document.getElementById("governmentGatewayDirection")?.value || "Export";
    if (!product || !country) { notify("Enter both a product and target country."); return; }

    try {
      const response = await request("/api/government-gateway/mission-plan", {
        method: "POST",
        body: JSON.stringify({ product, country, direction })
      });
      window.TradeFlowGovernmentGateway.lastPlan = response.plan;
      const box = document.getElementById("governmentGatewayPlan");
      if (box) {
        box.innerHTML = `<div class="deal" style="margin-top:14px;"><strong>${response.plan.summary.totalSystems} official systems</strong><span class="muted"> • ${response.plan.summary.totalActions} actions</span></div>`;
      }
      notify("Government execution checklist created. Official submissions remain under the relevant government system.");
    } catch (error) { notify(error.message); }
  }

  async function updateAction(systemKey, actionKey, status) {
    try {
      await request(`/api/government-gateway/connections/${encodeURIComponent(systemKey)}/actions/${encodeURIComponent(actionKey)}/status`, {
        method: "POST",
        body: JSON.stringify({ status })
      });
      await refresh();
    } catch (error) { notify(error.message); }
  }


  async function prepareExporterOS() {
    const payload = {
      company: {
        legalName: document.getElementById("exporterOsLegalName")?.value.trim() || "",
        gstin: document.getElementById("exporterOsGstin")?.value.trim() || "",
        pan: document.getElementById("exporterOsPan")?.value.trim() || "",
        iec: document.getElementById("exporterOsIec")?.value.trim() || ""
      },
      products: [{
        name: document.getElementById("exporterOsProduct")?.value.trim() || "",
        hsCode: document.getElementById("exporterOsHsCode")?.value.trim() || "",
        origin: "India"
      }],
      targetMarkets: [{
        country: document.getElementById("exporterOsCountry")?.value.trim() || ""
      }]
    };

    if (!payload.company.legalName || !payload.products[0].name || !payload.targetMarkets[0].country) {
      notify("Legal name, product and target country are required.");
      return;
    }

    try {
      await request("/api/exporter-os/profile", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      const response = await request("/api/exporter-os/prepare", {
        method: "POST",
        body: JSON.stringify({})
      });

      const profile = response.profile || {};
      const readiness = profile.readiness || {};
      const target = document.getElementById("exporterOsReadiness");

      if (target) {
        target.innerHTML = `
          <div class="deal">
            <strong>TradeFlow readiness: ${Number(readiness.score || 0)}%</strong>
            <span class="muted"> • ${escapeHtml(readiness.status || "setup_required")}</span>
          </div>
          <div class="grid-2" style="margin-top:10px;">
            <div class="deal"><strong>Blockers</strong><div class="muted">${(readiness.blockers || []).slice(0,8).map(escapeHtml).join("<br>") || "No current blockers."}</div></div>
            <div class="deal"><strong>Next actions</strong><div class="muted">${(readiness.nextActions || []).slice(0,8).map(escapeHtml).join("<br>") || "No immediate setup actions."}</div></div>
          </div>
        `;
      }

      notify("TradeFlow prepared the exporter operating plan and government workflow map.");
      await refresh();
    } catch (error) {
      notify(error.message);
    }
  }

  window.TradeFlowGovernmentGateway = { refresh, createMissionPlan, updateAction, prepareExporterOS };
  document.addEventListener("tradeflow:bootstrap-complete", () => setTimeout(refresh, 900));
})();


/* =========================================================
   TRADEFLOW SIMPLE USER EXPERIENCE SHELL
   Keeps the full feature engine intact while presenting a
   simple app-like experience. Advanced capabilities remain
   available from Features and are never required.
========================================================= */
(function () {
  function esc(value) {
    return String(value || "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function go(page) {
    if (typeof window.showPage === "function") window.showPage(page);
    closeFeatures();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const featureGroups = [
    {
      title: "Sales & Buyers",
      icon: "🤝",
      items: [
        ["Find Buyers", "buyerDiscoveryPage", "Find and qualify international buyers"],
        ["CRM", "crmPage", "Manage buyers, leads and deals"],
        ["Negotiation", "negotiationPage", "Work through offers and terms"],
        ["Follow-ups", "tasksPage", "Keep every opportunity moving"]
      ]
    },
    {
      title: "Outreach",
      icon: "📨",
      items: [
        ["Smart Outreach", "outreachPage", "Create and manage buyer outreach"],
        ["Email Automation", "outreachPage", "Automate follow-ups when you want"],
        ["AI Writer", "aiPage", "Create business messages with AI"]
      ]
    },
    {
      title: "Trade Intelligence",
      icon: "🧠",
      items: [
        ["Market Research", "aiPage", "Research markets, products and countries"],
        ["Supplier Intelligence", "suppliersPage", "Find and manage suppliers"],
        ["Trade Risk", "aiPage", "Review trade risks before acting"],
        ["Analytics", "analyticsPage", "Understand your business activity"]
      ]
    },
    {
      title: "Compliance & Government",
      icon: "🏛️",
      items: [
        ["Government Tasks", "governmentGatewayPage", "Prepare and track official work"],
        ["Compliance", "documentsPage", "Keep requirements and documents organized"],
        ["Export Documents", "documentsPage", "Prepare and manage trade documents"]
      ]
    },
    {
      title: "Operations",
      icon: "⚙️",
      items: [
        ["Task Automation", "tasksPage", "Automate routine work"],
        ["Logistics & Shipment", "documentsPage", "Keep execution information together"],
        ["Revenue", "analyticsPage", "Track commercial progress"],
        ["Marketing", "marketingPage", "Manage trade marketing"]
      ]
    },
    {
      title: "Workspace",
      icon: "🏢",
      items: [
        ["Team & Roles", "employeesPage", "Manage people and permissions"],
        ["Companies", "workspacesPage", "Switch and manage workspaces"],
        ["Notifications", "notificationsPage", "See important updates"]
      ]
    }
  ];

  function featureMarkup() {
    return featureGroups.map(group => `
      <section class="tf-feature-group">
        <div class="tf-feature-group-title"><span>${group.icon}</span>${esc(group.title)}</div>
        <div class="tf-feature-grid">
          ${group.items.map(([label, page, description]) => `
            <button class="tf-feature-card" data-tf-page="${esc(page)}">
              <span class="tf-feature-name">${esc(label)}</span>
              <span class="tf-feature-description">${esc(description)}</span>
              <span class="tf-feature-arrow">→</span>
            </button>
          `).join("")}
        </div>
      </section>
    `).join("");
  }

  function closeFeatures() {
    document.getElementById("tfFeaturesPanel")?.classList.remove("is-open");
    document.getElementById("tfFeaturesBackdrop")?.classList.remove("is-open");
    document.body.classList.remove("tf-features-open");
  }

  function openFeatures() {
    document.getElementById("tfFeaturesPanel")?.classList.add("is-open");
    document.getElementById("tfFeaturesBackdrop")?.classList.add("is-open");
    document.body.classList.add("tf-features-open");
  }

  function injectStyle() {
    if (document.getElementById("tradeflow-simple-ux-style")) return;
    const style = document.createElement("style");
    style.id = "tradeflow-simple-ux-style";
    style.textContent = `
      .sidebar{display:none!important}
      .main{margin-left:0!important;width:100%!important;max-width:none!important}
      .topbar{position:sticky!important;top:0!important;z-index:900!important;background:rgba(2,6,23,.92)!important;backdrop-filter:blur(18px)!important}
      .tf-nav{position:sticky;top:78px;z-index:850;display:flex;align-items:center;gap:8px;padding:10px 18px;margin:0 0 18px;background:rgba(2,6,23,.86);backdrop-filter:blur(18px);border-bottom:1px solid rgba(255,255,255,.08)}
      .tf-brand{font-weight:900;font-size:19px;letter-spacing:-.03em;margin-right:auto;color:#fff}
      .tf-brand small{display:block;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;opacity:.55;margin-top:2px}
      .tf-nav-btn{border:0;background:transparent;color:rgba(255,255,255,.72);padding:10px 13px;border-radius:11px;cursor:pointer;font:inherit;font-weight:700}
      .tf-nav-btn:hover,.tf-nav-btn.active{background:rgba(255,255,255,.08);color:#fff}
      .tf-primary{background:#fff!important;color:#111827!important}
      .tf-features-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.52);z-index:1990;opacity:0;pointer-events:none;transition:opacity .2s}
      .tf-features-backdrop.is-open{opacity:1;pointer-events:auto}
      .tf-features-panel{position:fixed;top:0;right:0;height:100vh;width:min(760px,96vw);background:#07101f;color:#fff;z-index:2000;transform:translateX(102%);transition:transform .25s ease;box-shadow:-24px 0 70px rgba(0,0,0,.38);overflow:auto;padding:28px}
      .tf-features-panel.is-open{transform:translateX(0)}
      .tf-features-head{display:flex;align-items:flex-start;gap:16px;margin-bottom:24px}
      .tf-features-head h2{font-size:30px;margin:0 0 5px;font-weight:900;letter-spacing:-.04em}
      .tf-features-head p{margin:0;color:rgba(255,255,255,.62)}
      .tf-close{margin-left:auto;border:0;background:rgba(255,255,255,.08);color:#fff;border-radius:12px;padding:10px 13px;cursor:pointer;font-size:18px}
      .tf-feature-group{margin:0 0 26px}
      .tf-feature-group-title{display:flex;gap:9px;align-items:center;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:rgba(255,255,255,.55);margin-bottom:10px}
      .tf-feature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      .tf-feature-card{position:relative;text-align:left;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.045);color:#fff;border-radius:15px;padding:15px 42px 15px 15px;cursor:pointer;min-height:88px}
      .tf-feature-card:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.16)}
      .tf-feature-name{display:block;font-weight:850;font-size:15px;margin-bottom:5px}
      .tf-feature-description{display:block;color:rgba(255,255,255,.55);font-size:12px;line-height:1.45}
      .tf-feature-arrow{position:absolute;right:14px;top:50%;transform:translateY(-50%);opacity:.55}
      .tf-welcome{margin-bottom:18px}
      .tf-welcome h1{font-size:clamp(28px,4vw,48px)!important;letter-spacing:-.05em!important}
      .tf-quick-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:16px 0 22px}
      .tf-quick-card{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);border-radius:16px;padding:17px;text-align:left;cursor:pointer;color:inherit}
      .tf-quick-card:hover{background:rgba(255,255,255,.065);transform:translateY(-1px)}
      .tf-mission-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0 24px}.tf-mission-card{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);border-radius:16px;padding:16px}.tf-mission-card h3{margin:0 0 6px;font-size:16px}.tf-mission-meta{font-size:12px;opacity:.55}.tf-mission-bar{height:6px;background:rgba(255,255,255,.08);border-radius:9px;overflow:hidden;margin:12px 0}.tf-mission-bar i{display:block;height:100%;background:#fff;border-radius:9px}.tf-mission-actions{font-size:12px;line-height:1.6;color:rgba(255,255,255,.68)}.tf-mission-insight{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);font-size:12px;line-height:1.55;color:rgba(255,255,255,.72)}.tf-mission-action-btn{margin-top:9px;border:0;border-radius:9px;padding:8px 10px;background:#fff;color:#111827;font-weight:800;cursor:pointer}
      .tf-mission-modal{position:fixed;inset:0;z-index:2100;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.62);padding:20px}.tf-mission-modal.open{display:flex}.tf-mission-box{width:min(680px,100%);background:#07101f;color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:26px;box-shadow:0 30px 100px rgba(0,0,0,.45)}.tf-mission-box h2{margin:0 0 8px;font-size:28px}.tf-mission-box p{margin:0 0 18px;color:rgba(255,255,255,.58)}.tf-mission-box textarea{width:100%;min-height:110px;resize:vertical;box-sizing:border-box;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;border-radius:14px;padding:14px;font:inherit}.tf-mission-box .row{display:flex;justify-content:flex-end;gap:10px;margin-top:14px}.tf-mission-box button{border:0;border-radius:12px;padding:11px 16px;cursor:pointer;font-weight:800}.tf-mission-cancel{background:rgba(255,255,255,.08);color:#fff}.tf-mission-run{background:#fff;color:#111827}
      @media(max-width:900px){.tf-mission-list{grid-template-columns:1fr}}
      .tf-quick-card strong{display:block;margin-top:8px}
      .tf-quick-card span{display:block;font-size:12px;opacity:.55;margin-top:4px}
      .tf-simple-hint{font-size:12px;color:rgba(255,255,255,.48);margin-top:6px}
      @media(max-width:900px){.tf-nav{top:65px;overflow-x:auto}.tf-nav-btn{white-space:nowrap}.tf-quick-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.tf-feature-panel{width:100vw}}
      @media(max-width:560px){.tf-nav{padding:8px 10px}.tf-brand{display:none}.tf-quick-grid,.tf-feature-grid{grid-template-columns:1fr}.tf-features-panel{padding:20px}.tf-features-head h2{font-size:25px}}
    `;
    document.head.appendChild(style);
  }

  function buildShell() {
    if (document.getElementById("tfSimpleNav")) return;

    injectStyle();

    const nav = document.createElement("div");
    nav.id = "tfSimpleNav";
    nav.className = "tf-nav";
    nav.innerHTML = `
      <div class="tf-brand">TradeFlow<small>Global Trade, made simple</small></div>
      <button class="tf-nav-btn active" data-tf-nav="home">Home</button>
      <button class="tf-nav-btn" data-tf-nav="missions">My Work</button>
      <button class="tf-nav-btn" data-tf-nav="features">Features</button>
      <button class="tf-nav-btn" data-tf-nav="messages">Messages</button>
      <button class="tf-nav-btn" data-tf-nav="documents">Documents</button>
      <button class="tf-nav-btn tf-primary" data-tf-nav="start">+ Start New</button>
    `;

    const topbar = document.querySelector(".topbar");
    topbar?.after(nav);

    const backdrop = document.createElement("div");
    backdrop.id = "tfFeaturesBackdrop";
    backdrop.className = "tf-features-backdrop";
    backdrop.addEventListener("click", closeFeatures);
    document.body.appendChild(backdrop);

    const panel = document.createElement("aside");
    panel.id = "tfFeaturesPanel";
    panel.className = "tf-features-panel";
    panel.innerHTML = `
      <div class="tf-features-head">
        <div><h2>Features</h2><p>Powerful tools, available when you need them.</p></div>
        <button class="tf-close" aria-label="Close features">×</button>
      </div>
      <div>${featureMarkup()}</div>
    `;
    panel.querySelector(".tf-close").addEventListener("click", closeFeatures);
    panel.querySelectorAll("[data-tf-page]").forEach(button => {
      button.addEventListener("click", () => go(button.dataset.tfPage));
    });
    document.body.appendChild(panel);

    nav.querySelectorAll("[data-tf-nav]").forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.tfNav;
        nav.querySelectorAll(".tf-nav-btn").forEach(b => b.classList.remove("active"));
        button.classList.add("active");
        if (action === "features") return openFeatures();
        if (action === "home") return go("dashboardPage");
        if (action === "missions") return go("dashboardPage");
        if (action === "messages") return go("outreachPage");
        if (action === "documents") return go("documentsPage");
        if (action === "start") return startMission();
      });
    });

    simplifyDashboard();
    injectMissionComposer();
    refreshMissionCards();
  }

  function injectMissionComposer() {
    if (document.getElementById("tfMissionComposer")) return;
    const modal = document.createElement("div");
    modal.id = "tfMissionComposer";
    modal.className = "tf-mission-modal";
    modal.innerHTML = '<div class="tf-mission-box"><h2>What are you trying to accomplish?</h2><p>Tell TradeFlow the outcome you want. We will build the workflow behind the scenes.</p><textarea id="tfMissionGoal" placeholder="Example: I want to export Basmati Rice from India to UAE"></textarea><div class="row"><button class="tf-mission-cancel">Cancel</button><button class="tf-mission-run">Start Mission →</button></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener("click", e => { if (e.target === modal) modal.classList.remove("open"); });
    modal.querySelector(".tf-mission-cancel").onclick = () => modal.classList.remove("open");
    modal.querySelector(".tf-mission-run").onclick = async () => {
      const goal = modal.querySelector("#tfMissionGoal").value.trim();
      if (!goal) return;
      modal.classList.remove("open");
      await createUserMission(goal);
    };
  }

  function openMissionComposer(prefill = "") {
    const modal = document.getElementById("tfMissionComposer");
    if (!modal) return;
    const input = modal.querySelector("#tfMissionGoal");
    input.value = prefill;
    modal.classList.add("open");
    setTimeout(() => input.focus(), 50);
  }

  async function createUserMission(goal) {
    const tokenValue = token();
    const workspace = window.TradeFlowWorkspace?.getActiveWorkspaceId?.() || "";
    if (!tokenValue || !workspace) {
      go("governmentGatewayPage");
      return;
    }
    try {
      const data = await fetch(`${backendBase()}/api/missions`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${tokenValue}`, "x-workspace-id":workspace },
        body: JSON.stringify({ goal })
      }).then(async r => { const d=await r.json(); if(!r.ok||!d.success) throw new Error(d.message||"Could not start mission."); return d; });
      go("dashboardPage");
      setTimeout(() => { refreshMissionCards(); notify?.("TradeFlow has started your mission."); }, 150);
      return data;
    } catch (e) {
      notify?.(e.message);
    }
  }

  async function refreshMissionCards() {
    const host = document.getElementById("tfActiveMissions");
    if (!host) return;
    const tokenValue = token();
    const workspace = window.TradeFlowWorkspace?.getActiveWorkspaceId?.() || "";
    if (!tokenValue || !workspace) return;
    try {
      const data = await fetch(`${backendBase()}/api/missions`, { credentials:"include", headers:{Authorization:`Bearer ${tokenValue}`,"x-workspace-id":workspace} }).then(r=>r.json());
      const missions = data.missions || [];
      host.innerHTML = missions.length ? missions.slice(0,6).map(m => {
        const readiness = Math.max(0, Math.min(100, Number(m.readiness?.score || 0)));
        const next = m.readiness?.nextActions?.[0] || m.actions?.find(a => a.status === "in_progress")?.title || m.actions?.find(a => a.status === "ready")?.title || "Continue mission";
        const nextAction = m.actions?.find(a => a.status === "in_progress") || m.actions?.find(a => a.status === "ready");
        const risks = Array.isArray(m.risks) ? m.risks.slice(0, 2) : [];
        const opportunity = Number(m.opportunityScore || 0);
        const revenue = Number(m.revenueEstimate || 0);
        return `<article class="tf-mission-card"><h3>${esc(m.product)} → ${esc(m.market)}</h3><div class="tf-mission-meta">${esc(m.direction)} · ${esc(m.status)}</div><div class="tf-mission-bar"><i style="width:${readiness}%"></i></div><div class="tf-mission-insight"><strong>Trade intelligence</strong><br>Opportunity score: ${opportunity}/100${revenue ? ` · Scenario value: ${esc(revenue.toLocaleString("en-IN"))}` : ""}${risks.length ? `<br><span class="muted">Watch: ${esc(risks.join(" · "))}</span>` : ""}</div><div class="tf-mission-actions"><strong>Next:</strong> ${esc(next)}${nextAction ? `<br><button class="tf-mission-action-btn" data-mission-id="${esc(m._id)}" data-action-key="${esc(nextAction.key)}">Review next step →</button>` : ""}</div></article>`;
      }).join("") : '<div class="muted">No active missions yet. Start with one goal and TradeFlow will build the workflow.</div>';
      host.querySelectorAll(".tf-mission-action-btn").forEach(button => button.onclick = () => runMissionAction(button.dataset.missionId, button.dataset.actionKey));
    } catch {}
  }

  async function runMissionAction(missionId, actionKey) {
    if (actionKey === "setup") {
      go("governmentGatewayPage");
      return;
    }
    const tokenValue = token();
    const workspace = window.TradeFlowWorkspace?.getActiveWorkspaceId?.() || "";
    if (!tokenValue || !workspace) return;
    try {
      const headers = { Authorization:`Bearer ${tokenValue}`, "x-workspace-id":workspace, "Content-Type":"application/json" };
      await fetch(`${backendBase()}/api/missions/${encodeURIComponent(missionId)}/actions/${encodeURIComponent(actionKey)}/start`, { method:"POST", credentials:"include", headers });
      await refreshMissionCards();
      notify?.("TradeFlow started the next step.");
    } catch (e) { notify?.(e.message || "Could not start the step."); }
  }

  function simplifyDashboard() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard || document.getElementById("tfQuickActions")) return;

    const hero = dashboard.querySelector(".dashboard-hero");
    if (hero) {
      const kicker = hero.querySelector(".hero-kicker");
      const title = hero.querySelector(".hero-title");
      const copy = hero.querySelector(".hero-copy");
      if (kicker) kicker.textContent = "Your trade workspace";
      if (title) title.innerHTML = "What would you like to do today?";
      if (copy) copy.textContent = "TradeFlow keeps the complicated work behind the scenes. Choose a goal and we'll guide the next steps.";
      hero.classList.add("tf-welcome");
    }

    const grid = document.createElement("div");
    grid.id = "tfQuickActions";
    grid.className = "tf-quick-grid";
    grid.innerHTML = `
      <button class="tf-quick-card" data-tf-start="export"><span>🌍</span><strong>Start an Export</strong><span>Set up a product and market</span></button>
      <button class="tf-quick-card" data-tf-start="buyers"><span>🔎</span><strong>Find Buyers</strong><span>Discover potential customers</span></button>
      <button class="tf-quick-card" data-tf-start="import"><span>📦</span><strong>Start an Import</strong><span>Plan an import opportunity</span></button>
      <button class="tf-quick-card" data-tf-start="research"><span>🧠</span><strong>Research a Market</strong><span>Understand a product or country</span></button>
    `;
    hero?.after(grid);
    const missionHost = document.createElement("section"); missionHost.id="tfActiveMissions"; missionHost.className="tf-mission-list"; missionHost.innerHTML="<div class=\"muted\">Loading your work…</div>"; grid.after(missionHost);

    grid.querySelectorAll("[data-tf-start]").forEach(button => {
      button.addEventListener("click", () => startMission(button.dataset.tfStart));
    });

    const oldQuickCards = dashboard.querySelectorAll(".quick-card");
    oldQuickCards.forEach(card => card.closest(".grid")?.classList.add("tf-secondary-content"));
  }

  async function startMission(type = "export") {
    if (type === "buyers") {
      openMissionComposer("I want to find qualified buyers for ");
      return;
    }
    if (type === "research") {
      openMissionComposer("Research the market opportunity for ");
      return;
    }
    openMissionComposer(type === "import" ? "I want to import " : "I want to export ");
  }

  document.addEventListener("DOMContentLoaded", buildShell);
  document.addEventListener("tradeflow:bootstrap-complete", () => setTimeout(buildShell, 50));
})();

/* Unified trade execution API: keeps execution state inside TradeFlow instead of scattering it across modules. */
(function(){
  function base(){return window.TRADEFLOW_API_BASE||window.TRADEFLOW_API_BASE_URL||window.BACKEND_URL||(location.hostname==="localhost"||location.hostname==="127.0.0.1"?location.origin:"https://trade-flow-lc1k.onrender.com");}
  function auth(){try{const u=JSON.parse(localStorage.getItem("tradeflowUser")||"null");return u?.token||u?.accessToken||localStorage.getItem("tradeflowAccessToken")||"";}catch{return localStorage.getItem("tradeflowAccessToken")||"";}}
  function hdr(){const h={Authorization:`Bearer ${auth()}`,"Content-Type":"application/json"};const w=window.TradeFlowWorkspace?.getActiveWorkspaceId?.();if(w)h["x-workspace-id"]=w;return h;}
  async function call(path,options={}){const r=await fetch(base()+path,{credentials:"include",...options,headers:{...hdr(),...(options.headers||{})}});const d=await r.json();if(!r.ok||d.success===false)throw new Error(d.message||"Trade execution request failed");return d;}
  window.TradeFlowExecution={
    list:()=>call("/api/trade-executions"),
    create:(missionId,crmLeadId)=>call("/api/trade-executions",{method:"POST",body:JSON.stringify({missionId,crmLeadId})}),
    get:(id)=>call("/api/trade-executions/"+encodeURIComponent(id)),
    advance:(id,stage)=>call("/api/trade-executions/"+encodeURIComponent(id)+"/stage",{method:"POST",body:JSON.stringify({stage})}),
    checklist:(id,key,status,notes)=>call("/api/trade-executions/"+encodeURIComponent(id)+"/checklist/"+encodeURIComponent(key),{method:"POST",body:JSON.stringify({status,notes})})
  };
})();
