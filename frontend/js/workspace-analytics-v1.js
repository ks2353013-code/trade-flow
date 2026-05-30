/* TradeFlow Workspace Analytics V1
   Executive analytics per workspace.
*/

(function () {
  if (window.TradeFlowWorkspaceAnalyticsV1) return;

  function getActiveWorkspace() {
    return window.TradeFlowWorkspaceEngineV1?.getActiveWorkspace?.() || null;
  }

  function getWorkspaces() {
    return window.TradeFlowWorkspaceEngineV1?.getWorkspaces?.() || [];
  }

  function getAnalytics(workspace) {
    if (!workspace) {
      return {
        leads: 0,
        deals: 0,
        tasks: 0,
        conversion: 0,
        pipelineValue: 0
      };
    }

    /* Demo analytics layer for now.
       Later connect to backend analytics route.
    */

    const seed = workspace.name.length;

    return {
      leads: seed * 4,
      deals: seed,
      tasks: seed * 2,
      conversion: Math.min(85, 20 + seed),
      pipelineValue: seed * 125000
    };
  }

  function formatCurrency(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
  }

  function render() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return;

    const workspace = getActiveWorkspace();
    const analytics = getAnalytics(workspace);

    let panel = document.getElementById("workspaceAnalyticsV1Panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "workspaceAnalyticsV1Panel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";

      dashboard.prepend(panel);
    }

    panel.innerHTML = `
      <div class="section-title">📊 Workspace Analytics V1</div>

      <h2 style="font-size:28px;font-weight:900;color:white;margin-top:8px;">
        ${workspace?.name || "No Workspace Selected"}
      </h2>

      <p class="muted">
        Executive analytics for the currently active workspace.
      </p>

      <div style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
        gap:14px;
        margin-top:18px;
      ">

        <div class="deal">
          <div class="muted">Leads</div>
          <h3>${analytics.leads}</h3>
        </div>

        <div class="deal">
          <div class="muted">Deals</div>
          <h3>${analytics.deals}</h3>
        </div>

        <div class="deal">
          <div class="muted">Tasks</div>
          <h3>${analytics.tasks}</h3>
        </div>

        <div class="deal">
          <div class="muted">Conversion</div>
          <h3>${analytics.conversion}%</h3>
        </div>

        <div class="deal">
          <div class="muted">Pipeline Value</div>
          <h3>${formatCurrency(analytics.pipelineValue)}</h3>
        </div>

      </div>

      <div style="margin-top:18px;">
        <h3 style="color:white;">Workspace Comparison</h3>

        <div style="
          display:grid;
          grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
          gap:12px;
          margin-top:12px;
        ">
          ${getWorkspaces().map(ws => {
            const a = getAnalytics(ws);

            return `
              <div style="
                padding:14px;
                border-radius:14px;
                background:rgba(15,23,42,.72);
                border:1px solid rgba(148,163,184,.16);
              ">
                <b>${ws.name}</b>
                <div class="muted">Leads: ${a.leads}</div>
                <div class="muted">Deals: ${a.deals}</div>
                <div class="muted">Pipeline: ${formatCurrency(a.pipelineValue)}</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function boot() {
    render();

    setInterval(render, 5000);

    console.log("✅ Workspace Analytics V1 active");
  }

  window.TradeFlowWorkspaceAnalyticsV1 = {
    render
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();