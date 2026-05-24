/* TradeFlow AI Outreach Writer Engine */

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
    const el = $("aiOutreachStatus");
    if (el) el.innerText = text;
  }

  async function generateOutreach() {
    try {
      const supplierName = $("outreachSupplierName")?.value || "";
      const product = $("outreachProduct")?.value || "";
      const country = $("outreachCountry")?.value || "";
      const tone = $("outreachTone")?.value || "Professional";
      const channel = $("outreachChannel")?.value || "Email";
      const objective = $("outreachObjective")?.value || "";

      setStatus("AI is generating outreach messages...");

      const res = await fetch(`${getBackendUrl()}/api/ai-outreach-agent/generate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          supplierName,
          product,
          country,
          tone,
          channel,
          objective
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Outreach generation failed");
      }

      renderResults(data);
      setStatus("Outreach generated successfully.");
    } catch (error) {
      setStatus(error.message || "AI outreach failed.");
    }
  }

  function copyText(id) {
    const el = $(id);
    if (!el) return;

    navigator.clipboard.writeText(el.innerText || el.value || "");
    setStatus("Copied to clipboard.");
  }

  function renderResults(data) {
    const box = $("aiOutreachResults");
    if (!box) return;

    box.innerHTML = `
      <div class="supplier-card" style="margin-bottom:14px;">
        <h2 style="color:white;margin:0 0 10px;">📧 Email Outreach</h2>
        <p class="muted"><b>Subject:</b> ${data.subject}</p>
        <div id="generatedEmailText" class="deal" style="white-space:pre-wrap;line-height:1.7;">${data.emailMessage}</div>
        <button class="btn" onclick="TradeFlowAIOutreach.copy('generatedEmailText')">Copy Email</button>
      </div>

      <div class="supplier-card" style="margin-bottom:14px;">
        <h2 style="color:white;margin:0 0 10px;">💬 WhatsApp Message</h2>
        <div id="generatedWhatsAppText" class="deal" style="white-space:pre-wrap;line-height:1.7;">${data.whatsappMessage}</div>
        <button class="btn" onclick="TradeFlowAIOutreach.copy('generatedWhatsAppText')">Copy WhatsApp</button>
      </div>

      <div class="supplier-card" style="margin-bottom:14px;">
        <h2 style="color:white;margin:0 0 10px;">🤝 Negotiation Message</h2>
        <div id="generatedNegotiationText" class="deal" style="white-space:pre-wrap;line-height:1.7;">${data.negotiationMessage}</div>
        <button class="btn" onclick="TradeFlowAIOutreach.copy('generatedNegotiationText')">Copy Negotiation</button>
      </div>

      <div class="supplier-card" style="margin-bottom:14px;">
        <h2 style="color:white;margin:0 0 10px;">🔁 Follow-up Sequence</h2>
        ${(data.followUpSequence || []).map((msg, i) => `
          <div class="deal" style="white-space:pre-wrap;line-height:1.7;margin-bottom:8px;">
            <b>Follow-up ${i + 1}:</b> ${msg}
          </div>
        `).join("")}
      </div>

      <div class="supplier-card">
        <h2 style="color:white;margin:0 0 10px;">🧠 AI Outreach Tips</h2>
        ${(data.aiTips || []).map((tip) => `
          <div class="deal" style="margin-bottom:8px;">• ${tip}</div>
        `).join("")}
      </div>
    `;
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;

    if (!dashboard || $("aiOutreachWriterPanel")) return;

    const panel = document.createElement("div");
    panel.id = "aiOutreachWriterPanel";
    panel.className = "card ai-panel";

    panel.innerHTML = `
      <div class="section-title">✍️ AI Outreach Writer Agent</div>
      <p class="muted">
        Generate supplier emails, WhatsApp messages, negotiation scripts, and follow-up sequences.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:18px;">
        <input id="outreachSupplierName" class="input" placeholder="Supplier Name">
        <input id="outreachProduct" class="input" placeholder="Product">
        <input id="outreachCountry" class="input" placeholder="Country">

        <select id="outreachTone" class="input">
          <option>Professional</option>
          <option>Friendly</option>
          <option>Premium</option>
          <option>Direct</option>
          <option>Negotiation</option>
        </select>

        <select id="outreachChannel" class="input">
          <option>Email</option>
          <option>WhatsApp</option>
          <option>Both</option>
        </select>

        <input id="outreachObjective" class="input" placeholder="Objective e.g. Get quotation">
      </div>

      <button class="btn" onclick="TradeFlowAIOutreach.generate()" style="margin-top:16px;">
        Generate Outreach
      </button>

      <div id="aiOutreachStatus" style="margin-top:14px;color:#7dd3fc;font-weight:900;">
        AI outreach writer ready.
      </div>

      <div id="aiOutreachResults" style="margin-top:20px;"></div>
    `;

    dashboard.appendChild(panel);
  }

  window.TradeFlowAIOutreach = {
    generate: generateOutreach,
    copy: copyText
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