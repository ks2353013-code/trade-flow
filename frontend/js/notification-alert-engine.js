/* TradeFlow Notification + Alert Engine */

(function () {

  const CACHE_KEY =
    "tradeflowNotifications";

  function $(id) {
    return document.getElementById(id);
  }

  function getBackendUrl() {
    if (
      typeof BACKEND_URL !==
      "undefined"
    ) {
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
      "Content-Type":
        "application/json",

      Authorization:
        user?.token
          ? `Bearer ${user.token}`
          : "",

      "x-user-email":
        user?.email ||
        "unknown@tradeflow.local",

      "x-company-id":
        localStorage.getItem(
          "tradeflowActiveCompany"
        ) || "",

      "x-workspace-id":
        localStorage.getItem(
          "tradeflowActiveWorkspace"
        ) || ""
    };
  }

  function getPriorityColor(
    priority
  ) {

    switch (priority) {

      case "Critical":
        return "#ef4444";

      case "High":
        return "#f97316";

      case "Medium":
        return "#3b82f6";

      default:
        return "#10b981";

    }

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
        throw new Error(
          "Notification failed"
        );
      }

      showToast(
        title,
        message,
        priority
      );

      fetchNotifications(false);

    } catch (error) {

      console.warn(
        "Notification failed:",
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
        throw new Error(
          "Fetch failed"
        );
      }

      const data =
        await res.json();

      setJson(
        CACHE_KEY,
        Array.isArray(data)
          ? data
          : []
      );

      renderNotifications();

      fetchUnreadCount();

      if (renderStatus) {
        setStatus(
          "Notifications synced."
        );
      }

    } catch {

      renderNotifications();

      setStatus(
        "Using cached notifications."
      );

    }

  }

  async function fetchUnreadCount() {

    try {

      const res = await fetch(
        `${getBackendUrl()}/api/notifications/unread-count`,
        {
          headers: getHeaders()
        }
      );

      if (!res.ok) return;

      const data =
        await res.json();

      const badge = $(
        "notificationUnreadBadge"
      );

      if (badge) {

        badge.innerText =
          data.count || 0;

        badge.style.display =
          data.count > 0
            ? "inline-flex"
            : "none";

      }

    } catch {}

  }

  async function markAsRead(id) {

    try {

      await fetch(
        `${getBackendUrl()}/api/notifications/${id}/read`,
        {
          method: "PUT",
          headers: getHeaders()
        }
      );

      fetchNotifications(false);

    } catch {}

  }

  async function markAllRead() {

    try {

      await fetch(
        `${getBackendUrl()}/api/notifications/mark-all-read`,
        {
          method: "PUT",
          headers: getHeaders()
        }
      );

      fetchNotifications(false);

    } catch {}

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
      border-left:5px solid ${getPriorityColor(priority)};
      box-shadow:0 10px 40px rgba(0,0,0,.45);
      animation:tradeflowToast .35s ease;
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
    }, 4500);

  }

  function renderNotifications() {

    const container = $(
      "notificationCenterList"
    );

    if (!container) return;

    const notifications =
      getJson(
        CACHE_KEY,
        []
      );

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
          border-left:4px solid ${getPriorityColor(n.priority)};
          opacity:${n.read ? ".7" : "1"};
        "
      >

        <div
          style="
            display:flex;
            justify-content:space-between;
            gap:10px;
            align-items:center;
          "
        >

          <h2
            style="
              margin:0;
              font-size:16px;
              color:white;
            "
          >
            ${n.title}
          </h2>

          <span
            class="status"
            style="
              background:${getPriorityColor(n.priority)};
              color:white;
            "
          >
            ${n.priority}
          </span>

        </div>

        <p class="muted">
          ${n.message}
        </p>

        <div
          style="
            display:flex;
            gap:10px;
            flex-wrap:wrap;
            margin-top:10px;
          "
        >

          <span class="status">
            ${n.type}
          </span>

          <span class="status">
            ${
              n.createdAt
                ? new Date(
                    n.createdAt
                  ).toLocaleString()
                : "Now"
            }
          </span>

          ${
            !n.read
              ? `
            <button
              class="btn"
              onclick="TradeFlowNotifications.read('${n._id}')"
            >
              Mark Read
            </button>
          `
              : ""
          }

        </div>

      </div>

    `).join("");

  }

  function setStatus(text) {

    const el = $(
      "notificationCenterStatus"
    );

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
      document.createElement(
        "div"
      );

    panel.id =
      "notificationCenterPanel";

    panel.className =
      "card ai-panel";

    panel.innerHTML = `

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
        "
      >

        <div class="section-title">
          🔔 Notification Center
        </div>

        <div
          id="notificationUnreadBadge"
          style="
            display:none;
            align-items:center;
            justify-content:center;
            min-width:28px;
            height:28px;
            border-radius:999px;
            background:#ef4444;
            color:white;
            font-weight:900;
            padding:0 10px;
          "
        >
          0
        </div>

      </div>

      <p class="muted">
        Workspace alerts,
        billing alerts,
        AI alerts,
        security notifications,
        and realtime updates.
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

        <button
          class="btn"
          onclick="TradeFlowNotifications.markAll()"
        >
          Mark All Read
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

    const style =
      document.createElement(
        "style"
      );

    style.innerHTML = `
      @keyframes tradeflowToast {
        from {
          transform:translateY(-10px);
          opacity:0;
        }

        to {
          transform:translateY(0);
          opacity:1;
        }
      }
    `;

    document.head.appendChild(
      style
    );

  }

  function generateTestNotification() {

    createNotification(
      "TradeFlow Alert",
      "Realtime notification system operational.",
      "System",
      "Medium",
      {
        test: true
      }
    );

  }

  window.TradeFlowNotifications = {
    create:
      createNotification,

    fetch:
      fetchNotifications,

    read:
      markAsRead,

    markAll:
      markAllRead,

    test:
      generateTestNotification
  };

  function boot() {

    buildPanel();

    fetchNotifications(false);

    setInterval(() => {
      fetchUnreadCount();
    }, 30000);

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