/* TradeFlow Live Dashboard Intelligence Engine */

(function () {
  const FEED_KEY = "tradeflowDashboardLiveFeed";
  const MAX_FEED = 30;

  function $(id) {
    return document.getElementById(id);
  }

  function readText(id, fallback = "0") {
    const el = $(id);
    return el ? (el.innerText || fallback) : fallback;
  }

  function getFeed() {
    try {
      return JSON.parse(localStorage.getItem(FEED_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveFeed(feed) {
    localStorage.setItem(FEED_KEY, JSON.stringify(feed.slice(0, MAX_FEED)));
  }

  function timeNow() {
    return new Date().toLocaleString();
  }

  function addLiveEvent(type, message, priority = "Medium") {
    const feed = getFeed();
    feed.unshift({
      type,
      message,
      priority,
      time: timeNow()
    });
    saveFeed(feed);
    renderLiveFeed();
  }

  function getDashboardSnapshot() {
    return {
      suppliers: Number(readText("supplierCount", "0").replace(/[^\d.-]/g, "")) || 0,
      deals: Number(readText("dashboardDealCount", "0").replace(/[^\d.-]/g, "")) || 0,
      pipeline: Number(readText("dashboardPipelineValue", "0").replace(/[^\d.-]/g, "")) || 0,
      closed: Number(readText("dashboardClosedDeals", "0").replace(/[^\d.-]/g, "")) || 0,
      alerts: Number(readText("dashboardUnreadNotifications", "0").replace(/[^\d.-]/g, "")) || 0,
      workspaces: Number(readText("dashboardWorkspaceCount", "0").replace(/[^\d.-]/g, "")) || 0
    };
  }

  function getBusinessHealth(snapshot) {
    let score = 40;

    if (snapshot.suppliers > 0) score += 10;
    if (snapshot.deals > 0) score += 15;
    if (snapshot.pipeline > 0) score += 15;
    if (snapshot.closed > 0) score += 10;
    if (snapshot.alerts === 0) score += 5;
    if (snapshot.workspaces > 0) score += 5;

    score = Math.max(0, Math.min(score, 100));

    if (score >= 80) return { score, label: "🟢 Strong", action: "Scale outreach and focus on closing high-value deals." };
    if (score >= 55) return { score, label: "🟡 Growing", action: "Improve follow-ups and move verified leads into CRM." };
    return { score, label: "🔴 Needs Activity", action: "Add suppliers, create deals, and start outreach today." };
  }

  function getAiRecommendations(snapshot) {
    const recs = [];

    if (snapshot.suppliers === 0) {
      recs.push("Add at least 5 supplier leads to activate intelligence.");
    } else {
      recs.push("Review supplier quality and move hot leads into CRM.");
    }

    if (snapshot.deals === 0) {
      recs.push("Create your first CRM deal from a serious supplier/buyer.");
    } else {
      recs.push("Use AI Deal Advice on open CRM opportunities.");
    }

    if (snapshot.alerts > 0) {
      recs.push("Clear unread alerts before starting new outreach.");
    } else {
      recs.push("Notification center is clear. Focus on new business activity.");
    }

    if (snapshot.pipeline <= 0) {
      recs.push("Add deal values to make pipeline analytics useful.");
    } else {
      recs.push("Track pipeline health and prioritize highest-value deals.");
    }

    return recs;
  }

  function injectStyles() {
    if ($("liveDashboardEngineStyles")) return;

    const style = document.createElement("style");
    style.id = "liveDashboardEngineStyles";
    style.innerHTML = `
      .live-dashboard-grid {
        display: grid;
        grid-template-columns: minmax(320px, 1.15fr) minmax(280px, .85fr);
        gap: 18px;
        margin-top: 20px;
      }

      .live-pulse {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(34,197,94,.12);
        border: 1px solid rgba(34,197,94,.24);
        color: #86efac;
        font-size: 12px;
        font-weight: 900;
      }

      .live-pulse::before {
        content: "";
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: #22c55e;
        box-shadow: 0 0 0 rgba(34,197,94,.65);
        animation: tradeflowPulse 1.5s infinite;
      }

      @keyframes tradeflowPulse {
        0% { box-shadow: 0 0 0 0 rgba(34,197,94,.55); }
        70% { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
        100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
      }

      .live-insight-card {
        padding: 15px;
        border-radius: 20px;
        background: rgba(2,6,23,.56);
        border: 1px solid rgba(148,163,184,.14);
        margin-bottom: 10px;
      }

      .live-feed {
        max-height: 360px;
        overflow-y: auto;
        padding-right: 6px;
      }

      .live-feed-item {
        padding: 14px;
        border-radius: 18px;
        background: linear-gradient(135deg, rgba(15,23,42,.86), rgba(2,6,23,.62));
        border: 1px solid rgba(148,163,184,.14);
        margin-bottom: 10px;
      }

      .priority-high { border-color: rgba(239,68,68,.34); }
      .priority-medium { border-color: rgba(56,189,248,.28); }
      .priority-low { border-color: rgba(34,197,94,.24); }

      .metric {
        transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease;
      }

      .metric:hover {
        transform: translateY(-3px);
        border-color: rgba(56,189,248,.32);
        box-shadow: 0 22px 70px rgba(14,165,233,.12);
      }

      .metric p {
        transition: opacity .2s ease, transform .2s ease;
      }

      .metric.metric-updated p {
        opacity: .55;
        transform: translateY(-2px);
      }

      @media(max-width:900px){
        .live-dashboard-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildDashboardPanel() {
    const dashboard = $("dashboardPage");
    if (!dashboard || $("liveDashboardEnginePanel")) return;

    const panel = document.createElement("div");
    panel.id = "liveDashboardEnginePanel";
    panel.className = "live-dashboard-grid";
    panel.innerHTML = `
      <div class="card ai-panel">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div>
            <div class="section-title">📡 Live Dashboard Intelligence Engine</div>
            <p class="muted">AI-powered business monitor for suppliers, CRM, alerts, pipeline, and daily action.</p>
          </div>
          <span class="live-pulse">Live Monitor Active</span>
        </div>

        <div id="dashboardBusinessHealth" class="live-insight-card" style="margin-top:16px;"></div>

        <div class="grid grid-3" style="margin-top:14px;">
          <button class="btn" onclick="TradeFlowDashboardLive.generateHealth()">Generate Health Snapshot</button>
          <button class="btn" onclick="TradeFlowDashboardLive.generateActions()">Generate AI Actions</button>
          <button class="btn" onclick="TradeFlowDashboardLive.generateAlerts()">Generate Smart Alerts</button>
        </div>

        <div id="dashboardAiRecommendations" style="margin-top:16px;"></div>
      </div>

      <div class="card">
        <div class="section-title">⚡ Real-time Activity Feed</div>
        <p class="muted">Live enterprise-style activity from AI, CRM, suppliers, and workflow intelligence.</p>
        <div id="dashboardLiveFeed" class="live-feed" style="margin-top:14px;"></div>
        <button class="mini-btn" onclick="TradeFlowDashboardLive.clearFeed()">Clear Live Feed</button>
      </div>
    `;

    const firstGrid = dashboard.querySelector(".grid.grid-4");
    if (firstGrid && firstGrid.nextSibling) {
      dashboard.insertBefore(panel, firstGrid.nextSibling);
    } else {
      dashboard.appendChild(panel);
    }

    renderBusinessHealth();
    renderRecommendations();
    renderLiveFeed();
  }

  function renderBusinessHealth() {
    const box = $("dashboardBusinessHealth");
    if (!box) return;

    const snapshot = getDashboardSnapshot();
    const health = getBusinessHealth(snapshot);

    box.innerHTML = `
      <b>Business Health: ${health.label}</b><br>
      Score: ${health.score}/100<br>
      Suppliers: ${snapshot.suppliers} • Deals: ${snapshot.deals} • Pipeline: ${snapshot.pipeline}<br>
      Closed: ${snapshot.closed} • Alerts: ${snapshot.alerts} • Workspaces: ${snapshot.workspaces}<br><br>
      <b>AI Action:</b> ${health.action}
    `;
  }

  function renderRecommendations() {
    const box = $("dashboardAiRecommendations");
    if (!box) return;

    const recs = getAiRecommendations(getDashboardSnapshot());

    box.innerHTML = recs.map((rec, index) => `
      <div class="live-insight-card">
        <b>AI Recommendation ${index + 1}</b><br>
        ${rec}
      </div>
    `).join("");
  }

  function renderLiveFeed() {
    const box = $("dashboardLiveFeed");
    if (!box) return;

    const feed = getFeed();

    if (!feed.length) {
      box.innerHTML = `
        <div class="live-feed-item priority-low">
          <b>System Ready</b><br>
          Live dashboard intelligence is active.
          <br><span class="muted">${timeNow()}</span>
        </div>
      `;
      return;
    }

    box.innerHTML = feed.map(item => `
      <div class="live-feed-item priority-${(item.priority || "Medium").toLowerCase()}">
        <b>${item.type}</b><br>
        ${item.message}
        <br><span class="muted">${item.time}</span>
      </div>
    `).join("");
  }

  function animateMetrics() {
    document.querySelectorAll(".metric").forEach(card => {
      if (card.dataset.liveBound) return;
      card.dataset.liveBound = "true";

      const value = card.querySelector("p");
      if (!value) return;

      const observer = new MutationObserver(() => {
        card.classList.add("metric-updated");
        setTimeout(() => card.classList.remove("metric-updated"), 260);
        renderBusinessHealth();
        renderRecommendations();
      });

      observer.observe(value, { childList: true, characterData: true, subtree: true });
    });
  }

  function generateHealth() {
    const snapshot = getDashboardSnapshot();
    const health = getBusinessHealth(snapshot);

    const message = `Business health score ${health.score}/100 (${health.label}). ${health.action}`;
    addLiveEvent("📊 Business Health", message, health.score < 55 ? "High" : "Medium");

    const consoleBox = $("tradeflowAiConsole");
    if (consoleBox) {
      consoleBox.value = `📊 TradeFlow Business Health\n\nScore: ${health.score}/100\nStatus: ${health.label}\n\n${message}`;
    }

    renderBusinessHealth();
  }

  function generateActions() {
    const recs = getAiRecommendations(getDashboardSnapshot());
    addLiveEvent("🤖 AI Action Plan", recs.join(" "), "Medium");

    const consoleBox = $("tradeflowAiConsole");
    if (consoleBox) {
      consoleBox.value = `🤖 TradeFlow AI Action Plan\n\n${recs.map((r, i) => `${i + 1}. ${r}`).join("\n")}`;
    }

    renderRecommendations();
  }

  function generateAlerts() {
    const snapshot = getDashboardSnapshot();
    const alerts = [];

    if (snapshot.suppliers === 0) alerts.push("No suppliers found. Add supplier leads to start intelligence.");
    if (snapshot.deals === 0) alerts.push("No CRM deals found. Convert supplier/buyer conversations into CRM records.");
    if (snapshot.alerts > 0) alerts.push(`${snapshot.alerts} unread alerts need review.`);
    if (snapshot.pipeline === 0) alerts.push("Pipeline value is zero. Add deal values for business visibility.");

    if (!alerts.length) alerts.push("No critical alerts. Continue outreach and deal movement.");

    addLiveEvent("🛡️ Smart Alerts", alerts.join(" "), alerts.length > 1 ? "High" : "Low");

    const consoleBox = $("tradeflowAiConsole");
    if (consoleBox) {
      consoleBox.value = `🛡️ TradeFlow Smart Alerts\n\n${alerts.map((a, i) => `${i + 1}. ${a}`).join("\n")}`;
    }
  }

  function clearFeed() {
    localStorage.removeItem(FEED_KEY);
    renderLiveFeed();
  }

  function autoHeartbeat() {
    const snapshot = getDashboardSnapshot();
    const health = getBusinessHealth(snapshot);

    if (!getFeed().length) {
      addLiveEvent("✅ System Online", "TradeFlow live dashboard intelligence engine started.", "Low");
    }

    renderBusinessHealth();
    renderRecommendations();
    animateMetrics();

    if (health.score < 55) {
      const feed = getFeed();
      const alreadyWarned = feed.some(item => item.type === "⚠️ Health Warning");
      if (!alreadyWarned) {
        addLiveEvent("⚠️ Health Warning", health.action, "High");
      }
    }
  }

  window.TradeFlowDashboardLive = {
    addLiveEvent,
    generateHealth,
    generateActions,
    generateAlerts,
    clearFeed
  };

  function boot() {
    injectStyles();
    buildDashboardPanel();
    animateMetrics();

    setTimeout(autoHeartbeat, 800);
    setInterval(autoHeartbeat, 15000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
