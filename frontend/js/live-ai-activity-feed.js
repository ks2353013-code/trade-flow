/* TradeFlow Live AI Activity Feed */

(function () {
  if (window.TradeFlowLiveAIActivityFeed) return;

  function authHeaders() {
    const token = window.getAuthToken?.() ||
      localStorage.getItem("tradeflowToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      "";

    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function createPanel() {
    let panel = document.getElementById("liveAiActivityFeed");

    if (panel) return panel;

    const dashboard =
      document.getElementById("dashboardPage") ||
      document.getElementById("analyticsPage") ||
      document.getElementById("aiPage");

    if (!dashboard) return null;

    panel = document.createElement("div");
    panel.id = "liveAiActivityFeed";
    panel.className = "card ai-panel";
    panel.style.marginTop = "20px";

    panel.innerHTML = `
      <div class="section-title">🧠 Live AI Activity Feed</div>
      <p class="muted">
        Real-time AI planning and approval activity across suppliers, CRM, outreach, tasks, and operations.
      </p>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:14px 0;">
        <button class="btn" onclick="TradeFlowLiveAIActivityFeed.refresh()">
          Refresh AI Feed
        </button>

        <button class="btn" onclick="TradeFlowLiveAIActivityFeed.runAIWorkflow()">
          Autonomous Execution Disabled
        </button>
      </div>

      <div id="liveAiActivityList">
        Loading AI activity...
      </div>
    `;

    dashboard.appendChild(panel);

    return panel;
  }

  async function fetchAuditLogs() {
    try {
      const res = await fetch("/api/audit?module=AI&limit=20", {
        headers: authHeaders()
      });

      const data = await res.json();

      if (!data.success) return [];

      return data.logs || [];
    } catch {
      return [];
    }
  }

  function fallbackEvents() {
    return [
      {
        action: "AI monitoring supplier quality",
        severity: "Low",
        createdAt: new Date().toISOString(),
        metadata: {
          status: "Active"
        }
      },
      {
        action: "AI checking CRM pipeline health",
        severity: "Low",
        createdAt: new Date().toISOString(),
        metadata: {
          status: "Watching deals"
        }
      },
      {
        action: "AI ready to generate outreach drafts",
        severity: "Medium",
        createdAt: new Date().toISOString(),
        metadata: {
          status: "Ready"
        }
      }
    ];
  }

  function renderLogs(logs) {
    const list = document.getElementById("liveAiActivityList");
    if (!list) return;

    const items = logs.length ? logs : fallbackEvents();

    list.innerHTML = items
      .map((log) => {
        const meta = log.metadata
          ? JSON.stringify(log.metadata).slice(0, 160)
          : "";

        const time = log.createdAt
          ? new Date(log.createdAt).toLocaleString()
          : new Date().toLocaleString();

        return `
          <div class="deal" style="margin-bottom:12px;">
            <b>🤖 ${log.action || "AI activity"}</b>
            <br>
            Severity: <b>${log.severity || "Low"}</b>
            <br>
            Time: ${time}
            <br>
            <span class="muted">${meta}</span>
          </div>
        `;
      })
      .join("");
  }

  async function refresh() {
    createPanel();
    const logs = await fetchAuditLogs();
    renderLogs(logs);
  }

  async function runAIWorkflow() {
    renderLogs([
      {
        action: "Autonomous execution blocked for beta",
        severity: "High",
        createdAt: new Date().toISOString(),
        metadata: {
          status: "Use AI Command Center planning and human approvals"
        }
      }
    ]);
  }

  function boot() {
    document.addEventListener("tradeflow:page-change", function (event) {
      const page = event.detail?.page || "";

      if (
        page === "dashboard" ||
        page === "analytics" ||
        page === "ai"
      ) {
        setTimeout(refresh, 300);
      }
    });

    setTimeout(refresh, 1500);
    setInterval(refresh, 60000);

    console.log("✅ Live AI Activity Feed active");
  }

  window.TradeFlowLiveAIActivityFeed = {
    refresh,
    runAIWorkflow
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
