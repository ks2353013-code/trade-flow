/* TradeFlow Government Trade Gateway */
(function () {
  if (window.TradeFlowGovernmentGateway) return;

  function apiBase() {
    return window.TRADEFLOW_API_BASE || window.TRADEFLOW_API_BASE_URL || window.BACKEND_URL ||
      (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)
        ? window.location.origin
        : "https://trade-flow-lc1k.onrender.com");
  }

  function token() {
    try {
      const user = JSON.parse(localStorage.getItem("tradeflowUser") || "null");
      return user?.token || user?.accessToken || localStorage.getItem("tradeflowAccessToken") || "";
    } catch {
      return localStorage.getItem("tradeflowAccessToken") || "";
    }
  }

  function workspaceId() {
    return window.TradeFlowWorkspace?.getActiveWorkspaceId?.() || "";
  }

  function headers() {
    const value = { "Content-Type": "application/json", Authorization: token() ? `Bearer ${token()}` : "" };
    if (workspaceId()) value["x-workspace-id"] = workspaceId();
    return value;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  async function request(path, options = {}) {
    const response = await fetch(`${apiBase()}${path}`, {
      credentials: "include",
      ...options,
      headers: { ...headers(), ...(options.headers || {}) }
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || "Government Gateway request failed");
    return data;
  }

  function notify(message) {
    const panel = document.getElementById("governmentGatewayNotice");
    if (panel) panel.innerHTML = `<div class="deal">${escapeHtml(message)}</div>`;
  }

  function renderStatus(status) {
    const target = document.getElementById("governmentGatewayStatus");
    if (!target) return;
    target.innerHTML =
      `<div class="stats-grid"><div class="stat"><div class="stat-number">${status.systems || 0}</div><div class="stat-label">Official systems</div></div>` +
      `<div class="stat"><div class="stat-number">${status.actions || 0}</div><div class="stat-label">Workflow actions</div></div>` +
      `<div class="stat"><div class="stat-number">${status.completed || 0}</div><div class="stat-label">Completed</div></div>` +
      `<div class="stat"><div class="stat-number">${status.readinessPercent || 0}%</div><div class="stat-label">Readiness</div></div></div>`;
  }

  function renderConnections(connections) {
    const target = document.getElementById("governmentGatewayConnections");
    if (!target) return;

    target.innerHTML = connections.map((connection) => {
      const actions = Array.isArray(connection.actions) ? connection.actions : [];
      const completed = actions.filter((action) => action.status === "completed").length;

      return `<div class="supplier-card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
          <div><h3 style="font-size:18px;font-weight:900;">${escapeHtml(connection.displayName)}</h3>
          <p class="muted">${escapeHtml(connection.connectionMode.replaceAll("_", " "))} • ${completed}/${actions.length} actions complete</p></div>
          <a class="mini-btn" href="${escapeHtml(connection.officialUrl)}" target="_blank" rel="noopener noreferrer">Official portal ↗</a>
        </div>
        <div style="margin-top:12px;display:grid;gap:8px;">
          ${actions.map((action) => `<div class="deal" style="padding:10px 12px;">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
              <div><strong>${escapeHtml(action.title)}</strong><div class="muted">${escapeHtml(action.description)}</div></div>
              <select onchange="TradeFlowGovernmentGateway.updateAction('${escapeHtml(connection.systemKey)}','${escapeHtml(action.actionKey)}',this.value)">
                ${["not_started","ready","in_progress","submitted","completed","blocked","manual_required"].map((value) =>
                  `<option value="${value}" ${value === action.status ? "selected" : ""}>${value.replaceAll("_"," ")}</option>`
                ).join("")}
              </select>
            </div>
          </div>`).join("")}
        </div>
      </div>`;
    }).join("");
  }

  async function refresh() {
    if (!workspaceId()) { notify("Select or create a workspace before using Government Trade Gateway."); return; }
    try {
      const [connectionsResponse, statusResponse] = await Promise.all([
        request("/api/government-gateway/connections"),
        request("/api/government-gateway/status")
      ]);
      renderConnections(connectionsResponse.connections || []);
      renderStatus(statusResponse.status || {});
      notify("Government Gateway synchronized with this workspace.");
    } catch (error) { notify(error.message); }
  }

  async function createMissionPlan() {
    const product = document.getElementById("governmentGatewayProduct")?.value.trim();
    const country = document.getElementById("governmentGatewayCountry")?.value.trim();
    const direction = document.getElementById("governmentGatewayDirection")?.value || "Export";
    if (!product || !country) { notify("Enter both a product and target country."); return; }

    try {
      const response = await request("/api/government-gateway/mission-plan", {
        method: "POST",
        body: JSON.stringify({ product, country, direction })
      });
      window.TradeFlowGovernmentGateway.lastPlan = response.plan;
      const box = document.getElementById("governmentGatewayPlan");
      if (box) {
        box.innerHTML = `<div class="deal" style="margin-top:14px;"><strong>${response.plan.summary.totalSystems} official systems</strong><span class="muted"> • ${response.plan.summary.totalActions} actions</span></div>`;
      }
      notify("Government execution checklist created. Official submissions remain under the relevant government system.");
    } catch (error) { notify(error.message); }
  }

  async function updateAction(systemKey, actionKey, status) {
    try {
      await request(`/api/government-gateway/connections/${encodeURIComponent(systemKey)}/actions/${encodeURIComponent(actionKey)}/status`, {
        method: "POST",
        body: JSON.stringify({ status })
      });
      await refresh();
    } catch (error) { notify(error.message); }
  }

  window.TradeFlowGovernmentGateway = { refresh, createMissionPlan, updateAction };
  document.addEventListener("tradeflow:bootstrap-complete", () => setTimeout(refresh, 900));
})();
