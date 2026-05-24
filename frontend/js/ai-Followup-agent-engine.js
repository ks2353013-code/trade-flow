/* TradeFlow AI Follow-up Automation Agent */

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
    const el = $("aiFollowupStatus");
    if (el) el.innerText = text;
  }

  async function generatePlan() {
    try {
      const leadName = $("followLeadName")?.value || "";
      const leadType = $("followLeadType")?.value || "Supplier";
      const product = $("followProduct")?.value || "";
      const lastContact = $("followLastContact")?.value || "";
      const stage = $("followStage")?.value || "New Lead";
      const urgency = $("followUrgency")?.value || "Medium";

      setStatus("AI is creating follow-up plan...");

      const res = await fetch(`${getBackendUrl()}/api/ai-followup-agent/plan`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          leadName,
          leadType,
          product,
          lastContact,
          stage,
          urgency
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Follow-up planning failed");
      }

      renderResults(data);
      setStatus("Follow-up plan generated.");
    } catch (error) {
      setStatus(error.message || "AI follow-up failed.");
    }
  }

  function renderResults(data) {
    const box = $("aiFollowupResults");
    if (!box) return;

    box.innerHTML = `
      <div class="supplier-card" style="margin-bottom:14px;">
        <h2 style="color:white;margin:0 0 10px;">🧠 AI Summary</h2>
        <p class="muted">${data.aiSummary}</p>
      </div>

      <div class="supplier-card" style="margin-bottom:14px;">
        <h2 style="color:white;margin:0 0 10px;">📌 CRM Recommendation</h2>
        <div class="deal"><b>Current Stage:</b> ${data.crmRecommendation.currentStage}</div>
        <div class="deal"><b>Suggested Stage:</b> ${data.crmRecommendation.suggestedStage}</div>
        <div class="deal"><b>Next Action:</b> ${data.crmRecommendation.nextAction}</div>
        <div class="deal"><b>Risk/Opportunity:</b> ${data.crmRecommendation.riskLevel}</div>
      </div>

      <div class="supplier-card">
        <h2 style="color:white;margin:0 0 10px;">🔁 Follow-up Schedule</h2>
        ${(data.followups || []).map((f) => `
          <div class="deal" style="margin-bottom:10px;white-space:pre-wrap;line-height:1.7;">
            <b>${f.title}</b><br>
            Day: +${f.dayOffset}<br>
            Channel: ${f.channel}<br>
            Priority: ${f.priority}<br>
            Message: ${f.message}
          </div>
        `).join("")}
      </div>
    `;
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("aiFollowupAgentPanel")) return;

    const panel = document.createElement("div");
    panel.id = "aiFollowupAgentPanel";
    panel.className = "card ai-panel";

    panel.innerHTML = `
      <div class="section-title">🔁 AI Follow-up Automation Agent</div>
      <p class="muted">
        Generate follow-up schedules, CRM next actions, lead priority, and supplier/buyer reminder plans.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:18px;">
        <input id="followLeadName" class="input" placeholder="Lead / Supplier Name">

        <select id="followLeadType" class="input">
          <option>Supplier</option>
          <option>Buyer</option>
          <option>Agent</option>
          <option>Distributor</option>
        </select>

        <input id="followProduct" class="input" placeholder="Product">
        <input id="followLastContact" class="input" placeholder="Last Contact Note">

        <select id="followStage" class="input">
          <option>New Lead</option>
          <option>Contacted</option>
          <option>Negotiation</option>
          <option>Closed</option>
          <option>Lost</option>
        </select>

        <select id="followUrgency" class="input">
          <option>High</option>
          <option selected>Medium</option>
          <option>Low</option>
        </select>
      </div>

      <button class="btn" onclick="TradeFlowAIFollowup.generate()" style="margin-top:16px;">
        Generate Follow-up Plan
      </button>

      <div id="aiFollowupStatus" style="margin-top:14px;color:#7dd3fc;font-weight:900;">
        AI follow-up agent ready.
      </div>

      <div id="aiFollowupResults" style="margin-top:20px;"></div>
    `;

    dashboard.appendChild(panel);
  }

  window.TradeFlowAIFollowup = {
    generate: generatePlan
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