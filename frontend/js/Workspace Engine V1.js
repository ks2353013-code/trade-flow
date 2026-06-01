/* TradeFlow Workspace Engine V1
   Production-safe frontend workspace layer.
   Business Type stays locked. Workspaces are operational projects.
*/

(function () {
  if (window.TradeFlowWorkspaceEngineV1) return;

  const STORAGE_KEY = "tradeflowWorkspacesV1";
  const ACTIVE_KEY = "tradeflowActiveWorkspaceV1";

  const PLAN_LIMITS = {
    Starter: 1,
    Professional: 3,
    Growth: 10,
    Enterprise: 999,
    "Enterprise AI OS": 999
  };

  function $(id) {
    return document.getElementById(id);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowUser") || "null");
    } catch {
      return null;
    }
  }

  function getToken() {
    const user = getUser();

    if (user?.token) {
      return user.token;
    }

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

  function getBusinessType() {
    return (
      localStorage.getItem("tradeflowBusinessType") ||
      getUser()?.businessType ||
      "Trading Company"
    );
  }

  function getPlan() {
    const user = getUser() || {};
    return (
      user.plan ||
      localStorage.getItem("tradeflowSubscriptionPlan") ||
      "Starter"
    );
  }

  function getWorkspaceLimit() {
    return PLAN_LIMITS[getPlan()] || 1;
  }

  function getWorkspaces() {
    try {
      const workspaces = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(workspaces)
        ? workspaces.filter((workspace) => isMongoObjectId(workspace._id || workspace.id))
        : [];
    } catch {
      return [];
    }
  }

  function saveWorkspaces(workspaces) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
  }

  function isMongoObjectId(value) {
    return /^[a-f\d]{24}$/i.test(String(value || "").trim());
  }

  function getActiveWorkspaceId() {
    if (typeof window.getCanonicalActiveWorkspaceId === "function") {
      return window.getCanonicalActiveWorkspaceId();
    }

    const candidates = [
      localStorage.getItem("tradeflowActiveWorkspace"),
      localStorage.getItem("tradeflowActiveWorkspaceId"),
      localStorage.getItem(ACTIVE_KEY),
      localStorage.getItem("activeWorkspaceId"),
      localStorage.getItem("workspaceId")
    ];

    return candidates.find(isMongoObjectId) || "";
  }

  function getActiveWorkspace() {
    const workspaces = getWorkspaces();
    return (
      workspaces.find(w => w.id === getActiveWorkspaceId()) ||
      workspaces[0] ||
      null
    );
  }

  function getWorkspaceName(workspace = {}) {
    return workspace.workspaceName || workspace.name || "Workspace";
  }

  function setActiveWorkspace(workspace) {
    const workspaceId = String(workspace?._id || workspace?.id || "");

    if (!isMongoObjectId(workspaceId)) {
      alert("Create or select a saved backend workspace before activating it.");
      return "";
    }

    if (typeof window.setCanonicalActiveWorkspace === "function") {
      return window.setCanonicalActiveWorkspace({
        ...workspace,
        _id: workspaceId,
        id: workspaceId,
        name: getWorkspaceName(workspace),
        workspaceName: getWorkspaceName(workspace)
      });
    }

    localStorage.setItem("tradeflowActiveWorkspace", workspaceId);
    localStorage.setItem("tradeflowActiveWorkspaceId", workspaceId);
    localStorage.setItem(ACTIVE_KEY, workspaceId);
    localStorage.setItem("activeWorkspaceId", workspaceId);
    localStorage.setItem("workspaceId", workspaceId);
    localStorage.setItem("tradeflowActiveWorkspaceName", getWorkspaceName(workspace));

    return workspaceId;
  }

  function seedDefaultWorkspace() {
    const workspaces = getWorkspaces();
    const activeId = getActiveWorkspaceId();

    if (!activeId && workspaces.length) {
      setActiveWorkspace(workspaces[0]);
    }
  }

  function createWorkspace() {
    if (!requireLogin()) return;

    const workspaces = getWorkspaces();
    const limit = getWorkspaceLimit();

    if (workspaces.length >= limit) {
      alert(`Your current plan allows ${limit} workspace(s). Upgrade to create more.`);
      return;
    }

    const name = prompt("Workspace name? Example: Rice Export UAE");
    if (!name) return;

    const product = prompt("Main product/category? Example: Rice, Medicine, Jaggery") || "";
    const targetMarket = prompt("Target market/country? Example: UAE, Africa, Europe") || "";

    const user = getUser() || {};
    const backendUrl =
      window.BACKEND_URL ||
      (window.location.hostname.includes("localhost")
        ? window.location.origin
        : "https://trade-flow-lc1k.onrender.com");
    const token = user.token || getToken();

    fetch(`${backendUrl}/api/workspaces`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : ""
      },
      credentials: "include",
      body: JSON.stringify({
        workspaceName: name,
        type: getBusinessType(),
        industry: product,
        country: targetMarket,
        status: "Active"
      })
    })
      .then((res) => res.json().then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (!res.ok || data.success === false || !data.workspace) {
          throw new Error(data.message || "Workspace creation failed");
        }

        const workspaceId = String(data.workspace._id || "");
        if (!isMongoObjectId(workspaceId)) {
          throw new Error("Backend workspace id missing");
        }

        const workspace = {
          ...data.workspace,
          _id: workspaceId,
          id: workspaceId,
          name: getWorkspaceName(data.workspace),
          workspaceName: getWorkspaceName(data.workspace),
          product: data.workspace.industry || product,
          targetMarket: data.workspace.country || targetMarket,
          businessType: data.workspace.businessType || data.workspace.type || getBusinessType(),
          status: data.workspace.status || "Active",
          backend: true
        };

        const next = [workspace, ...workspaces.filter((item) => item.id !== workspaceId)];
        saveWorkspaces(next);
        setActiveWorkspace(workspace);
        render();
        alert("Workspace created and activated.");
      })
      .catch((error) => {
        alert(error.message || "Workspace creation failed");
      });

    return;
  }

  function activateWorkspace(id) {
    const workspaces = getWorkspaces();
    const workspace = workspaces.find(w => w.id === id);

    if (!workspace) {
      alert("Workspace not found.");
      return;
    }

    const workspaceId = setActiveWorkspace(workspace);
    if (!workspaceId) return;

    render();

    alert(`${workspace.name} is now active.`);
  }

  function deleteWorkspace(id) {
    const workspaces = getWorkspaces();

    if (workspaces.length <= 1) {
      alert("At least one workspace is required.");
      return;
    }

    const ok = confirm("Delete this workspace? This action cannot be undone.");
    if (!ok) return;

    const next = workspaces.filter(w => w.id !== id);
    saveWorkspaces(next);

    if (getActiveWorkspaceId() === id) {
      if (next[0]) {
        setActiveWorkspace(next[0]);
      } else if (typeof window.clearCanonicalActiveWorkspace === "function") {
        window.clearCanonicalActiveWorkspace();
      }
    }

    render();
  }

  function renderPanel() {
    const dashboard = $("dashboardPage");
    if (!dashboard) return;

    seedDefaultWorkspace();

    const workspaces = getWorkspaces();
    const active = getActiveWorkspace();
    const limit = getWorkspaceLimit();

    let panel = $("workspaceEngineV1Panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "workspaceEngineV1Panel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";

      const businessPanel = $("businessTypeV2Panel");
      if (businessPanel && businessPanel.parentNode) {
        businessPanel.parentNode.insertBefore(panel, businessPanel.nextSibling);
      } else {
        dashboard.prepend(panel);
      }
    }

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <div class="section-title">🏢 Workspace Engine V1</div>
          <h2 style="font-size:28px;font-weight:900;color:white;margin:6px 0;">
            ${active ? getWorkspaceName(active) : "No Backend Workspace Selected"}
          </h2>
          <p class="muted">
            Workspaces separate your products, markets, CRM, suppliers, documents and analytics.
            Business Type stays locked as <b>${getBusinessType()}</b>.
          </p>
        </div>

        <div style="text-align:right;">
          <div style="font-weight:900;color:#7dd3fc;">
            ${workspaces.length} / ${limit === 999 ? "Unlimited" : limit} Workspaces
          </div>
          <button class="btn" style="margin-top:10px;" onclick="TradeFlowWorkspaceEngineV1.createWorkspace()">
            + Create Workspace
          </button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:18px;">
        ${workspaces.map(ws => `
          <div style="
            padding:16px;
            border-radius:18px;
            background:${ws.id === getActiveWorkspaceId() ? "rgba(37,99,235,.22)" : "rgba(15,23,42,.72)"};
            border:1px solid ${ws.id === getActiveWorkspaceId() ? "rgba(147,197,253,.55)" : "rgba(148,163,184,.16)"};
          ">
            <h3 style="font-size:18px;font-weight:900;color:white;margin:0 0 8px;">
              ${getWorkspaceName(ws)}
            </h3>

            <p class="muted">Product: ${ws.product || "Not set"}</p>
            <p class="muted">Market: ${ws.targetMarket || "Not set"}</p>
            <p class="muted">Business Type: ${ws.businessType}</p>

            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
              <button class="mini-btn" onclick="TradeFlowWorkspaceEngineV1.activateWorkspace('${ws.id}')">
                Activate
              </button>

              <button class="danger-btn" onclick="TradeFlowWorkspaceEngineV1.deleteWorkspace('${ws.id}')">
                Delete
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function updateWorkspaceLabels() {
    const active = getActiveWorkspace();
    const user = getUser();

    const workspaceName = $("workspaceName");
    const userBadge = $("userBadge");

    if (workspaceName && active) {
      workspaceName.innerText = `${getWorkspaceName(active)} • ${user?.name || "User"}`;
    }

    if (userBadge && active) {
      userBadge.innerText = `${getBusinessType()} • ${getWorkspaceName(active)}`;
    }
  }

  function updateAIConsole() {
    const active = getActiveWorkspace();
    const box = $("tradeflowAiConsole");

    if (!box || !active) return;

    if (!box.value || box.value.includes("TradeFlow AI Copilot ready")) {
      box.value = `TradeFlow AI Copilot ready for workspace: ${getWorkspaceName(active)}

Business Type:
${getBusinessType()}

Workspace Focus:
Product: ${active.product || "Not set"}
Target Market: ${active.targetMarket || "Not set"}

Recommended actions:
1. Add workspace-specific leads.
2. Move serious opportunities into CRM.
3. Generate outreach for this market.
4. Track analytics by workspace.
5. Prepare documents for this product/market.`;
    }
  }

  function render() {
    if (!requireLogin()) return;

    seedDefaultWorkspace();
    renderPanel();
    updateWorkspaceLabels();
    updateAIConsole();
  }

  function boot() {
    if (!requireLogin()) return;

    setTimeout(render, 900);

    document.addEventListener("tradeflow:page-change", function () {
      setTimeout(render, 150);
    });

    console.log("✅ TradeFlow Workspace Engine V1 active");
  }

  window.TradeFlowWorkspaceEngineV1 = {
    getWorkspaces,
    getActiveWorkspace,
    getActiveWorkspaceId,
    createWorkspace,
    activateWorkspace,
    deleteWorkspace,
    render
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
