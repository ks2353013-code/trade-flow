/* TradeFlow Strategic Control Tower */

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function safeJson(key, fallback = []) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function getSuppliers() {
    return safeJson("suppliers", []);
  }

  function getDeals() {
    return safeJson("crmDeals", []);
  }

  function getTasks() {
    return safeJson("tasks", []);
  }

  function getTimeline() {
    return safeJson("tradeflowOperationalTimeline", []);
  }

  function calculateControlData() {
    const suppliers = getSuppliers();
    const deals = getDeals();
    const tasks = getTasks();
    const timeline = getTimeline();

    const pendingTasks = tasks.filter(
      t => !(t.status || "").toLowerCase().includes("complete")
    ).length;

    const closedDeals = deals.filter(
      d => (d.stage || d.dealStage || "").toLowerCase().includes("closed")
    ).length;

    const pipelineValue = deals.reduce((sum, d) => {
      return sum + Number(d.value || d.dealValue || 0);
    }, 0);

    const automationEvents = timeline.filter(
      e => ["Workflow", "Automation"].includes(e.type)
    ).length;

    const outreachEvents = timeline.filter(
      e => e.type === "Outreach"
    ).length;

    const supplierScore = Math.min(100, suppliers.length * 8);
    const crmScore = Math.min(100, deals.length * 10 + closedDeals * 15);
    const executionScore = Math.max(0, 100 - pendingTasks * 8);
    const automationScore = Math.min(100, automationEvents * 12 + outreachEvents * 8);

    const maturityScore = Math.round(
      (supplierScore + crmScore + executionScore + automationScore) / 4
    );

    const riskLevel =
      maturityScore >= 75
        ? "Low"
        : maturityScore >= 45
        ? "Medium"
        : "High";

    return {
      suppliers,
      deals,
      tasks,
      timeline,
      pendingTasks,
      closedDeals,
      pipelineValue,
      automationEvents,
      outreachEvents,
      supplierScore,
      crmScore,
      executionScore,
      automationScore,
      maturityScore,
      riskLevel
    };
  }

  function getStrategicAlerts(data) {
    const alerts = [];

    if (data.suppliers.length < 5) {
      alerts.push({
        icon: "🌍",
        title: "Supplier Base Needs Expansion",
        text: "Supplier depth is still low. Expand sourcing to improve negotiation leverage.",
        severity: "High"
      });
    }

    if (data.deals.length < 3) {
      alerts.push({
        icon: "📈",
        title: "CRM Pipeline Is Thin",
        text: "Create more active trade opportunities to improve revenue predictability.",
        severity: "High"
      });
    }

    if (data.pendingTasks > 8) {
      alerts.push({
        icon: "⚠️",
        title: "Execution Pressure Rising",
        text: "Pending tasks are increasing. Use workflow automation to protect execution speed.",
        severity: "Medium"
      });
    }

    if (data.automationEvents < 3) {
      alerts.push({
        icon: "⚙️",
        title: "Automation Underused",
        text: "Your workspace has automation potential. Add more workflow rules to reduce manual work.",
        severity: "Medium"
      });
    }

    if (!alerts.length) {
      alerts.push({
        icon: "✅",
        title: "Strategic Health Stable",
        text: "TradeFlow detects a balanced operational state. Continue scaling supplier, CRM, and automation activity.",
        severity: "Low"
      });
    }

    return alerts;
  }

  function scoreCard(title, score, note) {
    return `
      <div class="supplier-card tf-fade-in">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
          <div>
            <h2 style="color:white;margin:0;font-size:18px;">${title}</h2>
            <p class="muted" style="margin:6px 0 0;">${note}</p>
          </div>
          <div style="font-size:30px;font-weight:900;color:white;">
            ${score}
          </div>
        </div>

        <div style="height:10px;background:rgba(148,163,184,.18);border-radius:999px;overflow:hidden;margin-top:14px;">
          <div style="height:100%;width:${score}%;background:linear-gradient(90deg,#38bdf8,#8b5cf6,#22c55e);"></div>
        </div>
      </div>
    `;
  }

  function renderTower() {
    const panel = $("strategicControlTowerPanel");
    if (!panel) return;

    const data = calculateControlData();
    const alerts = getStrategicAlerts(data);

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap;">
        <div>
          <div class="section-title">🏛 TradeFlow Strategic Control Tower</div>
          <p class="muted">
            CEO-level cockpit for operational maturity, execution pressure, supplier depth, CRM health, automation strength, and strategic risk.
          </p>
        </div>

        <div style="
          width:140px;
          height:140px;
          border-radius:999px;
          display:flex;
          align-items:center;
          justify-content:center;
          flex-direction:column;
          background:radial-gradient(circle at top,rgba(56,189,248,.35),rgba(15,23,42,.95));
          border:2px solid rgba(56,189,248,.35);
          box-shadow:0 24px 80px rgba(0,0,0,.45);
        ">
          <div style="font-size:44px;font-weight:900;color:white;line-height:1;">
            ${data.maturityScore}
          </div>
          <div style="color:#cbd5e1;font-weight:800;margin-top:6px;">
            Maturity
          </div>
        </div>
      </div>

      <div class="supplier-card" style="margin-top:18px;">
        <div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;align-items:center;">
          <div>
            <h2 style="color:white;margin:0;">Enterprise Risk Level</h2>
            <p class="muted">Based on supplier depth, CRM strength, execution pressure, and automation usage.</p>
          </div>
          <span class="status">${data.riskLevel}</span>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-top:18px;">
        ${scoreCard("Supplier Depth", data.supplierScore, `${data.suppliers.length} suppliers tracked`)}
        ${scoreCard("CRM Strength", data.crmScore, `${data.deals.length} deals, ${data.closedDeals} closed`)}
        ${scoreCard("Execution Health", data.executionScore, `${data.pendingTasks} pending tasks`)}
        ${scoreCard("Automation Strength", data.automationScore, `${data.automationEvents} automation events`)}
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:18px;">
        <div class="supplier-card">
          <h2 style="color:white;margin:0;">₹${data.pipelineValue}</h2>
          <p class="muted">Tracked Pipeline Value</p>
        </div>

        <div class="supplier-card">
          <h2 style="color:white;margin:0;">${data.timeline.length}</h2>
          <p class="muted">Operational Timeline Events</p>
        </div>

        <div class="supplier-card">
          <h2 style="color:white;margin:0;">${data.outreachEvents}</h2>
          <p class="muted">Outreach Execution Signals</p>
        </div>
      </div>

      <div class="supplier-card" style="margin-top:18px;">
        <h2 style="color:white;margin-top:0;">🚨 Strategic Alerts</h2>
        ${alerts.map(a => `
          <div class="deal">
            ${a.icon} <b>${a.title}</b> — ${a.text}
            <br><span class="status">Severity: ${a.severity}</span>
          </div>
        `).join("")}
      </div>

      <div class="supplier-card" style="margin-top:18px;">
        <h2 style="color:white;margin-top:0;">🧭 Strategic Direction</h2>
        <div class="deal">Increase supplier network depth before scaling aggressive outreach.</div>
        <div class="deal">Move qualified suppliers into CRM opportunities faster.</div>
        <div class="deal">Use automation to convert repeated follow-ups into workflows.</div>
        <div class="deal">Track pipeline value and execution health daily through the command center.</div>
      </div>
    `;
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("strategicControlTowerPanel")) return;

    const panel = document.createElement("div");
    panel.id = "strategicControlTowerPanel";
    panel.className = "card ai-panel";
    panel.style.marginBottom = "18px";

    const brain = $("aiExecutiveWorkspaceBrainPanel");

    if (brain && brain.parentNode) {
      brain.parentNode.insertBefore(panel, brain.nextSibling);
    } else {
      dashboard.appendChild(panel);
    }
  }

  function boot() {
    buildPanel();
    setTimeout(renderTower, 2400);
    setInterval(renderTower, 40000);
  }

  window.TradeFlowControlTower = {
    refresh: renderTower,
    data: calculateControlData
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();