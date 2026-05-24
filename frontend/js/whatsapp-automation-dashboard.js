/* TradeFlow WhatsApp Automation Dashboard */

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
      "x-user-email": user?.email || "unknown@tradeflow.local",
      "x-company-id": localStorage.getItem("tradeflowActiveCompany") || "",
      "x-workspace-id": localStorage.getItem("tradeflowActiveWorkspace") || ""
    };
  }

  function setStatus(text) {
    const el = $("whatsappAutomationStatus");
    if (el) el.innerText = text;
  }

  async function sendWhatsApp() {
    try {
      const to = $("waTo")?.value?.trim();
      const message = $("waMessage")?.value?.trim();

      if (!to || !message) {
        alert("WhatsApp number and message are required.");
        return;
      }

      setStatus("Sending WhatsApp message...");

      const res = await fetch(`${getBackendUrl()}/api/whatsapp-automation/send`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ to, message })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "WhatsApp sending failed");
      }

      setStatus("WhatsApp message sent successfully.");
      alert("WhatsApp sent successfully.");
    } catch (error) {
      setStatus(error.message || "WhatsApp failed.");
      alert(error.message || "WhatsApp failed.");
    }
  }

  function loadAIOutreach() {
    const waText = document.getElementById("generatedWhatsAppText");

    if (waText) {
      $("waMessage").value = waText.innerText.trim();
      setStatus("Loaded latest AI WhatsApp outreach message.");
      return;
    }

    setStatus("No AI WhatsApp message found. Generate outreach first.");
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("whatsappAutomationPanel")) return;

    const panel = document.createElement("div");
    panel.id = "whatsappAutomationPanel";
    panel.className = "card ai-panel";

    panel.innerHTML = `
      <div class="section-title">💬 WhatsApp Automation Dashboard</div>
      <p class="muted">
        Send AI-generated outreach, reminders, supplier follow-ups, and workflow alerts through WhatsApp.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:18px;">
        <input id="waTo" class="input" placeholder="Recipient WhatsApp Number e.g. +919999999999">
      </div>

      <textarea
        id="waMessage"
        class="input"
        placeholder="WhatsApp Message"
        style="margin-top:12px;min-height:160px;resize:vertical;"
      ></textarea>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;">
        <button class="btn" onclick="TradeFlowWhatsAppAutomation.send()">
          Send WhatsApp
        </button>

        <button class="mini-btn" onclick="TradeFlowWhatsAppAutomation.loadOutreach()">
          Load AI WhatsApp Outreach
        </button>
      </div>

      <div id="whatsappAutomationStatus" style="margin-top:14px;color:#7dd3fc;font-weight:900;">
        WhatsApp automation ready.
      </div>
    `;

    dashboard.appendChild(panel);
  }

  window.TradeFlowWhatsAppAutomation = {
    send: sendWhatsApp,
    loadOutreach: loadAIOutreach
  };

  function boot() {
    buildPanel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();