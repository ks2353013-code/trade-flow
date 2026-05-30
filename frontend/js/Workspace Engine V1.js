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
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveWorkspaces(workspaces) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
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

  function createId() {
    return "ws_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  }

  function seedDefaultWorkspace() {
    const existing = getWorkspaces();
    if (existing.length) return;

    const businessType = getBusinessType();

    const workspace = {
      id: createId(),
      name: `${businessType} Main Workspace`,
      product: "",
      targetMarket: "",
      businessType,
      status: "Active",
      createdAt: new Date().toISOString()
    };

    saveWorkspaces([workspace]);
    localStorage.setItem(ACTIVE_KEY, workspace.id);
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

    const workspace = {
      id: createId(),
      name,
      product,
      targetMarket,
      businessType: getBusinessType(),
      status: "Active",
      createdAt: new Date().toISOString()
    };

    workspaces.unshift(workspace);
    saveWorkspaces(workspaces);
    localStorage.setItem(ACTIVE_KEY, workspace.id);

    render();
    alert("Workspace created and activated.");
  }

  function activateWorkspace(id) {
    const workspaces = getWorkspaces();
    const workspace = workspaces.find(w => w.id === id);

    if (!workspace) {
      alert("Workspace not found.");
      return;
    }

    localStorage.setItem(ACTIVE_KEY, id);
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
      localStorage.setItem(ACTIVE_KEY, next[0]?.id || "");
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
            ${active ? active.name : "No Active Workspace"}
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
              ${ws.name}
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
      workspaceName.innerText = `${active.name} • ${user?.name || "User"}`;
    }

    if (userBadge && active) {
      userBadge.innerText = `${getBusinessType()} • ${active.name}`;
    }
  }

  function updateAIConsole() {
    const active = getActiveWorkspace();
    const box = $("tradeflowAiConsole");

    if (!box || !active) return;

    if (!box.value || box.value.includes("TradeFlow AI Copilot ready")) {
      box.value = `TradeFlow AI Copilot ready for workspace: ${active.name}

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