/* TradeFlow Workspace Permission Engine V1
   Controls which users/employees can access which workspaces.
   Production-safe frontend access layer.
*/

(function () {
  if (window.TradeFlowWorkspacePermissionEngineV1) return;

  const ACCESS_KEY = "tradeflowWorkspaceAccessV1";
  const ACTIVE_KEY = "tradeflowActiveWorkspaceV1";
  const WORKSPACES_KEY = "tradeflowWorkspacesV1";

  const OWNER_EMAILS = [
    "ks2353013@gmail.com",
    "contact@tradeflowai.in"
  ];

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

  function getWorkspaces() {
    try {
      return JSON.parse(localStorage.getItem(WORKSPACES_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function getAccessMap() {
    try {
      return JSON.parse(localStorage.getItem(ACCESS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveAccessMap(map) {
    localStorage.setItem(ACCESS_KEY, JSON.stringify(map || {}));
  }

  function isOwner() {
    const email = String(getUser()?.email || "").toLowerCase().trim();
    const role = String(getUser()?.role || "").toLowerCase();

    return (
      OWNER_EMAILS.includes(email) ||
      role.includes("master") ||
      role.includes("founder") ||
      role.includes("owner") ||
      role.includes("admin")
    );
  }

  function getCurrentEmail() {
    return String(getUser()?.email || "").toLowerCase().trim();
  }

  function canAccessWorkspace(workspaceId) {
    if (isOwner()) return true;

    const email = getCurrentEmail();
    const accessMap = getAccessMap();
    const allowed = accessMap[email] || [];

    return allowed.includes(workspaceId);
  }

  function getAccessibleWorkspaces() {
    const workspaces = getWorkspaces();

    if (isOwner()) return workspaces;

    return workspaces.filter((workspace) => canAccessWorkspace(workspace.id));
  }

  function protectActiveWorkspace() {
    const activeId = localStorage.getItem(ACTIVE_KEY);
    const accessible = getAccessibleWorkspaces();

    if (!accessible.length) {
      return false;
    }

    if (!activeId || !canAccessWorkspace(activeId)) {
      localStorage.setItem(ACTIVE_KEY, accessible[0].id);
    }

    return true;
  }

  function assignWorkspaceAccess(email, workspaceId) {
    if (!isOwner()) {
      alert("Only owner/admin can assign workspace access.");
      return;
    }

    email = String(email || "").toLowerCase().trim();

    if (!email || !workspaceId) {
      alert("Email and workspace are required.");
      return;
    }

    const map = getAccessMap();
    map[email] = map[email] || [];

    if (!map[email].includes(workspaceId)) {
      map[email].push(workspaceId);
    }

    saveAccessMap(map);
    render();

    alert("Workspace access assigned.");
  }

  function removeWorkspaceAccess(email, workspaceId) {
    if (!isOwner()) {
      alert("Only owner/admin can remove workspace access.");
      return;
    }

    email = String(email || "").toLowerCase().trim();

    const map = getAccessMap();
    map[email] = (map[email] || []).filter((id) => id !== workspaceId);

    saveAccessMap(map);
    render();

    alert("Workspace access removed.");
  }

  function renderPanel() {
    const dashboard = $("dashboardPage");
    if (!dashboard) return;

    let panel = $("workspacePermissionEnginePanel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "workspacePermissionEnginePanel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";

      const workspacePanel = $("workspaceEngineV1Panel");
      if (workspacePanel && workspacePanel.parentNode) {
        workspacePanel.parentNode.insertBefore(panel, workspacePanel.nextSibling);
      } else {
        dashboard.appendChild(panel);
      }
    }

    const workspaces = getWorkspaces();
    const accessible = getAccessibleWorkspaces();
    const map = getAccessMap();

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <div class="section-title">🔐 Workspace Permission Engine V1</div>
          <h2 style="font-size:26px;font-weight:900;color:white;margin:6px 0;">
            Workspace Access Control
          </h2>
          <p class="muted">
            Control which employees/users can access each workspace.
            Owners/Admins can see all workspaces.
          </p>
        </div>

        <div style="text-align:right;">
          <div style="font-weight:900;color:#7dd3fc;">
            Accessible: ${accessible.length} / ${workspaces.length}
          </div>
        </div>
      </div>

      ${isOwner() ? `
        <div style="margin-top:18px;padding:16px;border-radius:18px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.16);">
          <h3 style="color:white;font-weight:900;margin:0 0 12px;">Assign Workspace Access</h3>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
            <input id="workspaceAccessEmail" placeholder="Employee/User email" />

            <select id="workspaceAccessSelect">
              ${workspaces.map(ws => `
                <option value="${ws.id}">
                  ${ws.name}
                </option>
              `).join("")}
            </select>

            <button class="btn" onclick="TradeFlowWorkspacePermissionEngineV1.assignFromForm()">
              Assign Access
            </button>
          </div>
        </div>
      ` : `
        <div style="margin-top:18px;padding:16px;border-radius:18px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.16);">
          <b style="color:white;">Your Access:</b>
          <span class="muted">You can only access workspaces assigned by your company admin.</span>
        </div>
      `}

      <div style="margin-top:18px;">
        <h3 style="color:white;font-weight:900;margin:0 0 12px;">Workspace Visibility</h3>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;">
          ${workspaces.map(ws => `
            <div style="
              padding:16px;
              border-radius:18px;
              background:${canAccessWorkspace(ws.id) ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.10)"};
              border:1px solid ${canAccessWorkspace(ws.id) ? "rgba(34,197,94,.30)" : "rgba(239,68,68,.25)"};
            ">
              <h3 style="color:white;font-weight:900;margin:0 0 8px;">${ws.name}</h3>
              <p class="muted">Product: ${ws.product || "Not set"}</p>
              <p class="muted">Market: ${ws.targetMarket || "Not set"}</p>

              <div style="font-weight:900;margin-top:10px;color:${canAccessWorkspace(ws.id) ? "#22c55e" : "#f87171"};">
                ${canAccessWorkspace(ws.id) ? "✅ Accessible" : "🔒 Restricted"}
              </div>

              ${isOwner() ? `
                <div style="margin-top:12px;">
                  <div class="muted" style="font-weight:900;">Assigned users:</div>
                  ${
                    Object.keys(map)
                      .filter(email => (map[email] || []).includes(ws.id))
                      .map(email => `
                        <div style="display:flex;justify-content:space-between;gap:8px;margin-top:8px;">
                          <span style="color:#cbd5e1;font-size:12px;">${email}</span>
                          <button class="danger-btn" onclick="TradeFlowWorkspacePermissionEngineV1.removeWorkspaceAccess('${email}','${ws.id}')">
                            Remove
                          </button>
                        </div>
                      `).join("") || `<div class="muted">No assigned employees yet.</div>`
                  }
                </div>
              ` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function assignFromForm() {
    const email = $("workspaceAccessEmail")?.value || "";
    const workspaceId = $("workspaceAccessSelect")?.value || "";

    assignWorkspaceAccess(email, workspaceId);
  }

  function patchWorkspaceEngine() {
    if (!window.TradeFlowWorkspaceEngineV1) return;
    if (window.TradeFlowWorkspacePermissionPatched) return;

    window.TradeFlowWorkspacePermissionPatched = true;

    const originalGetWorkspaces =
      window.TradeFlowWorkspaceEngineV1.getWorkspaces;

    if (typeof originalGetWorkspaces === "function") {
      window.TradeFlowWorkspaceEngineV1.getWorkspaces = function () {
        return getAccessibleWorkspaces();
      };
    }

    const originalActivate =
      window.TradeFlowWorkspaceEngineV1.activateWorkspace;

    if (typeof originalActivate === "function") {
      window.TradeFlowWorkspaceEngineV1.activateWorkspace = function (id) {
        if (!canAccessWorkspace(id)) {
          alert("You do not have access to this workspace.");
          return;
        }

        originalActivate(id);
      };
    }
  }

  function render() {
    if (!requireLogin()) return;

    protectActiveWorkspace();
    patchWorkspaceEngine();
    renderPanel();
  }

  function boot() {
    if (!requireLogin()) return;

    setTimeout(render, 1200);

    document.addEventListener("tradeflow:page-change", function () {
      setTimeout(render, 200);
    });

    setInterval(() => {
      patchWorkspaceEngine();
      protectActiveWorkspace();
    }, 5000);

    console.log("✅ Workspace Permission Engine V1 active");
  }

  window.TradeFlowWorkspacePermissionEngineV1 = {
    canAccessWorkspace,
    getAccessibleWorkspaces,
    assignWorkspaceAccess,
    removeWorkspaceAccess,
    assignFromForm,
    render
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();