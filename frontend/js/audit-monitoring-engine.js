/* TradeFlow Audit Monitoring Engine */

(function () {

  const CACHE_KEY =
    "tradeflowAuditLogs";
  let auditLogsLoading = false;

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

  function isMongoObjectId(value) {
    return /^[a-f\d]{24}$/i.test(
      String(value || "").trim()
    );
  }

  function getStoredObjectId(key) {
    const value =
      localStorage.getItem(key);

    return isMongoObjectId(value)
      ? String(value).trim()
      : "";
  }

  function getActiveWorkspaceId() {
    return window.TradeFlowWorkspace?.getActiveWorkspaceId?.() || "";
  }

  async function waitForBootstrap() {
    if (window.TradeFlowBootstrap?.whenReady) {
      await window.TradeFlowBootstrap.whenReady();
    }
  }

  function auditDebugEnabled() {
    return localStorage.getItem(
      "tradeflowAuditDebug"
    ) === "true";
  }

  function getHeaders() {

    const user = getUser();
    const token =
      window.getAuthToken?.() ||
      window.TradeFlowSessionManager?.getToken?.() ||
      user?.token ||
      "";
    const workspaceId = getActiveWorkspaceId();

    const headers = {
      "Content-Type":
        "application/json",

      Authorization:
        token
          ? `Bearer ${token}`
          : "",

      "x-user-email":
        user?.email ||
        "unknown@tradeflow.local",

      "x-company-id":
        getStoredObjectId(
          "tradeflowActiveCompany"
        )
    };

    if (workspaceId) {
      headers["x-workspace-id"] = workspaceId;
    }

    return headers;
  }

  async function logEvent(
    action,
    message,
    module = "General",
    severity = "Info",
    metadata = {}
  ) {

    try {
      await waitForBootstrap();
      if (!getActiveWorkspaceId()) return;

      const res = await fetch(
        `${getBackendUrl()}/api/audit`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            action,
            message,
            module,
            severity,
            metadata
          })
        }
      );

      if (!res.ok) {
        return;
      }

      fetchLogs(false);

    } catch (error) {

      if (auditDebugEnabled()) {
        console.debug(
          "Audit log skipped:",
          error.message
        );
      }

    }

  }

  async function fetchLogs(
    renderStatus = true
  ) {
    await waitForBootstrap();
    if (!getActiveWorkspaceId()) {
      renderLogs();
      return;
    }

    if (auditLogsLoading) return;

    auditLogsLoading = true;

    try {

      const res = await fetch(
        `${getBackendUrl()}/api/audit`,
        {
          headers: getHeaders()
        }
      );

      if (!res.ok) {
        throw new Error(
          "Audit fetch failed"
        );
      }

      const payload =
        await res.json();

      const logs =
        Array.isArray(payload)
          ? payload
          : payload.logs || [];

      setJson(
        CACHE_KEY,
        logs
      );

      renderLogs();

      if (renderStatus) {
        setStatus(
          "Audit logs synced."
        );
      }

    } catch (error) {

      setStatus(
        "Using cached audit logs."
      );

      renderLogs();

    } finally {

      auditLogsLoading = false;

    }

  }

  async function clearLogs() {

    if (
      !confirm(
        "Clear all audit logs?"
      )
    ) return;

    try {

      const res = await fetch(
        `${getBackendUrl()}/api/audit`,
        {
          method: "DELETE",
          headers: getHeaders()
        }
      );

      if (!res.ok) {
        throw new Error(
          "Clear failed"
        );
      }

      setJson(CACHE_KEY, []);

      renderLogs();

      setStatus(
        "Audit logs cleared."
      );

    } catch {

      setStatus(
        "Failed to clear logs."
      );

    }

  }

  function setStatus(text) {

    const el = $(
      "auditMonitoringStatus"
    );

    if (el) {
      el.innerText = text;
    }

  }

  function getSeverityColor(
    severity
  ) {

    switch (severity) {

      case "Critical":
        return "#ef4444";

      case "Warning":
        return "#f59e0b";

      default:
        return "#10b981";

    }

  }

  function renderLogs() {

    const container = $(
      "auditMonitoringList"
    );

    if (!container) return;

    const logs = getJson(
      CACHE_KEY,
      []
    );

    if (!logs.length) {

      container.innerHTML = `
        <div class="deal">
          No audit logs available.
        </div>
      `;

      return;

    }

    container.innerHTML =
      logs.map((log) => `

      <div
        class="supplier-card"
        style="
          margin-bottom:12px;
          border-left:4px solid ${getSeverityColor(log.severity)};
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
            ${log.action}
          </h2>

          <span
            class="status"
            style="
              background:${getSeverityColor(log.severity)};
              color:white;
            "
          >
            ${log.severity}
          </span>

        </div>

        <p class="muted">
          ${log.message}
        </p>

        <div
          style="
            display:flex;
            gap:10px;
            flex-wrap:wrap;
            margin-top:8px;
          "
        >

          <span class="status">
            ${log.module}
          </span>

          <span class="status">
            ${log.actorEmail || "Unknown"}
          </span>

          <span class="status">
            ${
              log.createdAt
                ? new Date(
                    log.createdAt
                  ).toLocaleString()
                : "Now"
            }
          </span>

        </div>

      </div>

    `).join("");

  }

  function buildPanel() {

    const dashboard =
      $("dashboardPage") ||
      document.body;

    if (
      $("auditMonitoringPanel")
    ) return;

    const panel =
      document.createElement(
        "div"
      );

    panel.id =
      "auditMonitoringPanel";

    panel.className =
      "card ai-panel";

    panel.innerHTML = `

      <div class="section-title">
        🛡 Enterprise Audit Monitoring
      </div>

      <p class="muted">
        Security tracking,
        employee monitoring,
        compliance history,
        and realtime audit visibility.
      </p>

      <div
        style="
          display:flex;
          gap:12px;
          flex-wrap:wrap;
          margin-top:16px;
        "
      >

        <button
          class="btn"
          onclick="TradeFlowAudit.fetch()"
        >
          Refresh Logs
        </button>

        <button
          class="btn"
          onclick="TradeFlowAudit.test()"
        >
          Generate Test Log
        </button>

        <button
          class="danger-btn"
          onclick="TradeFlowAudit.clear()"
        >
          Clear Logs
        </button>

      </div>

      <div
        id="auditMonitoringStatus"
        style="
          margin-top:12px;
          color:#7dd3fc;
          font-weight:900;
        "
      >
        Audit monitoring ready.
      </div>

      <div
        id="auditMonitoringList"
        style="
          margin-top:18px;
          max-height:520px;
          overflow-y:auto;
        "
      ></div>

    `;

    dashboard.appendChild(panel);

  }

  function patchFetch() {

    if (
      window.TradeFlowAuditPatched
    ) return;

    window.TradeFlowAuditPatched =
      true;

    const originalFetch =
      window.fetch;

    window.fetch =
      async function (
        url,
        options = {}
      ) {

        const method =
          (
            options.method ||
            "GET"
          ).toUpperCase();

        const requestUrl =
          typeof url === "string"
            ? url
            : url?.url || "";

        const response =
          await originalFetch(
            url,
            options
          );

        if (
          requestUrl.includes(
            "/api/audit"
          )
        ) {
          return response;
        }

        if (
          response.ok &&
          (
            method === "POST" ||
            method === "PUT" ||
            method === "DELETE"
          )
        ) {

          const severity =
            method === "DELETE"
              ? "Warning"
              : "Info";

          logEvent(
            "API Activity",
            `${method} request on ${url}`,
            "API",
            severity
          );

        }

        if (
          response.status >= 500
        ) {

          logEvent(
            "Server Failure",
            `Server error on ${url}`,
            "Backend",
            "Critical"
          );

        }

        return response;

      };

  }

  function generateTestLog() {

    logEvent(
      "Test Audit Event",
      "Audit monitoring test triggered.",
      "Monitoring",
      "Info",
      {
        manual: true
      }
    );

  }

  window.TradeFlowAudit = {
    fetch: fetchLogs,
    clear: clearLogs,
    log: logEvent,
    test: generateTestLog
  };

  function boot() {

    buildPanel();

    patchFetch();

    (async () => {
      await waitForBootstrap();
      fetchLogs(false);
    })();

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
