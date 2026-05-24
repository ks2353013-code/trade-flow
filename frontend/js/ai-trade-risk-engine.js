/* TradeFlow AI Trade Risk Analyzer */

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
    const el = $("aiTradeRiskStatus");
    if (el) el.innerText = text;
  }

  function riskColor(level) {
    if (level === "High") return "#ef4444";
    if (level === "Medium") return "#f59e0b";
    return "#10b981";
  }

  async function analyzeRisk() {
    try {
      const payload = {
        supplierName: $("riskSupplierName")?.value || "Supplier",
        country: $("riskCountry")?.value || "India",
        paymentMethod: $("riskPaymentMethod")?.value || "Advance",
        shipmentType: $("riskShipmentType")?.value || "Sea",
        orderValue: Number($("riskOrderValue")?.value || 0),
        supplierScore: Number($("riskSupplierScore")?.value || 70)
      };

      setStatus("AI is analyzing trade risk...");

      const res = await fetch(`${getBackendUrl()}/api/ai-trade-risk-agent/analyze`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Trade risk analysis failed");
      }

      renderAnalysis(data.analysis);
      setStatus("Trade risk analysis completed.");
    } catch (error) {
      setStatus(error.message || "AI trade risk failed.");
    }
  }

  function renderAnalysis(a) {
    const box = $("aiTradeRiskResults");
    if (!box) return;

    box.innerHTML = `
      <div class="supplier-card">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;">
          <h2 style="color:white;margin:0;">🛡 ${a.supplierName}</h2>
          <span class="status" style="background:${riskColor(a.riskLevel)};color:white;">
            ${a.riskLevel} Risk
          </span>
        </div>

        <div style="height:12px;background:rgba(148,163,184,.18);border-radius:999px;overflow:hidden;margin-top:14px;">
          <div style="height:100%;width:${a.riskScore}%;background:${riskColor(a.riskLevel)};"></div>
        </div>

        <p class="muted" style="margin-top:10px;">
          Risk Score: ${a.riskScore}/100
        </p>

        <div class="deal"><b>Country:</b> ${a.country}</div>
        <div class="deal"><b>Payment Method:</b> ${a.paymentMethod}</div>
        <div class="deal"><b>Shipment Type:</b> ${a.shipmentType}</div>
        <div class="deal"><b>Order Value:</b> ₹${a.orderValue}</div>
        <div class="deal"><b>Supplier Score:</b> ${a.supplierScore}</div>

        <h2 style="color:white;margin:18px 0 10px;">🧠 AI Insights</h2>
        ${(a.aiInsights || []).map(i => `<div class="deal">• ${i}</div>`).join("")}

        <h2 style="color:white;margin:18px 0 10px;">✅ Recommendations</h2>
        ${(a.recommendations || []).map(r => `<div class="deal">• ${r}</div>`).join("")}

        <h2 style="color:white;margin:18px 0 10px;">📌 Operational Advice</h2>
        <div class="deal">${a.operationalAdvice}</div>
      </div>
    `;
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("aiTradeRiskPanel")) return;

    const panel = document.createElement("div");
    panel.id = "aiTradeRiskPanel";
    panel.className = "card ai-panel";

    panel.innerHTML = `
      <div class="section-title">🛡 AI Trade Risk Analyzer</div>
      <p class="muted">
        Analyze supplier risk, payment risk, shipment risk, fraud probability, and operational trade safety.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:18px;">
        <input id="riskSupplierName" class="input" placeholder="Supplier Name">
        <input id="riskCountry" class="input" placeholder="Country">
        <input id="riskOrderValue" class="input" type="number" placeholder="Order Value">
        <input id="riskSupplierScore" class="input" type="number" placeholder="Supplier Score">

        <select id="riskPaymentMethod" class="input">
          <option>Advance</option>
          <option>LC</option>
          <option>Escrow</option>
          <option>Credit</option>
          <option>COD</option>
        </select>

        <select id="riskShipmentType" class="input">
          <option>Sea</option>
          <option>Air</option>
          <option>Road</option>
          <option>Rail</option>
        </select>
      </div>

      <button class="btn" onclick="TradeFlowAITradeRisk.analyze()" style="margin-top:16px;">
        Analyze Trade Risk
      </button>

      <div id="aiTradeRiskStatus" style="margin-top:14px;color:#7dd3fc;font-weight:900;">
        AI trade risk analyzer ready.
      </div>

      <div id="aiTradeRiskResults" style="margin-top:20px;"></div>
    `;

    dashboard.appendChild(panel);
  }

  window.TradeFlowAITradeRisk = {
    analyze: analyzeRisk
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