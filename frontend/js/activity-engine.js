/* TradeFlow Database Activity Persistence Engine */

(function () {
  const LOCAL_QUEUE_KEY = "tradeflowActivityQueue";
  const LOCAL_CACHE_KEY = "tradeflowActivityCache";

  function $(id) {
    return document.getElementById(id);
  }

  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") return BACKEND_URL;
    return "https://trade-flow-lc1k.onrender.com";
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

  function getHeaders() {
    try {
      if (typeof getAuthHeaders === "function") return getAuthHeaders();
    } catch {}

    const user = getJson("tradeflowUser", {});

    return {
      "Content-Type": "application/json",
      "Authorization": user.token ? `Bearer ${user.token}` : ""
    };
  }

  function normalizeActivity(activity) {
    return {
      type: activity.type || "General",
      title: activity.title || activity.type || "TradeFlow Activity",
      message: activity.message || "",
      source: activity.source || "TradeFlow",
      priority: activity.priority || "Medium",
      metadata: activity.metadata || {}
    };
  }

  function addToQueue(activity) {
    const queue = getJson(LOCAL_QUEUE_KEY, []);
    queue.unshift({
      ...normalizeActivity(activity),
      queuedAt: new Date().toISOString()
    });
    setJson(LOCAL_QUEUE_KEY, queue.slice(0, 50));
  }

  async function saveActivity(activity) {
    const payload = normalizeActivity(activity);

    try {
      const res = await fetch(`${getBackendUrl()}/api/activity`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Activity save failed");

      const data = await res.json();
      await fetchActivities(false);
      return data;
    } catch (error) {
      addToQueue(payload);
      renderActivityStatus("Offline queue active. Activity will sync later.");
      return null;
    }
  }

  async function syncQueue() {
    const queue = getJson(LOCAL_QUEUE_KEY, []);
    if (!queue.length) return;

    const remaining = [];

    for (const item of queue) {
      try {
        const res = await fetch(`${getBackendUrl()}/api/activity`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(normalizeActivity(item))
        });

        if (!res.ok) throw new Error("Sync failed");
      } catch {
        remaining.push(item);
      }
    }

    setJson(LOCAL_QUEUE_KEY, remaining);

    if (!remaining.length) {
      renderActivityStatus("All offline activities synced to database.");
      fetchActivities(false);
    }
  }

  async function fetchActivities(showStatus = true) {
    try {
      const res = await fetch(`${getBackendUrl()}/api/activity`, {
        headers: getHeaders()
      });

      if (!res.ok) throw new Error("Activity fetch failed");

      const data = await res.json();
      setJson(LOCAL_CACHE_KEY, Array.isArray(data) ? data : []);
      renderActivityFeed();

      if (showStatus) renderActivityStatus("Activity database synced.");
      return data;
    } catch (error) {
      renderActivityStatus("Using local activity cache.");
      renderActivityFeed();
      return getJson(LOCAL_CACHE_KEY, []);
    }
  }

  async function clearActivities() {
    if (!confirm("Clear all database activity records?")) return;

    try {
      await fetch(`${getBackendUrl()}/api/activity`, {
        method: "DELETE",
        headers: getHeaders()
      });

      setJson(LOCAL_CACHE_KEY, []);
      renderActivityFeed();
      renderActivityStatus("Database activity cleared.");
    } catch {
      renderActivityStatus("Could not clear database activity.");
    }
  }

  function renderActivityStatus(text) {
    const el = $("activityEngineStatus");
    if (el) el.innerText = text;
  }

  function renderActivityFeed() {
    const box = $("databaseActivityFeed");
    if (!box) return;

    const activities = getJson(LOCAL_CACHE_KEY, []);

    if (!activities.length) {
      box.innerHTML = `<div class="deal">No database activities yet. AI and automation actions will appear here.</div>`;
      return;
    }

    box.innerHTML = activities.slice(0, 50).map(item => `
      <div class="supplier-card" style="margin-bottom:12px;">
        <h2 style="font-size:18px;font-weight:900;color:white;margin:0 0 8px;">
          ${item.title || "TradeFlow Activity"}
        </h2>
        <p class="muted">${item.message || ""}</p>
        <p class="muted">Source: ${item.source || "TradeFlow"} • Type: ${item.type || "General"}</p>
        <span class="status">${item.priority || "Medium"} • ${item.createdAt ? new Date(item.createdAt).toLocaleString() : "Local"}</span>
      </div>
    `).join("");
  }

  function injectStyles() {
    if ($("activityEngineStyles")) return;

    const style = document.createElement("style");
    style.id = "activityEngineStyles";
    style.innerHTML = `
      .activity-engine-grid {
        display: grid;
        grid-template-columns: minmax(320px, 1fr) minmax(280px, .85fr);
        gap: 18px;
        margin-top: 20px;
      }

      .database-activity-feed {
        max-height: 520px;
        overflow-y: auto;
        padding-right: 6px;
      }

      .activity-engine-status {
        margin-top: 10px;
        color: #7dd3fc;
        font-size: 13px;
        font-weight: 900;
      }

      @media(max-width:900px){
        .activity-engine-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildActivityPanel() {
    const aiPage = $("aiPage");
    if (!aiPage || $("activityPersistencePanel")) return;

    const panel = document.createElement("div");
    panel.id = "activityPersistencePanel";
    panel.className = "card ai-panel";
    panel.innerHTML = `
      <div class="section-title">🗄️ Database Activity Persistence Engine</div>
      <p class="muted">
        AI chats, automation actions, workflow logs, and business intelligence events can now sync to MongoDB.
      </p>

      <div class="activity-engine-grid">
        <div>
          <div class="grid grid-3">
            <button class="btn" onclick="TradeFlowActivityEngine.logAIEvent()">Log AI Event</button>
            <button class="btn" onclick="TradeFlowActivityEngine.logAutomationEvent()">Log Automation Event</button>
            <button class="btn" onclick="TradeFlowActivityEngine.logWorkflowEvent()">Log Workflow Event</button>
            <button class="btn" onclick="TradeFlowActivityEngine.fetch()">Refresh Database Feed</button>
            <button class="btn" onclick="TradeFlowActivityEngine.sync()">Sync Offline Queue</button>
            <button class="btn" onclick="TradeFlowActivityEngine.clear()">Clear Activity Database</button>
          </div>

          <div id="activityEngineStatus" class="activity-engine-status">Activity engine ready.</div>
        </div>

        <div>
          <div class="section-title">📡 MongoDB Activity Feed</div>
          <div id="databaseActivityFeed" class="database-activity-feed"></div>
        </div>
      </div>
    `;

    aiPage.appendChild(panel);
    renderActivityFeed();
  }

  function buildDashboardActivityPanel() {
    const dashboard = $("dashboardPage");
    if (!dashboard || $("dashboardActivityPersistencePanel")) return;

    const panel = document.createElement("div");
    panel.id = "dashboardActivityPersistencePanel";
    panel.className = "card";
    panel.innerHTML = `
      <div class="section-title">🗄️ Persistent Activity Memory</div>
      <p class="muted">
        TradeFlow can now save AI, automation, workflow, and operational activity into MongoDB.
      </p>
      <button class="btn" onclick="TradeFlowActivityEngine.fetch()">Refresh Activity Memory</button>
      <div id="dashboardActivityMiniFeed" style="margin-top:14px;"></div>
    `;

    dashboard.appendChild(panel);
    renderDashboardMiniFeed();
  }

  function renderDashboardMiniFeed() {
    const box = $("dashboardActivityMiniFeed");
    if (!box) return;

    const activities = getJson(LOCAL_CACHE_KEY, []).slice(0, 3);

    if (!activities.length) {
      box.innerHTML = `<div class="deal">No saved activity yet.</div>`;
      return;
    }

    box.innerHTML = activities.map(item => `
      <div class="deal">
        <b>${item.title || "Activity"}</b><br>
        ${item.message || ""}
      </div>
    `).join("");
  }

  function patchExistingEngines() {
    if (window.TradeFlowActivityEnginePatched) return;
    window.TradeFlowActivityEnginePatched = true;

    const originalAIAdd = window.TradeFlowAIChat?.addBusinessFeed;
    if (window.TradeFlowAIChat && typeof originalAIAdd === "function") {
      window.TradeFlowAIChat.addBusinessFeed = function (type, message) {
        originalAIAdd(type, message);
        saveActivity({
          type: "AI",
          title: type || "AI Business Feed",
          message: message || "",
          source: "TradeFlow AI Chat",
          priority: "Medium"
        });
      };
    }

    const originalAutoLog = window.TradeFlowAutomation?.log;
    if (window.TradeFlowAutomation && typeof originalAutoLog === "function") {
      window.TradeFlowAutomation.log = function (type, message, status) {
        originalAutoLog(type, message, status);
        saveActivity({
          type: "Automation",
          title: type || "Automation Log",
          message: message || "",
          source: "TradeFlow Automation",
          priority: status === "Urgent" ? "High" : "Medium",
          metadata: { status }
        });
      };
    }

    const originalLiveEvent = window.TradeFlowDashboardLive?.addLiveEvent;
    if (window.TradeFlowDashboardLive && typeof originalLiveEvent === "function") {
      window.TradeFlowDashboardLive.addLiveEvent = function (type, message, priority) {
        originalLiveEvent(type, message, priority);
        saveActivity({
          type: "Dashboard",
          title: type || "Live Dashboard Event",
          message: message || "",
          source: "TradeFlow Dashboard Live",
          priority: priority || "Medium"
        });
      };
    }
  }

  function logAIEvent() {
    saveActivity({
      type: "AI",
      title: "Manual AI Event",
      message: "AI activity manually logged from TradeFlow.",
      source: "Activity Engine",
      priority: "Medium"
    });
  }

  function logAutomationEvent() {
    saveActivity({
      type: "Automation",
      title: "Manual Automation Event",
      message: "Automation activity manually logged from TradeFlow.",
      source: "Activity Engine",
      priority: "Medium"
    });
  }

  function logWorkflowEvent() {
    saveActivity({
      type: "Workflow",
      title: "Manual Workflow Event",
      message: "Workflow activity manually logged from TradeFlow.",
      source: "Activity Engine",
      priority: "Medium"
    });
  }

  window.TradeFlowActivityEngine = {
    save: saveActivity,
    fetch: fetchActivities,
    sync: syncQueue,
    clear: clearActivities,
    logAIEvent,
    logAutomationEvent,
    logWorkflowEvent
  };

  function boot() {
    injectStyles();
    buildActivityPanel();
    buildDashboardActivityPanel();

    setTimeout(() => {
      patchExistingEngines();
      fetchActivities(false);
      syncQueue();
      renderDashboardMiniFeed();
    }, 1200);

    setInterval(() => {
      patchExistingEngines();
      renderDashboardMiniFeed();
    }, 5000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
