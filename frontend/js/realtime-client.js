/* TradeFlow Realtime Client */

(function () {
  if (window.TradeFlowRealtimeClient) return;

  let socket = null;
  let bootStarted = false;
  let realtimeUnavailable = false;
  let connectWarningShown = false;
  const RENDER_SOCKET_ORIGIN = "https://trade-flow-lc1k.onrender.com";

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
      window.TradeFlowWorkspace?.getActiveWorkspaceId?.() ||
      "global"
    );
  }

  function isLocalHost(hostname) {
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1"
    );
  }

  function getSocketOrigin() {
    const configured =
      window.TRADEFLOW_SOCKET_URL ||
      window.TRADEFLOW_REALTIME_URL ||
      window.BACKEND_URL ||
      window.TRADEFLOW_API_BASE ||
      window.TRADEFLOW_API_BASE_URL;

    if (configured) {
      return String(configured).replace(/\/$/, "");
    }

    if (isLocalHost(window.location.hostname)) {
      return window.location.origin;
    }

    return RENDER_SOCKET_ORIGIN;
  }

  async function isJavaScriptResponse(url) {
    if (!window.fetch) return true;

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store"
    });

    const contentType =
      response.headers.get("content-type") || "";

    if (
      !response.ok ||
      !/javascript|ecmascript|text\/plain/i.test(contentType)
    ) {
      throw new Error(
        `Socket.IO client unavailable at ${url} (${response.status}, ${contentType || "unknown content-type"})`
      );
    }

    return true;
  }

  function injectScript(src) {
    return new Promise((resolve, reject) => {
      if (window.io) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = true;

      script.onload = resolve;
      script.onerror = () => reject(
        new Error(`Socket.IO client script failed to load from ${src}`)
      );

      document.body.appendChild(script);
    });
  }

  async function loadSocketScript() {
    if (window.io) return;

    const socketOrigin = getSocketOrigin();
    const backendScriptUrl = `${socketOrigin}/socket.io/socket.io.js`;
    const fallbackScriptUrl =
      "https://cdn.socket.io/4.7.5/socket.io.min.js";

    try {
      await isJavaScriptResponse(backendScriptUrl);
      await injectScript(backendScriptUrl);
      return;
    } catch (error) {
      console.warn(
        "Realtime Socket.IO backend client unavailable; trying CDN fallback.",
        error?.message || error
      );
    }

    await injectScript(fallbackScriptUrl);
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

    if (!window.io || realtimeUnavailable) return;

    socket = io(getSocketOrigin(), {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnectionAttempts: 3,
      timeout: 8000
    });

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

    socket.on("connect_error", (error) => {
      if (connectWarningShown) return;

      connectWarningShown = true;
      console.warn(
        "Realtime connection unavailable; continuing without live updates.",
        error?.message || "Socket connection failed"
      );
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
    if (bootStarted || realtimeUnavailable) return;
    bootStarted = true;

    try {
      if (window.TradeFlowBootstrap?.whenReady) {
        await window.TradeFlowBootstrap.whenReady();
      }

      await loadSocketScript();

      connectSocket();

      console.log(
        "✅ TradeFlow Realtime Client active"
      );

    } catch (error) {
      realtimeUnavailable = true;

      console.warn(
        "Realtime client unavailable; continuing without live updates.",
        error?.message || "Socket client failed to load"
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
