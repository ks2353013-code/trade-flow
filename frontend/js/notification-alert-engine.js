/* TradeFlow Notification + Alert Engine */

(function () {

  const CACHE_KEY = "tradeflowNotifications";

  function $(id) {
    return document.getElementById(id);
  }

  function getBackendUrl() {

    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return window.location.origin;
    }

    if (typeof BACKEND_URL !== "undefined") {
      return BACKEND_URL;
    }

    return window.location.origin;
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

  function setJson(key, value) {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  }

  function getUser() {
    return getJson(
      "tradeflowUser",
      {}
    );
  }

  function getHeaders() {

    const user = getUser();

    return {
      "Content-Type": "application/json",

      Authorization:
        user?.token
          ? `Bearer ${user.token}`
          : "",

      "x-user-email":
        user?.email ||
        "tradeflow@local.test"
    };
  }

  async function createNotification(
    title,
    message,
    type = "System",
    priority = "Medium",
    metadata = {}
  ) {

    try {

      const res = await fetch(
        `${getBackendUrl()}/api/notifications`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            title,
            message,
            type,
            priority,
            metadata
          })
        }
      );

      if (!res.ok) {
        throw new Error("Notification failed");
      }

      showToast(
        title,
        message,
        priority
      );

      fetchNotifications(false);

    } catch (error) {

      console.warn(
        "Notification system offline:",
        error.message
      );

    }

  }

  async function fetchNotifications(
    renderStatus = true
  ) {

    try {

      const res = await fetch(
        `${getBackendUrl()}/api/notifications`,
        {
          headers: getHeaders()
        }
      );

      if (!res.ok) {
        throw new Error("Fetch failed");
      }

      const data = await res.json();

      setJson(
        CACHE_KEY,
        Array.isArray(data)
          ? data
          : []
      );

      renderNotifications();

      if (renderStatus) {
        setStatus("Notifications synced.");
      }

    } catch {

      renderNotifications();

      setStatus(
        "Local notification mode active."
      );

    }

  }

  function showToast(
    title,
    message,
    priority
  ) {

    const toast =
      document.createElement("div");

    toast.style.cssText = `
      position:fixed;
      right:20px;
      top:20px;
      width:320px;
      z-index:999999;
      background:#0f172a;
      color:white;
      padding:16px;
      border-radius:14px;
      border-left:5px solid #3b82f6;
      box-shadow:0 10px 40px rgba(0,0,0,.45);
    `;

    toast.innerHTML = `
      <div style="font-weight:900;font-size:15px;">
        ${title}
      </div>

      <div style="margin-top:6px;font-size:13px;color:#cbd5e1;">
        ${message}
      </div>
    `;

    document.body.appendChild(
      toast
    );

    setTimeout(() => {
      toast.remove();
    }, 4000);

  }

  function renderNotifications() {

    const container = $("notificationCenterList");

    if (!container) return;

    const notifications =
      getJson(CACHE_KEY, []);

    if (!notifications.length) {

      container.innerHTML = `
        <div class="deal">
          No notifications yet.
        </div>
      `;

      return;

    }

    container.innerHTML =
      notifications.map((n) => `

      <div
        class="supplier-card"
        style="
          margin-bottom:12px;
          border-left:4px solid #3b82f6;
        "
      >

        <h2 style="margin:0;color:white;">
          ${n.title}
        </h2>

        <p class="muted">
          ${n.message}
        </p>

      </div>

    `).join("");

  }

  function setStatus(text) {

    const el =
      $("notificationCenterStatus");

    if (el) {
      el.innerText = text;
    }

  }

  function buildPanel() {

    const dashboard =
      $("dashboardPage") ||
      document.body;

    if (
      $("notificationCenterPanel")
    ) return;

    const panel =
      document.createElement("div");

    panel.id =
      "notificationCenterPanel";

    panel.className =
      "card ai-panel";

    panel.innerHTML = `

      <div class="section-title">
        🔔 Notification Center
      </div>

      <p class="muted">
        Local enterprise notifications active.
      </p>

      <div
        style="
          display:flex;
          gap:12px;
          flex-wrap:wrap;
          margin-top:14px;
        "
      >

        <button
          class="btn"
          onclick="TradeFlowNotifications.fetch()"
        >
          Refresh
        </button>

        <button
          class="btn"
          onclick="TradeFlowNotifications.test()"
        >
          Generate Test Alert
        </button>

      </div>

      <div
        id="notificationCenterStatus"
        style="
          margin-top:12px;
          color:#7dd3fc;
          font-weight:900;
        "
      >
        Notification center ready.
      </div>

      <div
        id="notificationCenterList"
        style="
          margin-top:18px;
          max-height:520px;
          overflow-y:auto;
        "
      ></div>

    `;

    dashboard.appendChild(panel);

  }

  function generateTestNotification() {

    const notifications =
      getJson(CACHE_KEY, []);

    notifications.unshift({
      title: "TradeFlow Alert",
      message:
        "Enterprise local notification system active."
    });

    setJson(
      CACHE_KEY,
      notifications
    );

    renderNotifications();

    showToast(
      "TradeFlow Alert",
      "Enterprise local notification system active.",
      "Medium"
    );

  }

  window.TradeFlowNotifications = {
    create: createNotification,
    fetch: fetchNotifications,
    test: generateTestNotification
  };

  function boot() {

    buildPanel();

    fetchNotifications(false);

    console.log(
      "✅ Notification Engine Active"
    );

  }

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