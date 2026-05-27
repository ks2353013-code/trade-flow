/* TradeFlow AI Notification Center */

(function () {
  if (window.TradeFlowAINotificationCenter) return;

  let drawerOpen = false;
  let notifications = [];

  function getEmail() {
    return (
      localStorage.getItem("userEmail") ||
      localStorage.getItem("tradeflowUserEmail") ||
      localStorage.getItem("email") ||
      "ks2353013@gmail.com"
    );
  }

  function createBell() {
    if (document.getElementById("tradeflowAiNotificationBell")) return;

    const bell = document.createElement("button");

    bell.id = "tradeflowAiNotificationBell";
    bell.innerHTML = `
      🔔
      <span id="tradeflowAiNotificationCount" style="
        position:absolute;
        top:-6px;
        right:-6px;
        background:#ef4444;
        color:white;
        font-size:11px;
        border-radius:999px;
        min-width:20px;
        height:20px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:900;
      ">0</span>
    `;

    bell.style.position = "fixed";
    bell.style.right = "100px";
    bell.style.bottom = "22px";
    bell.style.width = "64px";
    bell.style.height = "64px";
    bell.style.borderRadius = "50%";
    bell.style.border = "none";
    bell.style.cursor = "pointer";
    bell.style.fontSize = "28px";
    bell.style.zIndex = "9999";
    bell.style.background = "linear-gradient(135deg,#f59e0b,#ef4444)";
    bell.style.color = "white";
    bell.style.boxShadow = "0 10px 40px rgba(239,68,68,.35)";

    bell.onclick = toggleDrawer;

    document.body.appendChild(bell);
  }

  function createDrawer() {
    if (document.getElementById("tradeflowAiNotificationDrawer")) return;

    const drawer = document.createElement("div");

    drawer.id = "tradeflowAiNotificationDrawer";
    drawer.style.position = "fixed";
    drawer.style.top = "0";
    drawer.style.right = "-430px";
    drawer.style.width = "410px";
    drawer.style.maxWidth = "92vw";
    drawer.style.height = "100vh";
    drawer.style.background = "#020617";
    drawer.style.borderLeft = "1px solid rgba(148,163,184,.2)";
    drawer.style.zIndex = "99999";
    drawer.style.transition = ".3s ease";
    drawer.style.padding = "22px";
    drawer.style.overflowY = "auto";
    drawer.style.boxShadow = "-20px 0 80px rgba(0,0,0,.45)";

    drawer.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div>
          <h2 style="margin:0;color:white;">🔔 AI Notification Center</h2>
          <p style="color:#94a3b8;margin:6px 0 0;">
            Live AI alerts, workflow updates, supplier risks, CRM predictions, and outreach reminders.
          </p>
        </div>

        <button onclick="TradeFlowAINotificationCenter.toggle()" style="
          background:#1e293b;
          color:white;
          border:none;
          border-radius:10px;
          padding:8px 12px;
          cursor:pointer;
        ">✕</button>
      </div>

      <div style="display:flex;gap:10px;margin:18px 0;flex-wrap:wrap;">
        <button class="btn" onclick="TradeFlowAINotificationCenter.refresh()">
          Refresh
        </button>

        <button class="btn" onclick="TradeFlowAINotificationCenter.runAI()">
          Run AI Check
        </button>

        <button class="btn" onclick="TradeFlowAINotificationCenter.clearAll()">
          Clear
        </button>
      </div>

      <div id="tradeflowAiNotificationList">
        Loading alerts...
      </div>
    `;

    document.body.appendChild(drawer);
  }

  function toggleDrawer() {
    createDrawer();

    const drawer = document.getElementById("tradeflowAiNotificationDrawer");

    drawerOpen = !drawerOpen;

    drawer.style.right = drawerOpen ? "0" : "-430px";

    if (drawerOpen) {
      refresh();
    }
  }

  function updateCount() {
    const count = document.getElementById("tradeflowAiNotificationCount");
    if (count) count.innerText = notifications.length;
  }

  function addNotification(item) {
    notifications.unshift({
      title: item.title || "AI Alert",
      message: item.message || "",
      severity: item.severity || "Low",
      time: item.time || new Date().toISOString(),
      type: item.type || "AI"
    });

    notifications = notifications.slice(0, 50);

    updateCount();
    render();
  }

  function render() {
    const list = document.getElementById("tradeflowAiNotificationList");
    if (!list) return;

    if (!notifications.length) {
      list.innerHTML = `
        <div class="deal">
          No active AI alerts yet. Run AI Check to generate live operational insights.
        </div>
      `;
      return;
    }

    list.innerHTML = notifications
      .map((n) => {
        const color =
          n.severity === "Critical"
            ? "#ef4444"
            : n.severity === "High"
            ? "#f97316"
            : n.severity === "Medium"
            ? "#f59e0b"
            : "#22c55e";

        return `
          <div class="deal" style="
            margin-bottom:12px;
            border-left:4px solid ${color};
          ">
            <b>${n.title}</b>
            <br>
            ${n.message}
            <br>
            <span class="muted">
              ${n.type} • ${n.severity} • ${new Date(n.time).toLocaleString()}
            </span>
          </div>
        `;
      })
      .join("");
  }

  async function fetchAIAlerts() {
    try {
      const res = await fetch("/api/audit?module=AI&limit=20", {
        headers: {
          "x-user-email": getEmail()
        }
      });

      const data = await res.json();

      if (!data.success) return [];

      return (data.logs || []).map((log) => ({
        title: log.action || "AI Activity",
        message: log.metadata
          ? JSON.stringify(log.metadata).slice(0, 180)
          : "AI workflow activity detected.",
        severity: log.severity || "Low",
        type: log.module || "AI",
        time: log.createdAt
      }));
    } catch {
      return [];
    }
  }

  async function refresh() {
    createDrawer();

    const list = document.getElementById("tradeflowAiNotificationList");
    if (list) {
      list.innerHTML = `<div class="deal">Loading latest AI alerts...</div>`;
    }

    const alerts = await fetchAIAlerts();

    notifications = alerts;

    if (!notifications.length) {
      notifications = [
        {
          title: "AI Monitoring Active",
          message: "TradeFlow AI is monitoring suppliers, CRM, outreach, and tasks.",
          severity: "Low",
          type: "AI",
          time: new Date().toISOString()
        }
      ];
    }

    updateCount();
    render();
  }

  async function runAI() {
    try {
      const res = await fetch("/api/ai-autonomous-workflows/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": getEmail()
        },
        body: JSON.stringify({})
      });

      const data = await res.json();

      if (data.success) {
        addNotification({
          title: "Autonomous AI Workflow Completed",
          message: `Tasks: ${data.summary.tasksCreated}, Outreach: ${data.summary.outreachCreated}, Deals Scored: ${data.summary.dealsScored || 0}`,
          severity: "Medium",
          type: "AI"
        });

        if (window.fetchTasks) window.fetchTasks();
        if (window.fetchOutreachRecords) window.fetchOutreachRecords();
        if (window.fetchAnalytics) window.fetchAnalytics();

        if (window.TradeFlowRealtimeClient?.emitActivity) {
          window.TradeFlowRealtimeClient.emitActivity(
            "ai",
            "Autonomous AI workflow completed"
          );
        }
      } else {
        addNotification({
          title: "AI Workflow Blocked",
          message: data.message || "AI workflow could not run.",
          severity: "High",
          type: "AI"
        });
      }
    } catch {
      addNotification({
        title: "AI Workflow Failed",
        message: "Backend connection failed during AI workflow.",
        severity: "High",
        type: "System"
      });
    }
  }

  function clearAll() {
    notifications = [];
    updateCount();
    render();
  }

  function hookRealtime() {
    setInterval(() => {
      if (window.TradeFlowRealtimeClient && !window.TradeFlowAINotificationRealtimeHooked) {
        window.TradeFlowAINotificationRealtimeHooked = true;
      }
    }, 2000);
  }

  function boot() {
    createBell();
    createDrawer();
    refresh();
    hookRealtime();

    setInterval(refresh, 60000);

    console.log("✅ AI Notification Center active");
  }

  window.TradeFlowAINotificationCenter = {
    toggle: toggleDrawer,
    refresh,
    runAI,
    clearAll,
    addNotification
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();