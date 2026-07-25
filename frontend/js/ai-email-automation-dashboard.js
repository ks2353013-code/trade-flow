/* TradeFlow AI Email Automation Dashboard */

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") return BACKEND_URL;
    return "https://trade-flow-lc1k.onrender.com";
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowUser") || "{}");
    } catch {
      return {};
    }
  }

  function getHeaders() {
    const user = getUser();

    return {
      "Content-Type": "application/json",
      Authorization: user?.token ? `Bearer ${user.token}` : "",
      "x-workspace-id": window.TradeFlowWorkspace?.getActiveWorkspaceId?.() || ""
    };
  }

  function setStatus(text) {
    const el = $("aiEmailAutomationStatus");
    if (el) el.innerText = text;
  }

  async function sendEmail() {
    setStatus("Direct AI email sending is disabled. Create an Outreach Approval draft and send only after approval.");
  }

  function useOutreachEmail() {
    const emailText = document.getElementById("generatedEmailText");
    const subjectText = document.querySelector("#aiOutreachResults .muted");

    if (emailText) {
      $("autoEmailMessage").value = emailText.innerText.trim();
    }

    if (subjectText) {
      const raw = subjectText.innerText || "";
      $("autoEmailSubject").value = raw.replace("Subject:", "").trim() || "TradeFlow Business Inquiry";
    }

    setStatus("Loaded latest AI outreach email.");
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("aiEmailAutomationPanel")) return;

    const panel = document.createElement("div");
    panel.id = "aiEmailAutomationPanel";
    panel.className = "card ai-panel";

    panel.innerHTML = `
      <div class="section-title">📨 AI Email Automation Dashboard</div>
      <p class="muted">
        Prepare AI email draft text. Sending is available only through approved Email Delivery.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:18px;">
        <input id="autoEmailTo" class="input" placeholder="Recipient Email">
        <input id="autoEmailSubject" class="input" placeholder="Email Subject">
      </div>

      <textarea
        id="autoEmailMessage"
        class="input"
        placeholder="Email Message"
        style="margin-top:12px;min-height:180px;resize:vertical;"
      ></textarea>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;">
        <button class="btn" onclick="TradeFlowAIEmailAutomation.send()">
          Sending Disabled
        </button>

        <button class="mini-btn" onclick="TradeFlowAIEmailAutomation.loadOutreach()">
          Load AI Outreach Email
        </button>
      </div>

      <div id="aiEmailAutomationStatus" style="margin-top:14px;color:#7dd3fc;font-weight:900;">
        Email draft mode ready. Use Outreach Approval Queue before sending.
      </div>
    `;

    dashboard.appendChild(panel);
  }

  window.TradeFlowAIEmailAutomation = {
    send: sendEmail,
    loadOutreach: useOutreachEmail
  };

  async function boot() {
    if (window.TradeFlowBootstrap?.whenReady) {
      await window.TradeFlowBootstrap.whenReady();
    }

    buildPanel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
