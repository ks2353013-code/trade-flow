/* TradeFlow Intelligent Workflows + UX Perfection */

(function () {
  const STORAGE_KEY = "tradeflowWorkflowFeed";

  function $(id) {
    return document.getElementById(id);
  }

  function getFeed() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveFeed(feed) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feed.slice(0, 20)));
  }

  function addFeed(type, message) {
    const feed = getFeed();
    feed.unshift({
      type,
      message,
      time: new Date().toLocaleString()
    });
    saveFeed(feed);
    renderWorkflowFeed();
  }

  function injectWorkflowStyles() {
    if ($("workflowStyles")) return;

    const style = document.createElement("style");
    style.id = "workflowStyles";
    style.innerHTML = `
      .workflow-alert {
        padding: 16px;
        border-radius: 20px;
        background: linear-gradient(135deg, rgba(56,189,248,.14), rgba(139,92,246,.12));
        border: 1px solid rgba(125,211,252,.22);
        margin-bottom: 12px;
      }
      .workflow-alert b { color: #fff; }
      .workflow-feed-item {
        padding: 14px;
        border-radius: 18px;
        background: rgba(2,6,23,.55);
        border: 1px solid rgba(148,163,184,.14);
        margin-bottom: 10px;
      }
      .workflow-time {
        display:block;
        margin-top:6px;
        color:#94a3b8;
        font-size:12px;
      }
    `;
    document.head.appendChild(style);
  }

  function buildDashboardIntelligence() {
    const dashboard = $("dashboardPage");
    if (!dashboard || $("workflowDashboardPanel")) return;

    const panel = document.createElement("div");
    panel.id = "workflowDashboardPanel";
    panel.className = "grid grid-3";
    panel.innerHTML = `
      <div class="card ai-panel">
        <div class="section-title">🧠 AI Business Intelligence</div>
        <div class="workflow-alert"><b>Supplier Action:</b><br>Review high-potential suppliers and move serious leads into CRM.</div>
        <div class="workflow-alert"><b>CRM Action:</b><br>Follow up with negotiation-stage deals within 24 hours.</div>
        <div class="workflow-alert"><b>Outreach Action:</b><br>Use AI to prepare email + WhatsApp messages before contacting leads.</div>
      </div>

      <div class="card">
        <div class="section-title">⚡ Smart Workflow Actions</div>
        <button class="btn" onclick="TradeFlowWorkflows.createSupplierWorkflow()">Create Supplier Workflow</button>
        <button class="btn" onclick="TradeFlowWorkflows.createCrmWorkflow()">Create CRM Follow-up</button>
        <button class="btn" onclick="TradeFlowWorkflows.createExportWorkflow()">Create Export Checklist</button>
      </div>

      <div class="card">
        <div class="section-title">📡 Live Workflow Feed</div>
        <div id="workflowFeed"></div>
      </div>
    `;

    dashboard.appendChild(panel);
    renderWorkflowFeed();
  }

  function buildAIWorkflowPanel() {
    const aiPage = $("aiPage");
    if (!aiPage || $("aiWorkflowPanel")) return;

    const panel = document.createElement("div");
    panel.id = "aiWorkflowPanel";
    panel.className = "card ai-panel";
    panel.innerHTML = `
      <div class="section-title">🚀 AI Operating System Workflow Engine</div>
      <p class="muted">
        Turn TradeFlow into a smart operator: supplier scoring, CRM next actions, outreach planning, and export task automation.
      </p>

      <div class="grid grid-3" style="margin-top:16px;">
        <button class="btn" onclick="TradeFlowWorkflows.createSupplierWorkflow()">🌍 Supplier Intelligence Workflow</button>
        <button class="btn" onclick="TradeFlowWorkflows.createCrmWorkflow()">📈 CRM Intelligence Workflow</button>
        <button class="btn" onclick="TradeFlowWorkflows.createOutreachWorkflow()">📧 Outreach Automation Workflow</button>
        <button class="btn" onclick="TradeFlowWorkflows.createExportWorkflow()">📄 Export Document Workflow</button>
        <button class="btn" onclick="TradeFlowWorkflows.createRiskWorkflow()">🛡️ Risk & Verification Workflow</button>
        <button class="btn" onclick="TradeFlowWorkflows.clearWorkflowFeed()">🧹 Clear Workflow Feed</button>
      </div>
    `;

    aiPage.appendChild(panel);
  }

  function renderWorkflowFeed() {
    const box = $("workflowFeed");
    if (!box) return;

    const feed = getFeed();

    if (!feed.length) {
      box.innerHTML = `<div class="deal">No workflow activity yet. Start from Smart Workflow Actions.</div>`;
      return;
    }

    box.innerHTML = feed.map(item => `
      <div class="workflow-feed-item">
        <b>${item.type}</b><br>
        ${item.message}
        <span class="workflow-time">${item.time}</span>
      </div>
    `).join("");
  }

  window.TradeFlowWorkflows = {
    createSupplierWorkflow() {
      addFeed("🌍 Supplier Intelligence", "AI suggests: verify supplier score, check country risk, prepare outreach, then move hot leads into CRM.");
      alert("Supplier workflow created.");
    },

    createCrmWorkflow() {
      addFeed("📈 CRM Intelligence", "AI suggests: follow up with active deals, prioritize high-value leads, and move serious buyers to Negotiation.");
      alert("CRM workflow created.");
    },

    createOutreachWorkflow() {
      addFeed("📧 Outreach Automation", "AI suggests: generate email, WhatsApp message, and 24-hour follow-up reminder for selected leads.");
      alert("Outreach workflow created.");
    },

    createExportWorkflow() {
      addFeed("📄 Export Checklist", "AI suggests: prepare invoice, packing list, certificate of origin, IEC/GST details, and shipping documents.");
      alert("Export workflow created.");
    },

    createRiskWorkflow() {
      addFeed("🛡️ Risk Intelligence", "AI suggests: check supplier verification, payment terms, country risk, and buyer credibility before deal closure.");
      alert("Risk workflow created.");
    },

    clearWorkflowFeed() {
      localStorage.removeItem(STORAGE_KEY);
      renderWorkflowFeed();
      alert("Workflow feed cleared.");
    }
  };

  function bootWorkflows() {
    injectWorkflowStyles();
    buildDashboardIntelligence();
    buildAIWorkflowPanel();
    renderWorkflowFeed();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootWorkflows);
  } else {
    bootWorkflows();
  }
})();