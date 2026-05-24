/* TradeFlow AI Autonomous Operations Engine */

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function safeJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  }

  function getSuppliers() {
    return safeJson("suppliers");
  }

  function getDeals() {
    return safeJson("crmDeals");
  }

  function getTasks() {
    return safeJson("tasks");
  }

  function saveTasks(tasks) {
    localStorage.setItem("tasks", JSON.stringify(tasks || []));
  }

  function toast(message, type = "ai") {
    if (window.TradeFlowPremiumUX) {
      TradeFlowPremiumUX.toast(message, type);
    } else {
      alert(message);
    }
  }

  function scoreSupplier(supplier) {
    let score = 50;

    if (supplier.email) score += 15;
    if (supplier.phone) score += 15;
    if (supplier.country) score += 10;
    if (supplier.product) score += 10;

    return Math.min(100, score);
  }

  function scoreDeal(deal) {
    let score = 40;

    const value = Number(deal.value || deal.dealValue || 0);

    if (value > 50000) score += 25;
    if (value > 10000) score += 15;

    const stage = deal.stage || deal.dealStage || "";

    if (stage.includes("Negotiation")) score += 25;
    if (stage.includes("Contacted")) score += 15;
    if (stage.includes("Closed")) score = 100;
    if (stage.includes("Lost")) score = 0;

    return Math.min(100, score);
  }

  function generateAutonomousActions() {
    const suppliers = getSuppliers();
    const deals = getDeals();
    const tasks = getTasks();

    const actions = [];

    suppliers.forEach((supplier) => {
      const score = scoreSupplier(supplier);

      if (score >= 80) {
        actions.push({
          type: "supplier",
          priority: "High",
          title: `High-quality supplier detected: ${supplier.name || supplier.supplierName || "Supplier"}`,
          recommendation: "Create outreach and move supplier into active negotiation workflow.",
          action: "create_supplier_followup"
        });
      }

      if (!supplier.email && !supplier.phone) {
        actions.push({
          type: "supplier",
          priority: "Medium",
          title: `Supplier needs enrichment: ${supplier.name || supplier.supplierName || "Supplier"}`,
          recommendation: "Use Live Supplier Intelligence to extract contact details.",
          action: "enrich_supplier"
        });
      }
    });

    deals.forEach((deal) => {
      const score = scoreDeal(deal);

      if (score >= 75) {
        actions.push({
          type: "crm",
          priority: "High",
          title: `Hot deal opportunity: ${deal.companyName || deal.dealCompanyName || "CRM Deal"}`,
          recommendation: "Send negotiation follow-up and push toward closure.",
          action: "create_deal_followup"
        });
      }

      if (score < 40) {
        actions.push({
          type: "crm",
          priority: "Low",
          title: `Weak deal detected: ${deal.companyName || deal.dealCompanyName || "CRM Deal"}`,
          recommendation: "Re-qualify this opportunity or replace with stronger lead.",
          action: "review_deal"
        });
      }
    });

    if (tasks.length > 8) {
      actions.push({
        type: "operations",
        priority: "High",
        title: "Operational overload detected",
        recommendation: "Create workflow automation to reduce repeated manual tasks.",
        action: "workflow_suggestion"
      });
    }

    if (!actions.length) {
      actions.push({
        type: "ai",
        priority: "Medium",
        title: "AI Growth Recommendation",
        recommendation: "Add suppliers, create CRM deals, and activate outreach to generate stronger intelligence.",
        action: "growth"
      });
    }

    return actions.slice(0, 8);
  }

  function createAutoTask(action) {
    const tasks = getTasks();

    const newTask = {
      id: Date.now(),
      title: action.title,
      relatedTo: action.type,
      priority: action.priority,
      status: "Pending",
      notes: action.recommendation,
      createdBy: "TradeFlow AI",
      createdAt: new Date().toISOString()
    };

    tasks.unshift(newTask);
    saveTasks(tasks);

    toast("AI created a recommended task.", "success");

    if (typeof renderTasks === "function") {
      renderTasks();
    }

    if (window.TradeFlowIntelligenceOS) {
      TradeFlowIntelligenceOS.refresh();
    }
  }

  function renderAutonomousOps() {
    const panel = $("aiAutonomousOperationsPanel");
    if (!panel) return;

    const actions = generateAutonomousActions();

    panel.innerHTML = `
      <div class="section-title">🤖 AI Autonomous Operations</div>

      <p class="muted">
        TradeFlow continuously analyzes suppliers, CRM deals, tasks, and operational pressure to recommend actions.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-top:18px;">
        ${actions.map((a, index) => `
          <div class="supplier-card tf-fade-in">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
              <h2 style="color:white;margin:0;font-size:17px;">
                ${a.title}
              </h2>
              <span class="status">
                ${a.priority}
              </span>
            </div>

            <p class="muted" style="margin-top:12px;">
              ${a.recommendation}
            </p>

            <div class="deal">
              Type: ${a.type.toUpperCase()}
            </div>

            <button class="btn" onclick="TradeFlowAutonomousOps.createTask(${index})">
              Create AI Task
            </button>
          </div>
        `).join("")}
      </div>
    `;

    window.TradeFlowAutonomousOps.currentActions = actions;
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("aiAutonomousOperationsPanel")) return;

    const panel = document.createElement("div");
    panel.id = "aiAutonomousOperationsPanel";
    panel.className = "card ai-panel";
    panel.style.marginBottom = "18px";

    const intelligencePanel = $("tradeflowIntelligencePanel");

    if (intelligencePanel && intelligencePanel.parentNode) {
      intelligencePanel.parentNode.insertBefore(panel, intelligencePanel.nextSibling);
    } else {
      dashboard.prepend(panel);
    }
  }

  function boot() {
    buildPanel();
    setTimeout(renderAutonomousOps, 1600);

    setInterval(renderAutonomousOps, 20000);
  }

  window.TradeFlowAutonomousOps = {
    currentActions: [],
    refresh: renderAutonomousOps,
    createTask: function (index) {
      const action = window.TradeFlowAutonomousOps.currentActions[index];
      if (action) createAutoTask(action);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();