/* TradeFlow AI CRM Forecasting Engine */

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
    const el = $("aiCrmForecastStatus");
    if (el) el.innerText = text;
  }

  async function runForecast() {
    try {
      const payload = {
        dealName: $("crmForecastDealName")?.value || "Trade Deal",
        dealValue: Number($("crmForecastDealValue")?.value || 0),
        stage: $("crmForecastStage")?.value || "New Lead",
        lastContactDays: Number($("crmForecastLastContact")?.value || 0),
        supplierScore: Number($("crmForecastSupplierScore")?.value || 70),
        urgency: $("crmForecastUrgency")?.value || "Medium"
      };

      setStatus("AI is forecasting CRM deal probability...");

      const res = await fetch(`${getBackendUrl()}/api/ai-crm-forecast-agent/forecast`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Forecast failed");

      renderForecast(data.forecast);
      setStatus("CRM forecast completed.");
    } catch (error) {
      setStatus(error.message || "AI CRM forecast failed.");
    }
  }

  function renderForecast(forecast) {
    const box = $("aiCrmForecastResults");
    if (!box) return;

    box.innerHTML = `
      <div class="supplier-card">
        <h2 style="color:white;margin:0 0 10px;">📈 ${forecast.dealName}</h2>

        <div class="deal"><b>Stage:</b> ${forecast.stage}</div>
        <div class="deal"><b>Conversion Probability:</b> ${forecast.probability}%</div>
        <div class="deal"><b>Expected Revenue:</b> ₹${forecast.expectedRevenue}</div>
        <div class="deal"><b>Risk Level:</b> ${forecast.riskLevel}</div>
        <div class="deal"><b>Pipeline Health:</b> ${forecast.pipelineHealth}</div>
        <div class="deal"><b>Next Action:</b> ${forecast.nextAction}</div>

        <h2 style="color:white;margin:18px 0 10px;">🧠 AI Insights</h2>
        ${(forecast.aiInsights || []).map(i => `
          <div class="deal" style="margin-bottom:8px;">• ${i}</div>
        `).join("")}
      </div>
    `;
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("aiCrmForecastPanel")) return;

    const panel = document.createElement("div");
    panel.id = "aiCrmForecastPanel";
    panel.className = "card ai-panel";

    panel.innerHTML = `
      <div class="section-title">📈 AI CRM Forecasting Agent</div>
      <p class="muted">
        Predict deal probability, revenue, risk level, next action, and pipeline health.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:18px;">
        <input id="crmForecastDealName" class="input" placeholder="Deal Name">
        <input id="crmForecastDealValue" class="input" type="number" placeholder="Deal Value">

        <select id="crmForecastStage" class="input">
          <option>New Lead</option>
          <option>Contacted</option>
          <option>Negotiation</option>
          <option>Closed</option>
          <option>Lost</option>
        </select>

        <input id="crmForecastLastContact" class="input" type="number" placeholder="Last Contact Days">
        <input id="crmForecastSupplierScore" class="input" type="number" placeholder="Supplier Score">

        <select id="crmForecastUrgency" class="input">
          <option>High</option>
          <option selected>Medium</option>
          <option>Low</option>
        </select>
      </div>

      <button class="btn" onclick="TradeFlowAICrmForecast.run()" style="margin-top:16px;">
        Run CRM Forecast
      </button>

      <div id="aiCrmForecastStatus" style="margin-top:14px;color:#7dd3fc;font-weight:900;">
        AI CRM forecasting ready.
      </div>

      <div id="aiCrmForecastResults" style="margin-top:20px;"></div>
    `;

    dashboard.appendChild(panel);
  }

  window.TradeFlowAICrmForecast = {
    run: runForecast
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