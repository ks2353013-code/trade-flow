/* TradeFlow Controlled Beta Onboarding
   Lightweight checklist, guidance, feedback, and adoption progress display.
*/

(function () {
  if (window.TradeFlowBetaOnboarding) return;

  const state = {
    loading: false,
    error: "",
    progress: null,
    guidance: {}
  };

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
    const workspaceId = window.TradeFlowWorkspace?.getActiveWorkspaceId?.();
    if (isMongoObjectId(workspaceId)) return workspaceId;
    return "";
  }

  function authHeaders() {
    const headers = {
      "Content-Type": "application/json"
    };
    const token = getToken();
    const workspaceId = getWorkspaceId();

    if (token) headers.Authorization = `Bearer ${token}`;
    if (workspaceId) headers["x-workspace-id"] = workspaceId;

    return headers;
  }

  async function apiFetch(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

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
      const text = await res.text();
      const contentType = res.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error(`Backend returned non-JSON response from ${path}`);
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

  function notice(message, type = "info") {
    const box = $("betaOnboardingNotice");
    if (!box) return;

    const color = type === "error" ? "#fecaca" : type === "success" ? "#bbf7d0" : "#bfdbfe";
    box.innerHTML = `<div class="deal" style="border-color:${color};">${escapeHtml(message)}</div>`;
  }

  function ensureDashboardPanel() {
    let panel = $("betaOnboardingChecklistPanel");
    if (panel) return panel;

    const dashboardPage = $("dashboardPage");
    if (!dashboardPage) return null;

    panel = document.createElement("div");
    panel.id = "betaOnboardingChecklistPanel";
    panel.className = "card";
    panel.style.marginTop = "18px";
    panel.innerHTML = `
      <div class="section-title">Beta Onboarding Checklist</div>
      <p class="muted">Complete the first workflow from workspace setup to approved outreach.</p>
      <div id="betaOnboardingNotice"></div>
      <div id="betaOnboardingProgressBody">
        <div class="deal">Loading onboarding progress...</div>
      </div>
      <div class="grid grid-2" style="margin-top:14px;">
        <div class="deal">
          <b>Beta feedback</b>
          <textarea id="betaOnboardingFeedbackMessage" style="min-height:80px;" placeholder="Share an issue, feature request, or support note."></textarea>
          <button class="mini-btn" onclick="TradeFlowBetaOnboarding.submitFeedback('issue')">Report Issue</button>
          <button class="mini-btn" onclick="TradeFlowBetaOnboarding.submitFeedback('feature_request')">Request Feature</button>
          <button class="mini-btn" onclick="TradeFlowBetaOnboarding.submitFeedback('support')">Contact Support</button>
        </div>
        <div class="deal">
          <b>New user path</b>
          <div class="muted">Signup -> account session -> company -> business type -> workspace -> dashboard.</div>
        </div>
      </div>
    `;

    const hero = dashboardPage.querySelector(".dashboard-hero");
    if (hero?.nextSibling) {
      dashboardPage.insertBefore(panel, hero.nextSibling);
    } else {
      dashboardPage.appendChild(panel);
    }

    return panel;
  }

  function renderProgress() {
    const body = $("betaOnboardingProgressBody");
    if (!body) return;

    if (state.loading) {
      body.innerHTML = `<div class="deal">Loading onboarding progress...</div>`;
      return;
    }

    if (state.error) {
      body.innerHTML = `<div class="deal">Onboarding progress unavailable: ${escapeHtml(state.error)}</div>`;
      return;
    }

    const progress = state.progress;
    if (!progress) {
      body.innerHTML = `<div class="deal">No onboarding progress yet.</div>`;
      return;
    }

    const checklist = Array.isArray(progress.checklist) ? progress.checklist : [];
    const score = Number(progress.onboardingProgressScore || 0);

    body.innerHTML = `
      <div class="grid grid-4">
        <div class="card metric">
          <h3>Progress</h3>
          <p>${score}%</p>
          <span>${Number(progress.completed || 0)} of ${Number(progress.total || checklist.length)} complete</span>
        </div>
        <div class="card metric">
          <h3>Company</h3>
          <p>${escapeHtml(progress.companyName || "Set Up")}</p>
          <span>${escapeHtml(progress.businessType || "Business type pending")}</span>
        </div>
        <div class="card metric">
          <h3>Workspace</h3>
          <p>${escapeHtml(progress.workspaceName || "Pending")}</p>
          <span>${escapeHtml(progress.workspaceId || "Select or create workspace")}</span>
        </div>
        <div class="card metric">
          <h3>First Email</h3>
          <p>${progress.signals?.firstEmail?.done ? "Done" : "Pending"}</p>
          <span>Sent or dry-run after approval</span>
        </div>
      </div>
      <div class="grid grid-2" style="margin-top:14px;">
        ${checklist.map((item) => `
          <div class="deal">
            <b>${item.done ? "[x]" : "[ ]"} ${escapeHtml(item.label)}</b>
            <div class="muted">${item.done ? "Completed" : "Next step"}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function ensureGuidance(id, target, message) {
    if (!target || $(id)) return;

    const box = document.createElement("div");
    box.id = id;
    box.className = "deal";
    box.innerHTML = escapeHtml(message);
    target.insertBefore(box, target.firstChild);
  }

  function renderGuidance() {
    ensureGuidance(
      "betaMissionGuidance",
      $("missionCenterV1") || $("dashboardPage"),
      state.guidance.missionCenter || "Start by creating your first mission."
    );
    ensureGuidance(
      "betaAiGuidance",
      $("aiCommandCenterV2") || $("aiPage"),
      state.guidance.aiCommandCenter || "Describe what you want TradeFlow AI to accomplish."
    );
    ensureGuidance(
      "betaExecutiveGuidance",
      $("executiveTowerPage"),
      state.guidance.executiveTower || "Review recommendations and growth opportunities."
    );
    ensureGuidance(
      "betaCrmGuidance",
      $("crmPage"),
      state.guidance.crm || "Push qualified leads from Discovery."
    );
  }

  async function loadProgress() {
    if (state.loading) return;

    ensureDashboardPanel();
    state.loading = true;
    state.error = "";
    renderProgress();

    try {
      if (window.TradeFlowBootstrap?.whenReady) {
        await window.TradeFlowBootstrap.whenReady();
      }

      const data = await apiFetch("/api/beta/my-onboarding");
      state.progress = data.progress || null;
      state.guidance = data.guidance || {};
    } catch (error) {
      state.error = error.name === "AbortError" ? "Timed out loading onboarding progress." : error.message;
    } finally {
      state.loading = false;
      renderProgress();
      renderGuidance();
    }
  }

  async function submitFeedback(type) {
    const input = $("betaOnboardingFeedbackMessage");
    const message = String(input?.value || "").trim();

    if (!message) {
      notice("Enter a short message first.", "error");
      return;
    }

    try {
      await apiFetch("/api/beta/feedback", {
        method: "POST",
        body: JSON.stringify({
          type,
          message,
          page: location.pathname,
          priority: type === "issue" ? "High" : "Medium"
        })
      });

      if (input) input.value = "";
      notice("Feedback submitted for beta review.", "success");
    } catch (error) {
      notice(error.message, "error");
    }
  }

  function init() {
    ensureDashboardPanel();
    renderGuidance();
    loadProgress();

    document.addEventListener("tradeflow:workspace-change", loadProgress);
    document.addEventListener("tradeflow:page-change", (event) => {
      renderGuidance();
      if (event.detail?.page === "dashboard") loadProgress();
    });
  }

  window.TradeFlowBetaOnboarding = {
    init,
    loadProgress,
    submitFeedback,
    getState: () => ({ ...state })
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
