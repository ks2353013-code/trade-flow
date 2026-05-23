/* TradeFlow AI Automation Engine */

(function () {
  const AUTO_LOG_KEY = "tradeflowAutomationLog";
  const AUTO_PLAN_KEY = "tradeflowDailyAutomationPlan";

  function $(id) {
    return document.getElementById(id);
  }

  function getJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function now() {
    return new Date().toLocaleString();
  }

  function readNumber(id) {
    const el = $(id);
    if (!el) return 0;
    return Number((el.innerText || "0").replace(/[^\d.-]/g, "")) || 0;
  }

  function getWorkspaceSnapshot() {
    return {
      suppliers: readNumber("supplierCount"),
      deals: readNumber("dashboardDealCount"),
      pipeline: readNumber("dashboardPipelineValue"),
      closed: readNumber("dashboardClosedDeals"),
      alerts: readNumber("dashboardUnreadNotifications"),
      workspaces: readNumber("dashboardWorkspaceCount"),
      activeWorkspace: localStorage.getItem("tradeflowActiveWorkspaceName") || "None"
    };
  }

  function addAutomationLog(type, message, status = "Suggested") {
    const log = getJson(AUTO_LOG_KEY, []);
    log.unshift({
      type,
      message,
      status,
      time: now()
    });
    setJson(AUTO_LOG_KEY, log.slice(0, 40));
    renderAutomationLog();

    if (window.TradeFlowDashboardLive && typeof window.TradeFlowDashboardLive.addLiveEvent === "function") {
      window.TradeFlowDashboardLive.addLiveEvent(type, message, status === "Urgent" ? "High" : "Medium");
    }

    if (window.TradeFlowAIChat && typeof window.TradeFlowAIChat.addBusinessFeed === "function") {
      window.TradeFlowAIChat.addBusinessFeed(type, message);
    }
  }

  function buildDailyPlan() {
    const s = getWorkspaceSnapshot();
    const plan = [];

    if (s.suppliers === 0) {
      plan.push("Add 5 supplier or buyer leads to activate intelligence.");
    } else {
      plan.push("Review supplier intelligence and shortlist top leads.");
    }

    if (s.deals === 0) {
      plan.push("Create CRM records for serious supplier/buyer conversations.");
    } else {
      plan.push("Use AI Deal Advice on open CRM opportunities.");
    }

    if (s.pipeline === 0) {
      plan.push("Add deal values to track pipeline health and revenue potential.");
    } else {
      plan.push("Prioritize high-value pipeline opportunities for follow-up.");
    }

    if (s.alerts > 0) {
      plan.push("Clear unread notifications and handle priority alerts.");
    } else {
      plan.push("Create new outreach activity because notification center is clear.");
    }

    plan.push("Generate one outreach email and one WhatsApp message using AI.");
    plan.push("Prepare export document checklist for any negotiation-stage deal.");

    return plan;
  }

  function setAIConsole(text) {
    const box = $("tradeflowAiConsole");
    if (box) box.value = text;
  }

  function injectStyles() {
    if ($("automationEngineStyles")) return;

    const style = document.createElement("style");
    style.id = "automationEngineStyles";
    style.innerHTML = `
      .automation-engine-grid {
        display: grid;
        grid-template-columns: minmax(320px, 1.05fr) minmax(280px, .95fr);
        gap: 18px;
        margin-top: 20px;
      }

      .automation-log {
        max-height: 430px;
        overflow-y: auto;
        padding-right: 6px;
      }

      .automation-item {
        padding: 14px;
        border-radius: 18px;
        background: linear-gradient(135deg, rgba(15,23,42,.86), rgba(2,6,23,.62));
        border: 1px solid rgba(148,163,184,.15);
        margin-bottom: 10px;
      }

      .automation-status {
        display: inline-flex;
        margin-top: 8px;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(56,189,248,.12);
        border: 1px solid rgba(56,189,248,.24);
        color: #7dd3fc;
        font-size: 12px;
        font-weight: 900;
      }

      .automation-plan-list {
        display: grid;
        gap: 10px;
        margin-top: 14px;
      }

      .automation-plan-step {
        padding: 13px;
        border-radius: 17px;
        background: rgba(2,6,23,.56);
        border: 1px solid rgba(148,163,184,.14);
      }

      @media(max-width:900px){
        .automation-engine-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function renderAutomationLog() {
    const box = $("automationLogList");
    if (!box) return;

    const log = getJson(AUTO_LOG_KEY, []);

    if (!log.length) {
      box.innerHTML = `<div class="deal">No automation activity yet. Generate a daily plan or automation action.</div>`;
      return;
    }

    box.innerHTML = log.map(item => `
      <div class="automation-item">
        <b>${item.type}</b><br>
        ${item.message}
        <br><span class="muted">${item.time}</span>
        <br><span class="automation-status">${item.status}</span>
      </div>
    `).join("");
  }

  function renderDailyPlan() {
    const box = $("automationDailyPlan");
    if (!box) return;

    const plan = getJson(AUTO_PLAN_KEY, []);

    if (!plan.length) {
      box.innerHTML = `<div class="deal">No daily automation plan yet.</div>`;
      return;
    }

    box.innerHTML = `
      <div class="automation-plan-list">
        ${plan.map((step, index) => `
          <div class="automation-plan-step">
            <b>Step ${index + 1}</b><br>
            ${step}
          </div>
        `).join("")}
      </div>
    `;
  }

  function generateDailyPlan() {
    const plan = buildDailyPlan();
    setJson(AUTO_PLAN_KEY, plan);

    const text = `⚙️ TradeFlow AI Daily Automation Plan\n\n${plan.map((step, i) => `${i + 1}. ${step}`).join("\n")}`;
    setAIConsole(text);

    addAutomationLog("⚙️ Daily Automation Plan", "Generated AI daily execution plan for workspace.", "Ready");
    renderDailyPlan();
  }

  function suggestFollowUps() {
    const s = getWorkspaceSnapshot();

    let message = "";

    if (s.deals === 0) {
      message = "No CRM deals found. Create deals before follow-up automation can run.";
    } else {
      message = `AI recommends follow-ups for active CRM deals. Prioritize high-value pipeline: ${s.pipeline}.`;
    }

    setAIConsole(`📞 AI Follow-up Automation\n\n${message}\n\nSuggested follow-up timing:\n• New leads: today\n• Contacted: within 24 hours\n• Negotiation: within 12 hours\n• Lost: reactivate after 30 days`);

    addAutomationLog("📞 Follow-up Automation", message, s.deals === 0 ? "Suggested" : "Ready");
  }

  function createOutreachAutomation() {
    const message = "AI prepared outreach workflow: generate email, generate WhatsApp message, send first contact, then schedule 24-hour follow-up.";

    setAIConsole(`📧 AI Outreach Automation\n\n${message}\n\nBest workflow:\n1. Generate supplier/buyer email.\n2. Copy to outreach center.\n3. Send WhatsApp follow-up.\n4. Save response in CRM.\n5. Move qualified lead to Negotiation.`);

    addAutomationLog("📧 Outreach Automation", message, "Ready");
  }

  function createSupplierToCrmAutomation() {
    const s = getWorkspaceSnapshot();

    const message = s.suppliers > 0
      ? "AI suggests moving hot supplier leads into CRM after verification."
      : "No suppliers available. Add supplier leads before supplier-to-CRM automation.";

    setAIConsole(`🌍 Supplier → CRM Automation\n\n${message}\n\nQualification rules:\n• Email exists\n• Phone exists\n• Country/product clear\n• Supplier score above 70\n• Notes or source available\n\nNext action:\nMove qualified supplier into CRM as active opportunity.`);

    addAutomationLog("🌍 Supplier to CRM", message, s.suppliers > 0 ? "Ready" : "Suggested");
  }

  function createDocumentAutomation() {
    const message = "AI created export document automation checklist for negotiation or closed deals.";

    setAIConsole(`📄 Export Document Automation\n\n${message}\n\nAuto-checklist:\n1. Commercial Invoice\n2. Packing List\n3. Proforma Invoice\n4. Purchase Order\n5. Certificate of Origin\n6. Shipping Bill\n7. Bill of Lading / Airway Bill\n8. Insurance Certificate\n9. IEC / GST details\n10. Product-specific certificates`);

    addAutomationLog("📄 Document Automation", message, "Ready");
  }

  function createRiskAutomation() {
    const message = "AI generated risk automation rules for supplier, buyer, and payment verification.";

    setAIConsole(`🛡️ Risk Automation Engine\n\n${message}\n\nRisk rules:\n• Flag missing email/phone\n• Flag unrealistic pricing\n• Verify payment terms\n• Request company documents\n• Avoid closing without proof\n• Recheck country compliance before shipment`);

    addAutomationLog("🛡️ Risk Automation", message, "Ready");
  }

  function clearAutomationLog() {
    localStorage.removeItem(AUTO_LOG_KEY);
    renderAutomationLog();
  }

  function buildAutomationPanel() {
    const aiPage = $("aiPage");
    if (!aiPage || $("automationEnginePanel")) return;

    const panel = document.createElement("div");
    panel.id = "automationEnginePanel";
    panel.className = "card ai-panel";
    panel.innerHTML = `
      <div class="section-title">⚙️ TradeFlow AI Automation Engine</div>
      <p class="muted">
        Convert intelligence into action: daily plans, follow-ups, supplier-to-CRM movement, outreach, documents, and risk checks.
      </p>

      <div class="automation-engine-grid">
        <div>
          <div class="grid grid-3">
            <button class="btn" onclick="TradeFlowAutomation.generateDailyPlan()">⚙️ Daily Automation Plan</button>
            <button class="btn" onclick="TradeFlowAutomation.suggestFollowUps()">📞 Follow-up Automation</button>
            <button class="btn" onclick="TradeFlowAutomation.createOutreach()">📧 Outreach Automation</button>
            <button class="btn" onclick="TradeFlowAutomation.supplierToCrm()">🌍 Supplier → CRM</button>
            <button class="btn" onclick="TradeFlowAutomation.documents()">📄 Document Automation</button>
            <button class="btn" onclick="TradeFlowAutomation.risk()">🛡️ Risk Automation</button>
          </div>

          <div style="margin-top:18px;">
            <div class="section-title">🗓️ Daily Execution Plan</div>
            <div id="automationDailyPlan"></div>
          </div>
        </div>

        <div>
          <div class="section-title">📡 Automation Execution Log</div>
          <div id="automationLogList" class="automation-log"></div>
          <button class="mini-btn" onclick="TradeFlowAutomation.clear()">Clear Automation Log</button>
        </div>
      </div>
    `;

    aiPage.appendChild(panel);
    renderDailyPlan();
    renderAutomationLog();
  }

  function buildDashboardAutomationPanel() {
    const dashboard = $("dashboardPage");
    if (!dashboard || $("dashboardAutomationPanel")) return;

    const panel = document.createElement("div");
    panel.id = "dashboardAutomationPanel";
    panel.className = "card ai-panel";
    panel.innerHTML = `
      <div class="section-title">⚙️ AI Automation Control</div>
      <p class="muted">Quick automation actions for daily trade operations.</p>

      <div class="grid grid-3" style="margin-top:14px;">
        <button class="btn" onclick="TradeFlowAutomation.generateDailyPlan()">Generate Daily Plan</button>
        <button class="btn" onclick="TradeFlowAutomation.suggestFollowUps()">Suggest Follow-ups</button>
        <button class="btn" onclick="TradeFlowAutomation.createOutreach()">Prepare Outreach Workflow</button>
      </div>
    `;

    dashboard.appendChild(panel);
  }

  window.TradeFlowAutomation = {
    generateDailyPlan,
    suggestFollowUps,
    createOutreach: createOutreachAutomation,
    supplierToCrm: createSupplierToCrmAutomation,
    documents: createDocumentAutomation,
    risk: createRiskAutomation,
    clear: clearAutomationLog,
    log: addAutomationLog
  };

  function boot() {
    injectStyles();
    buildAutomationPanel();
    buildDashboardAutomationPanel();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
