(function () {
  if (window.TradeFlowOpportunityLayer) return;

  const state = { opportunities: [], loading: false };

  function workspaceId() {
    return window.TradeFlowWorkspace?.getActiveWorkspaceId?.() || "";
  }

  function token() {
    return window.getAuthToken?.() || window.TradeFlowSessionManager?.getToken?.() || "";
  }

  async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    const t = token();
    const w = workspaceId();
    if (t) headers.Authorization = `Bearer ${t}`;
    if (w) headers["x-workspace-id"] = w;
    const response = await fetch(`${window.BACKEND_URL || ""}${path}`, { ...options, headers, credentials: "include" });
    const data = await response.json();
    if (!response.ok || data.success === false) throw new Error(data.message || "Opportunity request failed");
    return data;
  }

  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
  }

  function freshnessLabel(value) {
    return ({ fresh:"Fresh", aging:"Aging", stale:"Stale", unknown:"Unknown" })[value] || "Unknown";
  }

  function render(target) {
    if (!target) return;
    if (state.loading) {
      target.innerHTML = '<div class="deal">Loading opportunity intelligence…</div>';
      return;
    }
    if (!state.opportunities.length) {
      target.innerHTML = '<div class="deal"><b>No active opportunities yet.</b><p class="muted">Run a buyer or supplier mission and verified opportunities will appear here as one continuous workflow.</p></div>';
      return;
    }
    target.innerHTML = state.opportunities.slice(0, 12).map(o => `
      <div class="deal" style="margin-top:10px;">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:start;">
          <div><b>${escape(o.companyName)}</b><div class="muted">${escape(o.type)} · ${escape(o.country || "Country not available")} · ${escape(o.stage)}</div></div>
          <span class="mini-btn">${escape(freshnessLabel(o.freshness))}</span>
        </div>
        <div class="muted" style="margin-top:8px;">Fit ${Number(o.fitScore||0)}/100 · Verification ${Number(o.verificationScore||0)}/100 · Confidence ${Number(o.confidenceScore||0)}/100</div>
        <div style="margin-top:9px;"><b>Next best action:</b> ${escape(o.nextBestAction || "Review opportunity")}</div>
        ${o.nextBestActionReason ? `<div class="muted">${escape(o.nextBestActionReason)}</div>` : ""}
        ${Array.isArray(o.evidence) && o.evidence.length ? `<div class="muted" style="margin-top:8px;">Evidence: ${o.evidence.slice(0,3).map(e => escape(e.label || e.source || "Source")).join(" · ")}</div>` : '<div class="muted" style="margin-top:8px;">Evidence not attached yet — treat recommendation as incomplete.</div>'}
      </div>
    `).join("");
  }

  async function load(target) {
    if (!workspaceId()) return;
    state.loading = true; render(target);
    try {
      const data = await api("/api/opportunities?limit=50");
      state.opportunities = data.opportunities || [];
    } catch (error) {
      state.opportunities = [];
      if (target) target.innerHTML = `<div class="deal">Opportunity intelligence unavailable: ${escape(error.message)}</div>`;
      return;
    } finally {
      state.loading = false;
    }
    render(target);
  }

  function mount() {
    const crm = document.getElementById("crmPage");
    if (!crm) return;
    let panel = document.getElementById("tradeflowUnifiedOpportunityPanel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "tradeflowUnifiedOpportunityPanel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";
      panel.innerHTML = `
        <div class="section-title">TradeFlow Opportunity Intelligence</div>
        <p class="muted">One view from discovery to revenue: verification, evidence, pipeline stage and the next action that matters.</p>
        <div id="tradeflowOpportunityList"></div>
      `;
      crm.prepend(panel);
    }
    load(document.getElementById("tradeflowOpportunityList"));
  }

  window.TradeFlowOpportunityLayer = { load, mount, state };
  document.addEventListener("tradeflow:page-change", e => { if (e.detail?.page === "crm") setTimeout(mount, 150); });
  document.addEventListener("tradeflow:bootstrap-complete", () => { if (document.getElementById("crmPage") && !document.getElementById("crmPage").classList.contains("hidden")) setTimeout(mount, 150); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(mount, 300));
  else setTimeout(mount, 300);
})();