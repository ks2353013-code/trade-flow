/* TradeFlow AI Command Center V2
   Safe mission planning foundation. No external action is executed here.
*/

(function () {
  if (window.TradeFlowAICommandCenterV2) return;

  const state = {
    agents: [],
    currentMission: null,
    missions: [],
    memories: [],
    loading: false
  };

  function $(id) {
    return document.getElementById(id);
  }

  function apiBase() {
    if (window.TRADEFLOW_API_BASE) return window.TRADEFLOW_API_BASE;
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
      return "";
    }
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
    const fromWorkspaceApi = window.TradeFlowWorkspace?.getActiveWorkspaceId?.();
    if (isMongoObjectId(fromWorkspaceApi)) return fromWorkspaceApi;

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
    const res = await fetch(`${apiBase()}${path}`, {
      ...options,
      credentials: "include",
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
  }

  function notice(message, type = "info") {
    const box = $("aiCommandCenterNotice");
    if (!box) return;
    const color = type === "error" ? "#fecaca" : type === "success" ? "#bbf7d0" : "#bfdbfe";
    box.innerHTML = `<div class="deal" style="border-color:${color};">${escapeHtml(message)}</div>`;
  }

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function createPanel() {
    const aiPage = $("aiPage");
    if (!aiPage) return null;

    let panel = $("aiCommandCenterV2");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "aiCommandCenterV2";
    panel.className = "card ai-panel";
    panel.style.marginTop = "20px";

    panel.innerHTML = `
      <div class="section-title">AI Command Center Foundation</div>
      <p class="muted">
        Type a trade goal. TradeFlow converts it into a controlled mission plan with agents,
        ordered steps, required approvals, and safety boundaries. No email, WhatsApp, calls,
        CRM push, payments, or external actions run automatically.
      </p>

      <div id="aiCommandCenterNotice"></div>

      <div class="grid grid-2" style="margin-top:18px;">
        <div class="deal">
          <b>Trade command</b>
          <textarea
            id="aiCommandInput"
            style="min-height:130px;"
            placeholder="Find rice buyers in UAE, verify them, push qualified leads to CRM, and draft outreach."></textarea>
          <button class="btn" onclick="TradeFlowAICommandCenterV2.createMissionPlan()">
            Create Mission Plan
          </button>
          <button class="mini-btn" onclick="TradeFlowAICommandCenterV2.sendForHumanApproval()">
            Send for Human Approval
          </button>
        </div>

        <div class="deal">
          <b>Beta controls</b>
          <p class="muted">Use these for controlled beta feedback. Messages are stored for master admin review.</p>
          <textarea id="betaFeedbackMessage" style="min-height:80px;" placeholder="Report an issue, request a feature, or contact support."></textarea>
          <button class="mini-btn" onclick="TradeFlowAICommandCenterV2.submitBetaFeedback('issue')">Report Issue</button>
          <button class="mini-btn" onclick="TradeFlowAICommandCenterV2.submitBetaFeedback('feature_request')">Request Feature</button>
          <button class="mini-btn" onclick="TradeFlowAICommandCenterV2.submitBetaFeedback('support')">Contact Support</button>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:18px;">
        <div class="card">
          <div class="section-title">Generated Mission Plan</div>
          <div id="aiMissionPlanPreview" class="muted">No plan generated yet.</div>
        </div>

        <div class="card">
          <div class="section-title">Mission Timeline</div>
          <div id="aiMissionTimeline" class="muted">Steps will appear after plan generation.</div>
        </div>
      </div>

      <div class="card" style="margin-top:18px;">
        <div class="section-title">Agent Registry</div>
        <div id="aiAgentRegistryGrid" class="grid grid-3">Loading agents...</div>
      </div>

      <div class="grid grid-2" style="margin-top:18px;">
        <div class="card">
          <div class="section-title">Workspace Agent Memory</div>
          <p class="muted">Save mission learnings to workspace-level memory. Do not store tokens, passwords, or secrets.</p>
          <textarea id="agentMemoryContent" style="min-height:90px;" placeholder="Example: UAE rice buyers responded best to concise product-quality proof."></textarea>
          <button class="mini-btn" onclick="TradeFlowAICommandCenterV2.saveAgentMemory()">Save Memory</button>
          <div id="agentMemoryList" style="margin-top:10px;">No memory loaded yet.</div>
        </div>

        <div class="card">
          <div class="section-title">Safety Layer</div>
          <div class="deal">Human approval is required for email send.</div>
          <div class="deal">Human approval is required for CRM push when configured.</div>
          <div class="deal">No WhatsApp sending is enabled here.</div>
          <div class="deal">No call action is enabled here.</div>
          <div class="deal">No payments or autonomous external execution.</div>
        </div>
      </div>

      <div class="card" style="margin-top:18px;">
        <div class="section-title">Recent AI Mission Plans</div>
        <div id="aiMissionPlanList">No mission plans loaded yet.</div>
      </div>
    `;

    aiPage.appendChild(panel);
    return panel;
  }

  function renderAgents() {
    const target = $("aiAgentRegistryGrid");
    if (!target) return;

    if (!state.agents.length) {
      target.innerHTML = `<div class="deal">Agent registry unavailable.</div>`;
      return;
    }

    target.innerHTML = state.agents.map((agent) => `
      <div class="deal">
        <b>${escapeHtml(agent.name)}</b>
        <p class="muted">${escapeHtml(agent.role)}</p>
        <div class="mini-btn" style="display:inline-block;margin:4px 0;">
          ${agent.requiresHumanApproval ? "Approval Required" : "Internal Only"}
        </div>
        <div class="muted">Allowed: ${escapeHtml((agent.allowedActions || []).slice(0, 2).join(", "))}</div>
        <div class="muted">Forbidden: ${escapeHtml((agent.forbiddenActions || []).slice(0, 2).join(", "))}</div>
      </div>
    `).join("");
  }

  function renderMissionPlan() {
    const preview = $("aiMissionPlanPreview");
    const timeline = $("aiMissionTimeline");
    const mission = state.currentMission;

    if (!preview || !timeline) return;

    if (!mission) {
      preview.innerHTML = "No plan generated yet.";
      timeline.innerHTML = "Steps will appear after plan generation.";
      return;
    }

    const plan = mission.plan || {};

    preview.innerHTML = `
      <div class="deal"><b>${escapeHtml(mission.missionTitle || "Mission Plan")}</b></div>
      <div class="deal">Goal: ${escapeHtml(plan.goal || mission.objective || "")}</div>
      <div class="deal">Product: ${escapeHtml(plan.product || "")}</div>
      <div class="deal">Target Country: ${escapeHtml(plan.targetCountry || "Not specified")}</div>
      <div class="deal">Risk Level: <b>${escapeHtml(plan.riskLevel || "Medium")}</b></div>
      <div class="deal">
        Required Approvals:
        ${(plan.requiredApprovals || []).map((item) => `<span class="mini-btn" style="display:inline-block;margin:3px;">${escapeHtml(item)}</span>`).join("")}
      </div>
    `;

    timeline.innerHTML = (plan.steps || []).map((step) => `
      <div class="deal">
        <b>${step.stepNumber}. ${escapeHtml(step.title)}</b>
        <div class="muted">${escapeHtml(step.description)}</div>
        <span class="mini-btn" style="display:inline-block;margin-top:6px;">
          ${escapeHtml(step.status)}
        </span>
        ${
          step.requiresHumanApproval
            ? `<span class="mini-btn" style="display:inline-block;margin-top:6px;">Human Approval Required</span>`
            : ""
        }
      </div>
    `).join("");
  }

  function renderMissions() {
    const box = $("aiMissionPlanList");
    if (!box) return;

    if (!state.missions.length) {
      box.innerHTML = `<div class="deal">No mission plans yet.</div>`;
      return;
    }

    box.innerHTML = state.missions.slice(0, 8).map((mission) => `
      <div class="deal">
        <b>${escapeHtml(mission.missionTitle || "AI Mission Plan")}</b>
        <div class="muted">${escapeHtml(mission.status || "Draft")}</div>
        <div class="muted">${escapeHtml(mission.objective || "")}</div>
      </div>
    `).join("");
  }

  function renderMemories() {
    const box = $("agentMemoryList");
    if (!box) return;

    if (!state.memories.length) {
      box.innerHTML = `<div class="deal">No workspace agent memory yet.</div>`;
      return;
    }

    box.innerHTML = state.memories.slice(0, 5).map((memory) => `
      <div class="deal">
        <b>${escapeHtml(memory.memoryType || "general")}</b>
        <div class="muted">${escapeHtml(memory.agentId || "agent")} | Confidence ${Number(memory.confidence || 0)}/100</div>
        <div>${escapeHtml(memory.content || "")}</div>
      </div>
    `).join("");
  }

  async function loadAgents() {
    try {
      const data = await apiFetch("/api/agent-registry");
      state.agents = data.agents || [];
      renderAgents();
    } catch (error) {
      renderAgents();
      notice(error.message, "error");
    }
  }

  async function loadMissions() {
    try {
      const data = await apiFetch("/api/ai-command/missions");
      state.missions = data.missions || [];
      renderMissions();
    } catch (error) {
      renderMissions();
    }
  }

  async function loadMemories() {
    try {
      const data = await apiFetch("/api/agent-memory");
      state.memories = data.memories || [];
      renderMemories();
    } catch {
      renderMemories();
    }
  }

  async function createMissionPlan() {
    if (state.loading) return;
    const workspaceId = getWorkspaceId();
    if (!isMongoObjectId(workspaceId)) {
      notice("Select a valid workspace before creating an AI mission plan.", "error");
      return;
    }

    const commandText = $("aiCommandInput")?.value?.trim();
    if (!commandText) {
      notice("Enter a trade command first.", "error");
      return;
    }

    state.loading = true;
    notice("Generating controlled mission plan...");

    try {
      const data = await apiFetch("/api/ai-command/plan", {
        method: "POST",
        body: JSON.stringify({ commandText })
      });

      state.currentMission = data.mission;
      renderMissionPlan();
      await loadMissions();
      notice("Mission plan generated. External actions still require human approval.", "success");
    } catch (error) {
      notice(error.message, "error");
    } finally {
      state.loading = false;
    }
  }

  async function sendForHumanApproval() {
    if (!state.currentMission?._id) {
      notice("Create a mission plan before sending it for approval.", "error");
      return;
    }

    try {
      const data = await apiFetch(`/api/ai-command/missions/${state.currentMission._id}/approval`, {
        method: "POST"
      });

      state.currentMission = data.mission;
      renderMissionPlan();
      await loadMissions();
      notice(data.message || "Mission plan sent for human approval.", "success");
    } catch (error) {
      notice(error.message, "error");
    }
  }

  async function saveAgentMemory() {
    if (!state.currentMission?._id) {
      notice("Create a mission plan before saving memory.", "error");
      return;
    }

    const content = $("agentMemoryContent")?.value?.trim();
    if (!content) {
      notice("Add memory content before saving.", "error");
      return;
    }

    try {
      await apiFetch("/api/agent-memory", {
        method: "POST",
        body: JSON.stringify({
          missionId: state.currentMission._id,
          agentId: "research",
          memoryType: "past_mission_outcome",
          content,
          source: "AI Command Center",
          confidence: 80
        })
      });

      $("agentMemoryContent").value = "";
      await loadMemories();
      notice("Workspace agent memory saved.", "success");
    } catch (error) {
      notice(error.message, "error");
    }
  }

  async function submitBetaFeedback(type) {
    const message = $("betaFeedbackMessage")?.value?.trim();
    if (!message) {
      notice("Add a message before submitting beta feedback.", "error");
      return;
    }

    try {
      await apiFetch("/api/beta/feedback", {
        method: "POST",
        body: JSON.stringify({
          type,
          message,
          page: location.pathname,
          title: type === "feature_request" ? "Feature request" : type === "support" ? "Support request" : "Issue report"
        })
      });

      $("betaFeedbackMessage").value = "";
      notice("Beta feedback submitted.", "success");
    } catch (error) {
      notice(error.message, "error");
    }
  }

  async function bootPanel() {
    createPanel();
    await loadAgents();
    await loadMissions();
    await loadMemories();
  }

  function boot() {
    document.addEventListener("tradeflow:page-change", function (event) {
      if (event.detail?.page === "ai") {
        bootPanel();
      }
    });

    setTimeout(() => {
      const aiPage = $("aiPage");
      if (aiPage && !aiPage.classList.contains("hidden")) {
        bootPanel();
      }
    }, 1200);
  }

  async function runSupplierAnalysis() {
    const input = $("aiCommandInput");
    if (input) {
      input.value = "Find verified suppliers for my active product and create a safe approval-first mission plan.";
    }
    await createMissionPlan();
  }

  async function runCRMForecast() {
    const input = $("aiCommandInput");
    if (input) {
      input.value = "Review qualified leads, recommend CRM next steps, and require approval before CRM changes.";
    }
    await createMissionPlan();
  }

  async function generateOutreach() {
    const input = $("aiCommandInput");
    if (input) {
      input.value = "Draft outreach for verified leads and route every external message through human approval.";
    }
    await createMissionPlan();
  }

  window.TradeFlowAICommandCenterV2 = {
    createMissionPlan,
    sendForHumanApproval,
    saveAgentMemory,
    submitBetaFeedback,
    loadAgents,
    loadMissions,
    loadMemories,
    renderAIRecommendations: bootPanel,
    runSupplierAnalysis,
    runCRMForecast,
    generateOutreach
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
