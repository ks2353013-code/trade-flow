/* TradeFlow AI Operations Center */

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function showPanel(panelId) {
    const panels = [
      "aiSupplierFinderPanel",
      "aiOutreachWriterPanel",
      "aiFollowupAgentPanel",
      "aiCrmForecastPanel"
    ];

    panels.forEach((id) => {
      const el = $(id);
      if (el) el.style.display = id === panelId ? "block" : "none";
    });

    const target = $(panelId);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildCenter() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("aiOperationsCenter")) return;

    const panel = document.createElement("div");
    panel.id = "aiOperationsCenter";
    panel.className = "card ai-panel";

    panel.innerHTML = `
      <div class="section-title">🧠 AI Operations Center</div>
      <p class="muted">
        Unified command center for supplier intelligence, outreach, follow-ups, CRM forecasting, and trade automation.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:18px;">
        <div class="supplier-card">
          <h2 style="color:white;margin:0 0 8px;">🤖 Supplier Finder</h2>
          <p class="muted">Find and score supplier opportunities.</p>
          <button class="btn" onclick="TradeFlowAIOps.open('aiSupplierFinderPanel')">Open Agent</button>
        </div>

        <div class="supplier-card">
          <h2 style="color:white;margin:0 0 8px;">✍️ Outreach Writer</h2>
          <p class="muted">Generate email, WhatsApp, negotiation and follow-up messages.</p>
          <button class="btn" onclick="TradeFlowAIOps.open('aiOutreachWriterPanel')">Open Agent</button>
        </div>

        <div class="supplier-card">
          <h2 style="color:white;margin:0 0 8px;">🔁 Follow-up Planner</h2>
          <p class="muted">Create lead follow-up schedules and CRM next actions.</p>
          <button class="btn" onclick="TradeFlowAIOps.open('aiFollowupAgentPanel')">Open Agent</button>
        </div>

        <div class="supplier-card">
          <h2 style="color:white;margin:0 0 8px;">📈 CRM Forecasting</h2>
          <p class="muted">Predict deal probability, revenue, risk, and pipeline health.</p>
          <button class="btn" onclick="TradeFlowAIOps.open('aiCrmForecastPanel')">Open Agent</button>
        </div>
      </div>

      <div class="supplier-card" style="margin-top:18px;">
        <h2 style="color:white;margin:0 0 8px;">🚀 AI Operating Flow</h2>
        <div class="deal">1. Find supplier opportunities</div>
        <div class="deal">2. Generate outreach</div>
        <div class="deal">3. Plan follow-ups</div>
        <div class="deal">4. Forecast CRM conversion</div>
        <div class="deal">5. Push high-probability deals toward negotiation</div>
      </div>
    `;

    dashboard.prepend(panel);
  }

  function hideAgentPanelsInitially() {
    setTimeout(() => {
      [
        "aiSupplierFinderPanel",
        "aiOutreachWriterPanel",
        "aiFollowupAgentPanel",
        "aiCrmForecastPanel"
      ].forEach((id) => {
        const el = $(id);
        if (el) el.style.display = "none";
      });
    }, 1600);
  }

  window.TradeFlowAIOps = {
    open: showPanel
  };

  function boot() {
    buildCenter();
    hideAgentPanelsInitially();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();