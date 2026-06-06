/* TradeFlow Executive Control Tower
   Strategic read-only command layer. Recommendations never execute external actions.
*/

(function () {
  if (window.TradeFlowExecutiveControlTower) return;

  const state = {
    summary: null,
    loading: false,
    error: "",
    loaded: false
  };

  const defaultCommands = [
    "Find rice buyers in UAE, verify them, push qualified leads to CRM, and draft outreach.",
    "Expand into Saudi Arabia with verified rice buyers and outreach drafts.",
    "Improve CRM conversion by prioritizing verified leads.",
    "Generate outreach plan for qualified export leads.",
    "Identify high-risk leads and recommend verification fixes.",
    "Find higher-margin suppliers for Basmati Rice."
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function apiBase() {
    if (window.TRADEFLOW_API_BASE) return window.TRADEFLOW_API_BASE;
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return "";
    return "https://trade-flow-lc1k.onrender.com";
  }

  function getToken() {
    return (
      window.getAuthToken?.() ||
      window.TradeFlowSessionManager?.getToken?.() ||
      localStorage.getItem("tradeflowToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      ""
    );
  }

  function isMongoObjectId(value) {
    return /^[a-f\d]{24}$/i.test(String(value || "").trim());
  }

  function getWorkspaceId() {
    const fromWorkspace = window.TradeFlowWorkspace?.getActiveWorkspaceId?.();
    if (isMongoObjectId(fromWorkspace)) return fromWorkspace;

    const selectorValue = $("activeWorkspaceSelect")?.value;
    if (isMongoObjectId(selectorValue)) return selectorValue;

    return "";
  }

  function authHeaders() {
    const token = getToken();
    const workspaceId = getWorkspaceId();
    const headers = {
      "Content-Type": "application/json"
    };

    if (token) headers.Authorization = `Bearer ${token}`;
    if (workspaceId) headers["x-workspace-id"] = workspaceId;

    return headers;
  }

  async function apiFetch(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch(`${apiBase()}${path}`, {
        ...options,
        credentials: "include",
        signal: controller.signal,
        headers: {
          ...authHeaders(),
          ...(options.headers || {})
        }
      });

      const contentType = res.headers.get("content-type") || "";
      const text = await res.text();

      if (!contentType.includes("application/json")) {
        throw new Error(`Backend returned non-JSON response from ${path}: ${text.slice(0, 160)}`);
      }

      const data = text ? JSON.parse(text) : {};

      if (!res.ok || data.success === false) {
        throw new Error(data.message || `Request failed: ${path}`);
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
  }

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function valueOrDash(value) {
    if (value === 0) return "0";
    return value ? escapeHtml(value) : "-";
  }

  function scoreCard(title, score, status) {
    return `
      <div class="card metric">
        <h3>${escapeHtml(title)}</h3>
        <p>${Number(score || 0)}</p>
        <span>${escapeHtml(status || "Unknown")}</span>
      </div>
    `;
  }

  function createPageShell() {
    let page = $("executiveTowerPage");
    if (page) return page;

    const main = document.querySelector(".main");
    if (!main) return null;

    page = document.createElement("section");
    page.id = "executiveTowerPage";
    page.className = "hidden";
    page.innerHTML = `
      <div class="dashboard-hero">
        <div class="hero-kicker">Executive AI Control Tower</div>
        <h1 class="hero-title">
          Strategic command for company health, missions, risks, and growth.
        </h1>
        <p class="hero-copy">
          Review insights, pick recommended commands, and route execution through human-approved AI Command Center plans.
        </p>
      </div>

      <div id="executiveTowerNotice"></div>
      <div id="executiveTowerContent">
        <div class="card">Loading Executive Control Tower...</div>
      </div>
    `;

    main.appendChild(page);
    return page;
  }

  function ensureNavButton() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar || document.querySelector("[data-executive-tower-nav='true']")) return;

    const button = document.createElement("button");
    button.className = "nav-btn";
    button.setAttribute("data-executive-tower-nav", "true");
    button.setAttribute("onclick", "showPage('executiveTower')");
    button.textContent = "Executive Control Tower";

    const aiButton = Array.from(sidebar.querySelectorAll(".nav-btn"))
      .find((btn) => (btn.getAttribute("onclick") || "").includes("showPage('ai')"));

    if (aiButton?.nextSibling) {
      sidebar.insertBefore(button, aiButton.nextSibling);
    } else {
      sidebar.insertBefore(button, sidebar.querySelector(".logout"));
    }
  }

  function notice(message, type = "info") {
    const box = $("executiveTowerNotice");
    if (!box) return;

    const color = type === "error" ? "#fecaca" : type === "success" ? "#bbf7d0" : "#bfdbfe";
    box.innerHTML = `<div class="deal" style="border-color:${color};">${escapeHtml(message)}</div>`;
  }

  function renderList(items = [], renderer, emptyText) {
    if (!items.length) {
      return `<div class="deal">${escapeHtml(emptyText)}</div>`;
    }

    return items.map(renderer).join("");
  }

  function renderSummary() {
    const target = $("executiveTowerContent");
    if (!target) return;

    if (state.loading) {
      target.innerHTML = `<div class="card">Loading Executive Control Tower...</div>`;
      return;
    }

    if (state.error) {
      target.innerHTML = `<div class="card">Executive Control Tower unavailable: ${escapeHtml(state.error)}</div>`;
      return;
    }

    const summary = state.summary;
    if (!summary) {
      target.innerHTML = `<div class="card">No executive summary available.</div>`;
      return;
    }

    const company = summary.companyHealth || {};
    const workspace = summary.workspaceHealth || {};
    const revenue = summary.revenuePipeline || {};
    const missions = summary.missionStatus || {};
    const agent = summary.agentActivity || {};
    const usage = summary.usageSummary || {};
    const customer = summary.customerSuccess || {};

    target.innerHTML = `
      <div class="grid grid-4">
        ${scoreCard("Company Health", company.score, company.status)}
        ${scoreCard("Workspace Health", workspace.score, workspace.workspaceName || "No workspace")}
        <div class="card metric">
          <h3>Revenue Pipeline</h3>
          <p>${Number(revenue.estimatedPipelineValue || 0).toLocaleString()}</p>
          <span>${Number(revenue.qualifiedLeadCount || 0)} qualified leads</span>
        </div>
        <div class="card metric">
          <h3>Customer Success</h3>
          <p>${Number(customer.onboardingScore || 0)}%</p>
          <span>${escapeHtml(customer.betaStatus || "invited")}</span>
        </div>
      </div>

      <div class="grid grid-3" style="margin-top:18px;">
        <div class="card">
          <div class="section-title">Workspace Health</div>
          <div class="deal">Workspace: <b>${valueOrDash(workspace.workspaceName)}</b></div>
          <div class="deal">Missions: <b>${Number(workspace.missionCount || 0)}</b></div>
          <div class="deal">CRM Leads: <b>${Number(workspace.crmLeadCount || 0)}</b></div>
          <div class="deal">Outreach Drafts: <b>${Number(workspace.outreachDraftCount || 0)}</b></div>
          <div class="deal">Email Deliveries: <b>${Number(workspace.emailDeliveryCount || 0)}</b></div>
        </div>

        <div class="card">
          <div class="section-title">Mission Status</div>
          <div class="deal">Total: <b>${Number(missions.total || 0)}</b></div>
          <div class="deal">Active: <b>${Number(missions.active || 0)}</b></div>
          <div class="deal">Completed: <b>${Number(missions.completed || 0)}</b></div>
          <div class="deal">Failed: <b>${Number(missions.failed || 0)}</b></div>
          <div class="deal">Approval Required: <b>${Number(missions.approvalRequired || 0)}</b></div>
        </div>

        <div class="card">
          <div class="section-title">Agent Activity</div>
          <div class="deal">Plans Generated: <b>${Number(agent.plansGenerated || 0)}</b></div>
          <div class="deal">Memory Items: <b>${Number(agent.memoryItems || 0)}</b></div>
          <div class="deal">Active Agents: <b>${Number(agent.activeAgents || 0)}</b></div>
          <div class="deal">Last Action: <b>${valueOrDash(agent.lastAgentAction ? new Date(agent.lastAgentAction).toLocaleString() : "")}</b></div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:18px;">
        <div class="card">
          <div class="section-title">AI Recommendations</div>
          ${renderList(summary.aiRecommendations || [], (item, index) => `
            <div class="deal">
              <b>${escapeHtml(item.title)}</b>
              <div class="muted">Priority: ${escapeHtml(item.priority || "Medium")}</div>
              <div>${escapeHtml(item.reason || "")}</div>
              <button class="mini-btn" onclick="TradeFlowExecutiveControlTower.selectRecommendation(${index})">
                Prefill AI Command Center
              </button>
            </div>
          `, "No recommendations yet.")}
        </div>

        <div class="card">
          <div class="section-title">Risk Alerts</div>
          ${renderList(summary.riskAlerts || [], (item) => `
            <div class="deal">
              <b>${escapeHtml(item.title)}</b>
              <div class="muted">Severity: ${escapeHtml(item.severity || "Low")}</div>
              <div>${escapeHtml(item.reason || "")}</div>
              <div class="muted">Fix: ${escapeHtml(item.recommendedFix || "")}</div>
            </div>
          `, "No active risk alerts.")}
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:18px;">
        <div class="card">
          <div class="section-title">Growth Opportunities</div>
          ${renderList(summary.growthOpportunities || [], (item, index) => `
            <div class="deal">
              <b>${escapeHtml(item.market)} - ${escapeHtml(item.product)}</b>
              <div class="muted">Opportunity Score: ${Number(item.opportunityScore || 0)}</div>
              <div>${escapeHtml(item.reason || "")}</div>
              <button class="mini-btn" onclick="TradeFlowExecutiveControlTower.selectGrowthOpportunity(${index})">
                Prefill AI Command Center
              </button>
            </div>
          `, "No growth opportunities available.")}
        </div>

        <div class="card">
          <div class="section-title">Usage Summary</div>
          <div class="deal">Missions: <b>${Number(usage.missions || 0)}</b></div>
          <div class="deal">Discovery Runs: <b>${Number(usage.discoveryRuns || 0)}</b></div>
          <div class="deal">CRM Pushes: <b>${Number(usage.crmPushes || 0)}</b></div>
          <div class="deal">Outreach Drafts: <b>${Number(usage.outreachDrafts || 0)}</b></div>
          <div class="deal">Emails: <b>${Number(usage.emails || 0)}</b></div>
          <div class="deal">AI Commands: <b>${Number(usage.aiCommands || 0)}</b></div>
        </div>
      </div>

      <div class="card" style="margin-top:18px;">
        <div class="section-title">Command Suggestions</div>
        ${defaultCommands.map((command) => `
          <button class="mini-btn" onclick="TradeFlowExecutiveControlTower.prefillCommand('${escapeHtml(command)}')">
            ${escapeHtml(command)}
          </button>
        `).join("")}
        <div class="deal" style="margin-top:12px;">
          Recommendations only. No email, WhatsApp, calls, CRM pushes, payments, subscription changes, or business type changes run from this tower.
        </div>
      </div>
    `;
  }

  async function loadSummary() {
    if (state.loading) return;

    state.loading = true;
    state.error = "";
    renderSummary();

    try {
      if (window.TradeFlowBootstrap?.whenReady) {
        await window.TradeFlowBootstrap.whenReady();
      }

      const data = await apiFetch("/api/executive-control-tower/summary");
      state.summary = data.summary || null;
      state.loaded = true;
      notice("Executive Control Tower updated.", "success");
    } catch (error) {
      state.error = error.name === "AbortError" ? "Timed out loading executive summary." : error.message;
      notice(state.error, "error");
    } finally {
      state.loading = false;
      renderSummary();
    }
  }

  async function auditSelection(payload) {
    try {
      await apiFetch("/api/executive-control-tower/recommendation-selected", {
        method: "POST",
        body: JSON.stringify(payload || {})
      });
    } catch (error) {
      console.warn("Executive recommendation audit failed:", error.message);
    }
  }

  function setCommandInput(command) {
    if (typeof window.showPage === "function") {
      window.showPage("ai");
    }

    setTimeout(() => {
      const input = $("aiCommandInput");
      if (input) {
        input.value = command;
        input.focus();
      }
    }, 100);
  }

  function prefillCommand(command) {
    const safeCommand = String(command || "").trim();
    if (!safeCommand) return;

    setCommandInput(safeCommand);
    auditSelection({
      title: "Command suggestion selected",
      suggestedAction: safeCommand
    });
  }

  function selectRecommendation(index) {
    const item = state.summary?.aiRecommendations?.[index];
    if (!item) return;

    prefillCommand(item.suggestedAction || item.title || "");
    auditSelection(item);
  }

  function selectGrowthOpportunity(index) {
    const item = state.summary?.growthOpportunities?.[index];
    if (!item) return;

    const command = item.suggestedMissionCommand || "";
    prefillCommand(command);
    auditSelection({
      title: `${item.market || "Market"} growth opportunity`,
      suggestedAction: command
    });
  }

  function init() {
    createPageShell();
    ensureNavButton();
    renderSummary();

    document.addEventListener("tradeflow:page-change", (event) => {
      if (event.detail?.page === "executiveTower") {
        loadSummary();
      }
    });
  }

  window.TradeFlowExecutiveControlTower = {
    init,
    loadSummary,
    prefillCommand,
    selectRecommendation,
    selectGrowthOpportunity,
    getState: () => ({ ...state })
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
