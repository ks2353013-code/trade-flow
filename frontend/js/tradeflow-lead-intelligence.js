/* TradeFlow Replica Intelligence UI
   Surfaces the new evidence/freshness/intent layer inside the existing CRM.
*/

(function () {
  function token() {
    return window.getTradeflowToken?.() || window.getAuthToken?.() || "";
  }

  function workspaceId() {
    const user = window.getTradeflowUser?.() || {};
    return localStorage.getItem("tradeflowActiveWorkspaceId") || user.workspaceId || "";
  }

  async function request(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    const authToken = token();
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    const activeWorkspace = workspaceId();
    if (activeWorkspace) headers["x-workspace-id"] = activeWorkspace;

    const response = await fetch(path, {
      ...options,
      headers,
      credentials: "include"
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Request failed");
    return payload;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function intentClass(status) {
    if (status === "High Intent") return "🟢";
    if (status === "Promising") return "🟡";
    if (status === "Watch") return "🟠";
    return "🔴";
  }

  async function refresh() {
    const root = document.getElementById("tradeflowLeadIntelligenceList");
    if (!root) return;

    root.innerHTML = '<div class="muted">Loading lead intelligence…</div>';

    try {
      const result = await request("/api/lead-intelligence");
      if (!result.leads?.length) {
        root.innerHTML = '<div class="muted">No CRM intelligence is available yet. Push verified leads into CRM first.</div>';
        return;
      }

      root.innerHTML = result.leads.map(lead => `
        <div class="deal">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <b>${escapeHtml(lead.companyName || "Unnamed lead")}</b>
            <span>${intentClass(lead.tradeIntentStatus)} ${escapeHtml(lead.tradeIntentStatus || "Watch")} · ${Number(lead.tradeIntentScore || 0)}%</span>
          </div>
          <div class="muted" style="margin-top:6px;">
            ${escapeHtml(lead.leadType || "Lead")} · ${escapeHtml(lead.country || "Unknown market")}
          </div>
          <div style="margin-top:8px;">
            Verification: <b>${Number(lead.verificationScore || 0)}%</b>
            · Freshness: <b>${Number(lead.freshnessScore || 0)}%</b>
            · ${escapeHtml(lead.freshnessStatus || "Unknown")}
          </div>
          ${lead.evidence?.length ? `<div class="muted" style="margin-top:6px;">Evidence: ${escapeHtml(lead.evidence.join(" · "))}</div>` : ""}
          ${lead.warnings?.length ? `<div class="muted" style="margin-top:6px;">⚠️ ${escapeHtml(lead.warnings.join(" · "))}</div>` : ""}
        </div>
      `).join("");
    } catch (error) {
      root.innerHTML = `<div class="muted">Lead intelligence unavailable: ${escapeHtml(error.message)}</div>`;
    }
  }

  window.TradeFlowLeadIntelligence = { refresh };
})();
