/* TradeFlow AI Growth Opportunity Engine */

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

  function calculateReadiness(suppliers, deals, tasks) {
    let score = 35;

    score += Math.min(suppliers.length * 5, 25);
    score += Math.min(deals.length * 6, 25);
    score += Math.min(tasks.length * 2, 15);

    return Math.min(score, 100);
  }

  function buildOpportunities() {
    const suppliers = getSuppliers();
    const deals = getDeals();
    const tasks = getTasks();

    const readiness = calculateReadiness(suppliers, deals, tasks);

    const opportunities = [];

    if (suppliers.length < 10) {
      opportunities.push({
        icon: "🌍",
        title: "Supplier Network Expansion",
        impact: "High",
        text: "Add and enrich more suppliers to increase sourcing strength and negotiation leverage."
      });
    }

    if (deals.length < 5) {
      opportunities.push({
        icon: "📈",
        title: "CRM Pipeline Growth",
        impact: "High",
        text: "Create more active CRM deals to improve sales predictability and revenue forecasting."
      });
    }

    if (tasks.length > 6) {
      opportunities.push({
        icon: "⚙️",
        title: "Workflow Automation Opportunity",
        impact: "Medium",
        text: "Task volume is increasing. Convert repeated actions into automated workflows."
      });
    }

    opportunities.push({
      icon: "💎",
      title: "Enterprise Readiness Score",
      impact: `${readiness}%`,
      text: readiness >= 75
        ? "Your workspace is moving toward enterprise-ready operational maturity."
        : "Complete onboarding, add suppliers, create deals, and activate workflows to increase readiness."
    });

    return { readiness, opportunities };
  }

  function render() {
    const panel = $("aiGrowthOpportunityPanel");
    if (!panel) return;

    const data = buildOpportunities();

    panel.innerHTML = `
      <div class="section-title">🚀 AI Growth Opportunity Engine</div>
      <p class="muted">
        TradeFlow analyzes your workspace and identifies revenue, operations, supplier, and automation growth opportunities.
      </p>

      <div class="supplier-card" style="margin-top:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">
          <div>
            <h2 style="color:white;margin:0;">Enterprise Readiness</h2>
            <p class="muted">Overall workspace maturity and commercial readiness.</p>
          </div>
          <div style="font-size:38px;font-weight:900;color:white;">
            ${data.readiness}%
          </div>
        </div>

        <div style="height:12px;background:rgba(148,163,184,.18);border-radius:999px;overflow:hidden;margin-top:14px;">
          <div style="height:100%;width:${data.readiness}%;background:linear-gradient(90deg,#38bdf8,#8b5cf6,#22c55e);"></div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-top:18px;">
        ${data.opportunities.map(o => `
          <div class="supplier-card tf-fade-in">
            <div style="font-size:30px;margin-bottom:10px;">${o.icon}</div>
            <h2 style="color:white;margin:0 0 8px;font-size:18px;">${o.title}</h2>
            <span class="status">Impact: ${o.impact}</span>
            <p class="muted" style="margin-top:12px;">${o.text}</p>
          </div>
        `).join("")}
      </div>
    `;
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("aiGrowthOpportunityPanel")) return;

    const panel = document.createElement("div");
    panel.id = "aiGrowthOpportunityPanel";
    panel.className = "card ai-panel";
    panel.style.marginBottom = "18px";

    const daily = $("aiDailyCommandCenter");

    if (daily && daily.parentNode) {
      daily.parentNode.insertBefore(panel, daily.nextSibling);
    } else {
      dashboard.prepend(panel);
    }
  }

  function boot() {
    buildPanel();
    setTimeout(render, 1800);
    setInterval(render, 30000);
  }

  window.TradeFlowGrowthEngine = {
    refresh: render
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();