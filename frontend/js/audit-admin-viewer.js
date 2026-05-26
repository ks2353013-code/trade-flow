/* TradeFlow Audit Admin Viewer */

(function () {
  if (window.TradeFlowAuditAdminViewer) return;

  const MASTER_EMAIL = "ks2353013@gmail.com";

  function getUserEmail() {
    return (
      localStorage.getItem("userEmail") ||
      localStorage.getItem("tradeflowUserEmail") ||
      localStorage.getItem("email") ||
      ""
    )
      .toLowerCase()
      .trim();
  }

  function isMasterAdmin() {
    return getUserEmail() === MASTER_EMAIL;
  }

  function getPanel() {
    let panel = document.getElementById("auditAdminPanel");

    if (!panel) {
      const masterPage = document.getElementById("masterPage");
      if (!masterPage) return null;

      panel = document.createElement("div");
      panel.id = "auditAdminPanel";
      panel.className = "card";
      panel.innerHTML = `
        <div class="section-title">🛡️ Enterprise Audit & Security Logs</div>
        <p class="muted">
          Monitor supplier, CRM, employee, workspace, outreach, and admin actions across TradeFlow.
        </p>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0;">
          <select id="auditModuleFilter">
            <option value="">All Modules</option>
            <option value="Suppliers">Suppliers</option>
            <option value="CRM">CRM</option>
            <option value="Tasks">Tasks</option>
            <option value="Outreach">Outreach</option>
            <option value="Employees">Employees</option>
            <option value="Workspaces">Workspaces</option>
            <option value="Companies">Companies</option>
            <option value="Subscription">Subscription</option>
            <option value="AI">AI</option>
          </select>

          <select id="auditSeverityFilter">
            <option value="">All Severity</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>

          <button class="btn" onclick="TradeFlowAuditAdminViewer.fetchLogs()">Refresh Audit Logs</button>
        </div>

        <div id="auditSummaryBox"></div>
        <div id="auditLogList"></div>
      `;

      masterPage.appendChild(panel);
    }

    return panel;
  }

  async function fetchSummary() {
    try {
      const res = await fetch("/api/audit/summary", {
        headers: {
          "x-user-email": getUserEmail()
        }
      });

      const data = await res.json();

      const box = document.getElementById("auditSummaryBox");
      if (!box || !data.success) return;

      const summary = data.summary || {};

      box.innerHTML = `
        <div class="grid grid-3" style="margin:12px 0;">
          <div class="deal"><b>Total Logs:</b> ${summary.total || 0}</div>
          <div class="deal"><b>Modules:</b> ${Object.keys(summary.byModule || {}).length}</div>
          <div class="deal"><b>Critical:</b> ${(summary.bySeverity || {}).Critical || 0}</div>
        </div>
      `;
    } catch (error) {
      console.warn("Audit summary failed:", error.message);
    }
  }

  async function fetchLogs() {
    if (!isMasterAdmin()) return;

    getPanel();

    const list = document.getElementById("auditLogList");
    if (!list) return;

    list.innerHTML = `<div class="deal">Loading audit logs...</div>`;

    const moduleFilter = document.getElementById("auditModuleFilter")?.value || "";
    const severityFilter = document.getElementById("auditSeverityFilter")?.value || "";

    const params = new URLSearchParams();

    if (moduleFilter) params.set("module", moduleFilter);
    if (severityFilter) params.set("severity", severityFilter);
    params.set("limit", "100");

    try {
      const res = await fetch(`/api/audit?${params.toString()}`, {
        headers: {
          "x-user-email": getUserEmail()
        }
      });

      const data = await res.json();

      if (!data.success) {
        list.innerHTML = `<div class="deal">Failed to load logs: ${data.message || "Unknown error"}</div>`;
        return;
      }

      await fetchSummary();

      if (!data.logs || data.logs.length === 0) {
        list.innerHTML = `<div class="deal">No audit logs found.</div>`;
        return;
      }

      list.innerHTML = data.logs
        .map((log) => {
          const meta = log.metadata
            ? JSON.stringify(log.metadata).slice(0, 180)
            : "";

          return `
            <div class="deal" style="margin-bottom:12px;">
              <b>${log.module || "General"}</b> — ${log.action || ""}
              <br>
              Severity: <b>${log.severity || "Low"}</b>
              <br>
              User: ${log.ownerEmail || ""}
              <br>
              Entity: ${log.entityType || ""} ${log.entityId || ""}
              <br>
              Time: ${new Date(log.createdAt).toLocaleString()}
              <br>
              <span class="muted">${meta}</span>
            </div>
          `;
        })
        .join("");
    } catch (error) {
      list.innerHTML = `<div class="deal">Audit logs failed to load.</div>`;
    }
  }

  function boot() {
    document.addEventListener("tradeflow:page-change", function (event) {
      const page = event.detail?.page || "";

      if (page === "master") {
        getPanel();
        fetchLogs();
      }
    });

    setTimeout(() => {
      const masterPage = document.getElementById("masterPage");

      if (masterPage && !masterPage.classList.contains("hidden")) {
        getPanel();
        fetchLogs();
      }
    }, 1200);

    console.log("✅ Audit Admin Viewer active");
  }

  window.TradeFlowAuditAdminViewer = {
    fetchLogs,
    fetchSummary
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();