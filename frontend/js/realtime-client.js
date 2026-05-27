/* TradeFlow Realtime Client */

(function () {
  if (window.TradeFlowRealtimeClient) return;

  let socket = null;

  function getEmail() {
    return (
      localStorage.getItem("userEmail") ||
      localStorage.getItem("tradeflowUserEmail") ||
      localStorage.getItem("email") ||
      "ks2353013@gmail.com"
    );
  }

  function getWorkspaceId() {
    return (
      localStorage.getItem("workspaceId") ||
      "global"
    );
  }

  function loadSocketScript() {
    return new Promise((resolve, reject) => {

      if (window.io) {
        resolve();
        return;
      }

      const script = document.createElement("script");

      script.src =
        "https://cdn.socket.io/4.7.5/socket.io.min.js";

      script.onload = resolve;
      script.onerror = reject;

      document.body.appendChild(script);

    });
  }

  function ensureFeedContainer() {

    let container =
      document.getElementById(
        "tradeflowRealtimeFeed"
      );

    if (container) return container;

    const dashboard =
      document.getElementById("dashboardPage") ||
      document.getElementById("analyticsPage") ||
      document.body;

    container = document.createElement("div");

    container.id =
      "tradeflowRealtimeFeed";

    container.className =
      "card ai-panel";

    container.style.marginTop = "20px";

    container.innerHTML = `
      <div class="section-title">
        ⚡ Live Realtime Events
      </div>

      <p class="muted">
        Live workspace activity, AI operations,
        CRM collaboration, and autonomous updates.
      </p>

      <div id="tradeflowRealtimeEvents">
        Waiting for realtime activity...
      </div>
    `;

    dashboard.appendChild(container);

    return container;
  }

  function appendEvent(event) {

    ensureFeedContainer();

    const events =
      document.getElementById(
        "tradeflowRealtimeEvents"
      );

    if (!events) return;

    const item =
      document.createElement("div");

    item.className = "deal";

    item.style.marginBottom = "10px";

    item.innerHTML = `
      <b>${event.title || "Realtime Event"}</b>
      <br>
      ${event.message || ""}
      <br>
      <span class="muted">
        ${new Date().toLocaleTimeString()}
      </span>
    `;

    events.prepend(item);

    while (events.children.length > 20) {
      events.removeChild(events.lastChild);
    }
  }

  function connectSocket() {

    if (!window.io) return;

    socket = io();

    socket.on("connect", () => {

      console.log(
        "🟢 TradeFlow realtime connected"
      );

      socket.emit("join-workspace", {
        workspaceId: getWorkspaceId(),
        email: getEmail()
      });

      appendEvent({
        title: "Realtime Connected",
        message:
          "Connected to TradeFlow live collaboration engine."
      });

    });

    socket.on(
      "tradeflow-live-event",
      (event) => {

        appendEvent(event);

        if (
          event.type === "task" &&
          window.fetchTasks
        ) {
          window.fetchTasks();
        }

        if (
          event.type === "crm" &&
          window.fetchDeals
        ) {
          window.fetchDeals();
        }

        if (
          event.type === "supplier" &&
          window.fetchSuppliers
        ) {
          window.fetchSuppliers();
        }

        if (
          event.type === "ai" &&
          window.fetchAnalytics
        ) {
          window.fetchAnalytics();
        }

      }
    );

    socket.on("disconnect", () => {

      appendEvent({
        title: "Realtime Disconnected",
        message:
          "Lost connection to realtime engine."
      });

    });

  }

  function emitActivity(
    type,
    message,
    extra = {}
  ) {

    if (!socket) return;

    socket.emit(
      "tradeflow-activity",
      {
        workspaceId:
          getWorkspaceId(),

        email:
          getEmail(),

        type,
        message,

        ...extra
      }
    );

  }

  async function boot() {

    try {

      await loadSocketScript();

      connectSocket();

      console.log(
        "✅ TradeFlow Realtime Client active"
      );

    } catch (error) {

      console.warn(
        "Realtime client failed:",
        error.message
      );

    }

  }

  window.TradeFlowRealtimeClient = {
    emitActivity
  };

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      boot
    );

  } else {

    boot();

  }

})();