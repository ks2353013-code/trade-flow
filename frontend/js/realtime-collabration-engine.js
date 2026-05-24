/* TradeFlow Realtime Collaboration Engine */

(function () {

  let socket = null;

  function $(id) {
    return document.getElementById(id);
  }

  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") {
      return BACKEND_URL;
    }

    return "https://trade-flow-lc1k.onrender.com";
  }

  function getJson(key, fallback) {
    try {
      return JSON.parse(
        localStorage.getItem(key) ||
        JSON.stringify(fallback)
      );
    } catch {
      return fallback;
    }
  }

  function getUser() {
    return getJson("tradeflowUser", {});
  }

  function getWorkspaceId() {
    return (
      localStorage.getItem(
        "tradeflowActiveWorkspace"
      ) || "global"
    );
  }

  function addActivity(activity) {

    const feed = $("workspaceActivityFeed");

    if (!feed) return;

    const div = document.createElement("div");

    div.className = "supplier-card";

    div.style.marginBottom = "10px";

    div.innerHTML = `
      <h2 style="font-size:16px;">
        ${activity.type || "Activity"}
      </h2>

      <p class="muted">
        ${activity.message || ""}
      </p>

      <span class="status">
        ${new Date().toLocaleTimeString()}
      </span>
    `;

    feed.prepend(div);

    while (feed.children.length > 30) {
      feed.removeChild(feed.lastChild);
    }
  }

  function sendActivity(type, message) {

    if (!socket) return;

    const user = getUser();

    socket.emit("tradeflow-activity", {
      workspaceId: getWorkspaceId(),
      type,
      message,
      email: user?.email || ""
    });
  }

  function buildPanel() {

    const dashboard =
      $("dashboardPage") ||
      document.body;

    if (
      $("realtimeWorkspacePanel")
    ) return;

    const panel =
      document.createElement("div");

    panel.id =
      "realtimeWorkspacePanel";

    panel.className =
      "card ai-panel";

    panel.innerHTML = `
      <div class="section-title">
        ⚡ Live Workspace Collaboration
      </div>

      <p class="muted">
        Real-time workspace activity,
        employee collaboration,
        and live updates.
      </p>

      <div
        id="workspaceActivityFeed"
        style="
          margin-top:18px;
          max-height:420px;
          overflow-y:auto;
        "
      ></div>
    `;

    dashboard.appendChild(panel);
  }

  function patchActions() {

    if (
      window.TradeFlowRealtimePatched
    ) return;

    window.TradeFlowRealtimePatched =
      true;

    const originalFetch =
      window.fetch;

    window.fetch = async function (
      url,
      options = {}
    ) {

      const method =
        (
          options.method || "GET"
        ).toUpperCase();

      const response =
        await originalFetch(
          url,
          options
        );

      if (
        response.ok &&
        (
          method === "POST" ||
          method === "PUT" ||
          method === "DELETE"
        )
      ) {

        sendActivity(
          "Data Update",
          `${method} action on ${url}`
        );
      }

      return response;
    };
  }

  async function loadSocket() {

    if (window.io) {
      connectSocket();
      return;
    }

    const script =
      document.createElement("script");

    script.src =
      "https://cdn.socket.io/4.7.5/socket.io.min.js";

    script.onload =
      connectSocket;

    document.head.appendChild(
      script
    );
  }

  function connectSocket() {

    if (socket) return;

    socket = io(
      getBackendUrl(),
      {
        transports: ["websocket"]
      }
    );

    const user = getUser();

    socket.on(
      "connect",
      () => {

        socket.emit(
          "join-workspace",
          {
            workspaceId:
              getWorkspaceId(),
            email:
              user?.email || ""
          }
        );

        addActivity({
          type: "Connection",
          message:
            "Connected to realtime workspace"
        });
      }
    );

    socket.on(
      "workspace-activity",
      (activity) => {
        addActivity(activity);
      }
    );
  }

  function boot() {

    buildPanel();

    patchActions();

    loadSocket();
  }

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      boot
    );

  } else {

    boot();

  }

})();