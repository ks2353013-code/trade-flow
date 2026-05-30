/* TradeFlow Workspace Data Isolation V2
   Safe frontend isolation layer.
   Adds active workspace context to API requests and filters workspace-tagged data.
*/

(function () {
  if (window.TradeFlowWorkspaceDataIsolationV2) return;

  const ACTIVE_KEY = "tradeflowActiveWorkspaceV1";
  const WORKSPACES_KEY = "tradeflowWorkspacesV1";

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowUser") || "null");
    } catch {
      return null;
    }
  }

  function getToken() {
    return (
      localStorage.getItem("tradeflowToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      ""
    );
  }

  function requireLogin() {
    if (!getUser() || !getToken()) {
      localStorage.clear();
      window.location.href = "/login";
      return false;
    }

    return true;
  }

  function getWorkspaces() {
    try {
      return JSON.parse(localStorage.getItem(WORKSPACES_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function getActiveWorkspaceId() {
    return localStorage.getItem(ACTIVE_KEY) || "";
  }

  function getActiveWorkspace() {
    const workspaces = getWorkspaces();
    return (
      workspaces.find(w => w.id === getActiveWorkspaceId()) ||
      workspaces[0] ||
      null
    );
  }

  function getWorkspaceContext() {
    const active = getActiveWorkspace();

    return {
      workspaceId: active?.id || "",
      workspaceName: active?.name || "",
      workspaceBusinessType: active?.businessType || "",
      workspaceProduct: active?.product || "",
      workspaceTargetMarket: active?.targetMarket || ""
    };
  }

  function shouldAttachWorkspace(url) {
    if (typeof url !== "string") return false;

    return (
      url.includes("/suppliers") ||
      url.includes("/api/deals") ||
      url.includes("/api/tasks") ||
      url.includes("/api/outreach") ||
      url.includes("/api/pdf") ||
      url.includes("/api/analytics") ||
      url.includes("/api/notifications")
    );
  }

  function shouldMutateBody(method) {
    return ["POST", "PUT", "PATCH"].includes(String(method || "GET").toUpperCase());
  }

  function patchFetch() {
    if (window.TradeFlowWorkspaceFetchPatched) return;
    window.TradeFlowWorkspaceFetchPatched = true;

    const originalFetch = window.fetch;

    window.fetch = async function (url, options = {}) {
      if (!requireLogin()) {
        throw new Error("Authentication required");
      }

      options.headers = options.headers || {};

      const token = getToken();
      const context = getWorkspaceContext();

      if (shouldAttachWorkspace(url)) {
        options.headers["x-workspace-id"] = context.workspaceId;
        options.headers["x-workspace-name"] = context.workspaceName;
        options.headers["x-workspace-business-type"] = context.workspaceBusinessType;

        if (token) {
          options.headers.Authorization =
            options.headers.Authorization || `Bearer ${token}`;
        }

        if (shouldMutateBody(options.method) && options.body) {
          try {
            const body =
              typeof options.body === "string"
                ? JSON.parse(options.body)
                : options.body;

            const enrichedBody = {
              ...body,
              workspaceId: body.workspaceId || context.workspaceId,
              workspaceName: body.workspaceName || context.workspaceName,
              workspaceBusinessType:
                body.workspaceBusinessType || context.workspaceBusinessType,
              workspaceProduct:
                body.workspaceProduct || context.workspaceProduct,
              workspaceTargetMarket:
                body.workspaceTargetMarket || context.workspaceTargetMarket
            };

            options.body = JSON.stringify(enrichedBody);
            options.headers["Content-Type"] =
              options.headers["Content-Type"] || "application/json";
          } catch {
            // Keep original body if not JSON
          }
        }
      }

      return originalFetch(url, options);
    };

    console.log("✅ Workspace Data Isolation V2 fetch context active");
  }

  function filterByWorkspace(items) {
    if (!Array.isArray(items)) return items;

    const activeId = getActiveWorkspaceId();

    if (!activeId) return items;

    return items.filter(item => {
      if (!item.workspaceId) return true;
      return item.workspaceId === activeId;
    });
  }

  function patchRenderer(name) {
    const original = window[name];

    if (typeof original !== "function") return;

    if (original.__workspacePatched) return;

    const patched = function (items, ...args) {
      return original.call(this, filterByWorkspace(items), ...args);
    };

    patched.__workspacePatched = true;
    window[name] = patched;
  }

  function patchRenderers() {
    patchRenderer("renderSuppliers");
    patchRenderer("renderDeals");
    patchRenderer("renderTasks");
    patchRenderer("renderOutreachRecords");
    patchRenderer("renderNotifications");
  }

  function updateIsolationStatus() {
    const active = getActiveWorkspace();

    let badge = document.getElementById("workspaceIsolationBadge");

    if (!badge) {
      badge = document.createElement("div");
      badge.id = "workspaceIsolationBadge";
      badge.style.cssText = `
        position: fixed;
        right: 20px;
        bottom: 20px;
        z-index: 99999;
        background: rgba(15,23,42,.92);
        color: #7dd3fc;
        border: 1px solid rgba(125,211,252,.35);
        padding: 10px 14px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 900;
        box-shadow: 0 12px 40px rgba(0,0,0,.35);
      `;
      document.body.appendChild(badge);
    }

    badge.innerText = active
      ? `Workspace Isolated: ${active.name}`
      : "Workspace Isolation Active";
  }

  function refreshCurrentPage() {
    if (typeof window.showPage === "function") {
      const visiblePage = Array.from(document.querySelectorAll("[id$='Page']"))
        .find(el => !el.classList.contains("hidden"));

      if (visiblePage?.id) {
        const page = visiblePage.id.replace("Page", "");
        window.showPage(page);
      }
    }
  }

  function patchWorkspaceActivation() {
    if (!window.TradeFlowWorkspaceEngineV1) return;
    if (window.TradeFlowWorkspaceIsolationActivationPatched) return;

    window.TradeFlowWorkspaceIsolationActivationPatched = true;

    const originalActivate =
      window.TradeFlowWorkspaceEngineV1.activateWorkspace;

    if (typeof originalActivate === "function") {
      window.TradeFlowWorkspaceEngineV1.activateWorkspace = function (id) {
        originalActivate(id);

        setTimeout(() => {
          updateIsolationStatus();
          refreshCurrentPage();
        }, 300);
      };
    }
  }

  function boot() {
    if (!requireLogin()) return;

    patchFetch();
    patchRenderers();
    patchWorkspaceActivation();
    updateIsolationStatus();

    setInterval(() => {
      patchRenderers();
      patchWorkspaceActivation();
      updateIsolationStatus();
    }, 4000);

    console.log("✅ Workspace Data Isolation V2 active");
  }

  window.TradeFlowWorkspaceDataIsolationV2 = {
    getWorkspaceContext,
    filterByWorkspace,
    refreshCurrentPage,
    updateIsolationStatus
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();