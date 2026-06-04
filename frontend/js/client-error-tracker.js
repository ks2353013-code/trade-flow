/* TradeFlow Client Error Tracker */

(function () {
  if (window.TradeFlowClientErrorTracker) return;

  const RENDER_BACKEND_URL = "https://trade-flow-lc1k.onrender.com";
  let sentCount = 0;
  const maxErrorsPerPage = 10;

  function isLocalHost(hostname) {
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  }

  function getApiBase() {
    return (
      window.TradeFlowSessionManager?.getBackendUrl?.() ||
      window.BACKEND_URL ||
      (isLocalHost(window.location.hostname) ? window.location.origin : RENDER_BACKEND_URL)
    ).replace(/\/$/, "");
  }

  function getToken() {
    return (
      window.getAuthToken?.() ||
      window.TradeFlowSessionManager?.getToken?.() ||
      localStorage.getItem("tradeflowToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      ""
    );
  }

  function getUserId() {
    try {
      const user = JSON.parse(localStorage.getItem("tradeflowUser") || "null");
      return user?._id || user?.id || "";
    } catch {
      return "";
    }
  }

  function scrub(value) {
    return String(value || "")
      .replace(/(bearer\s+)[a-z0-9._-]+/gi, "$1[redacted]")
      .replace(/(token=)[^&\s]+/gi, "$1[redacted]")
      .replace(/(resetToken=)[^&\s]+/gi, "$1[redacted]")
      .replace(/(password=)[^&\s]+/gi, "$1[redacted]")
      .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, "[redacted]");
  }

  function getWorkspaceId() {
    const workspaceId = window.TradeFlowWorkspace?.getActiveWorkspaceId?.() || "";
    return /^[a-f\d]{24}$/i.test(workspaceId) ? workspaceId : "";
  }

  function buildPayload(error, source) {
    const message =
      typeof error === "string"
        ? error
        : error?.message || error?.reason?.message || "Unknown client error";

    const stack =
      error?.stack ||
      error?.error?.stack ||
      error?.reason?.stack ||
      "";

    return {
      message: scrub(message).slice(0, 1000),
      stack: scrub(stack).slice(0, 8000),
      route: scrub(window.location.pathname + window.location.search).slice(0, 500),
      page: scrub(window.location.href).slice(0, 500),
      userId: getUserId(),
      companyId: window.TradeFlowWorkspace?.state?.companyId || "",
      workspaceId: getWorkspaceId(),
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      source,
      timestamp: new Date().toISOString()
    };
  }

  function report(error, source) {
    if (sentCount >= maxErrorsPerPage) return;
    sentCount += 1;

    const token = getToken();
    const headers = {
      "Content-Type": "application/json"
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    fetch(`${getApiBase()}/api/errors/client`, {
      method: "POST",
      headers,
      credentials: "include",
      keepalive: true,
      body: JSON.stringify(buildPayload(error, source))
    }).catch(() => {});
  }

  window.onerror = function (message, source, lineno, colno, error) {
    report(error || { message, stack: `${source || ""}:${lineno || 0}:${colno || 0}` }, "window.onerror");
  };

  window.onunhandledrejection = function (event) {
    report(event?.reason || "Unhandled promise rejection", "window.onunhandledrejection");
  };

  window.TradeFlowClientErrorTracker = {
    report
  };
})();
