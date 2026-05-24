/* TradeFlow AI Executive Workspace Brain */

(function () {
  const BRAIN_KEY = "tradeflowExecutiveBrainMemory";

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

  function saveBrain(memory) {
    localStorage.setItem(BRAIN_KEY, JSON.stringify(memory));
  }

  function getBrain() {
    return safeJson(BRAIN_KEY, {
      lastScore: 0,
      trend: "Initializing",
      observations: [],
      updatedAt: null
    });
  }

  function calculateBrainState() {
    const suppliers = getSuppliers();
    const deals = getDeals();
    const tasks = getTasks();
    const timeline = getTimeline();
    const previous = getBrain();

    const pendingTasks = tasks.filter(
      t => !(t.status || "").toLowerCase().includes("complete")
    ).length;

    const completedTasks = tasks.length - pendingTasks;

    const workflowEvents = timeline.filter(
      e => ["Workflow", "Automation"].includes(e.type)
    ).length;

    const outreachEvents = timeline.filter(
      e => e.type === "Outreach"
    ).length;

    let score = 30;
    score += Math.min(suppliers.length * 5, 25);
    score += Math.min(deals.length * 6, 25);
    score += Math.min(completedTasks * 3, 10);
    score += Math.min(workflowEvents * 2, 5);
    score += Math.min(outreachEvents * 2, 5);
    score -= Math.min(pendingTasks * 2, 15);

    score = Math.max(0, Math.min(100, score));

    const trend =
      score > previous.lastScore
        ? "Improving"
        : score < previous.lastScore
        ? "Declining"
        : "Stable";

    const observations = [];

    if (suppliers.length < 5) {
      observations.push("Supplier network is still underdeveloped.");
    } else {
      observations.push("Supplier intelligence base is becoming stronger.");
    }

    if (deals.length < 3) {
      observations.push("CRM pipeline needs more active opportunities.");
    } else {
      observations.push("CRM pipeline is showing commercial activity.");
    }

    if (pendingTasks > 8) {
      observations.push("Operational backlog may slow execution speed.");
    }

    if (workflowEvents > 3) {
      observations.push("Workflow automation is beginning to support operations.");
    }

    if (outreachEvents > 2) {
      observations.push("Outreach execution activity is visible.");
    }

    const memory = {
      lastScore: score,
      trend,
      observations,
      suppliers: suppliers.length,
      deals: deals.length,
      pendingTasks,
      completedTasks,
      workflowEvents,
      outreachEvents,
      updatedAt: new Date().toISOString()
    };

    saveBrain(memory);
    return memory;
  }

  function recommendationFor(memory) {
    if (memory.suppliers < 5) {
      return "Focus today on supplier expansion and enrichment.";
    }

    if (memory.deals < 3) {
      return "Focus today on creating CRM opportunities and sending outreach.";
    }

    if (memory.pendingTasks > 8) {
      return "Focus today on reducing task backlog using workflow automation.";
    }

    if (memory.lastScore >= 75) {
      return "Focus today on scaling high-performing trade workflows.";
    }

    return "Focus today on improving supplier-to-CRM-to-outreach execution flow.";
  }

  function renderBrain() {
    const panel = $("aiExecutiveWorkspaceBrainPanel");
    if (!panel) return;

    const memory = calculateBrainState();

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:18px;align-items:center;flex-wrap:wrap;">
        <div>
          <div class="section-title">🧬 AI Executive Workspace Brain</div>
          <p class="muted">
            Context-aware intelligence layer analyzing operational maturity, execution patterns, activity trends, and business readiness.
          </p>
        </div>

        <div style="
          width:130px;
          height:130px;
          border-radius:999px;
          display:flex;
          align-items:center;
          justify-content:center;
          flex-direction:column;
          background:radial-gradient(circle at top,rgba(139,92,246,.35),rgba(15,23,42,.95));
          border:2px solid rgba(139,92,246,.35);
          box-shadow:0 20px 70px rgba(0,0,0,.4);
        ">
          <div style="font-size:40px;font-weight:900;color:white;line-height:1;">
            ${memory.lastScore}
          </div>
          <div style="color:#cbd5e1;font-weight:800;margin-top:6px;">
            Brain Score
          </div>
        </div>
      </div>

      <div class="supplier-card" style="margin-top:18px;">
        <div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;">
          <div>
            <h2 style="color:white;margin:0;">Workspace Trend</h2>
            <p class="muted">Compared with previous operational intelligence state.</p>
          </div>
          <span class="status">${memory.trend}</span>
        </div>

        <div class="deal">
          Recommended Focus: <b>${recommendationFor(memory)}</b>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:18px;">
        <div class="supplier-card"><h2 style="color:white;margin:0;">${memory.suppliers}</h2><p class="muted">Suppliers</p></div>
        <div class="supplier-card"><h2 style="color:white;margin:0;">${memory.deals}</h2><p class="muted">CRM Deals</p></div>
        <div class="supplier-card"><h2 style="color:white;margin:0;">${memory.pendingTasks}</h2><p class="muted">Pending Tasks</p></div>
        <div class="supplier-card"><h2 style="color:white;margin:0;">${memory.workflowEvents}</h2><p class="muted">Workflow Events</p></div>
      </div>

      <div class="supplier-card" style="margin-top:18px;">
        <h2 style="color:white;margin-top:0;">🧠 Executive Observations</h2>
        ${memory.observations.map(o => `
          <div class="deal">${o}</div>
        `).join("")}
      </div>

      <div class="supplier-card" style="margin-top:18px;">
        <h2 style="color:white;margin-top:0;">📌 Strategic Direction</h2>
        <div class="deal">
          TradeFlow should keep connecting intelligence → workflow → outreach → CRM → analytics.
        </div>
        <div class="deal">
          The strongest current growth path is guided execution, supplier expansion, and operational automation.
        </div>
      </div>
    `;
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("aiExecutiveWorkspaceBrainPanel")) return;

    const panel = document.createElement("div");
    panel.id = "aiExecutiveWorkspaceBrainPanel";
    panel.className = "card ai-panel";
    panel.style.marginBottom = "18px";

    const timeline = $("enterpriseOperationalTimelinePanel");

    if (timeline && timeline.parentNode) {
      timeline.parentNode.insertBefore(panel, timeline.nextSibling);
    } else {
      dashboard.appendChild(panel);
    }
  }

  function boot() {
    buildPanel();
    setTimeout(renderBrain, 2200);
    setInterval(renderBrain, 35000);
  }

  window.TradeFlowExecutiveBrain = {
    refresh: renderBrain,
    state: calculateBrainState
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();