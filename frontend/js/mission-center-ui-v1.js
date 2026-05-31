/* TradeFlow Mission Center UI V1
   Read/display/control layer for TradeFlow Agent missions.
   No email sending. No WhatsApp sending. No calls.
*/

(function () {
  if (window.TradeFlowMissionCenterUIV1) return;

  const API_BASE =
    window.TRADEFLOW_API_BASE ||
    (window.location.hostname.includes("localhost")
      ? "http://localhost:5000"
      : "https://trade-flow-lc1k.onrender.com");
  const leadPushCache = new Map();
  const outreachDraftCache = new Map();
  let leadPushCounter = 0;
  let outreachDraftCounter = 0;
  const WORKSPACE_REQUIRED_MESSAGE =
    "Select or create a workspace before using Outreach Approval Queue";

  function getToken() {
    try {
      const storedUser = JSON.parse(localStorage.getItem("tradeflowUser") || "null");

      if (storedUser?.token) {
        return storedUser.token;
      }
    } catch {
      // Fall through to legacy token keys.
    }

    return (
      localStorage.getItem("tradeflowToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      ""
    );
  }

  function isMongoObjectId(value) {
    return /^[a-f\d]{24}$/i.test(String(value || "").trim());
  }

  function normalizeHeaderObject(input) {
    const headers = {};

    if (typeof Headers !== "undefined" && input instanceof Headers) {
      input.forEach((value, key) => {
        headers[key] = value;
      });

      return headers;
    }

    return {
      ...headers,
      ...(input || {})
    };
  }

  function getSelectWorkspaceId(id) {
    const select = document.getElementById(id);
    return select?.value || "";
  }

  function getActiveWorkspaceId() {
    const candidates = [
      getSelectWorkspaceId("activeWorkspaceSelect"),
      getSelectWorkspaceId("workspaceAccessSelect"),
      localStorage.getItem("tradeflowActiveWorkspaceId"),
      localStorage.getItem("tradeflowActiveWorkspace"),
      localStorage.getItem("tradeflowActiveWorkspaceV1")
    ];

    return candidates.find(isMongoObjectId) || "";
  }

  function clearWorkspaceHeader(headers) {
    Object.keys(headers).forEach((key) => {
      if (key.toLowerCase() === "x-workspace-id") {
        delete headers[key];
      }
    });
  }

  function missionHeaders() {
    const token = getToken();
    const headers = normalizeHeaderObject(
      window.getAuthHeaders
        ? window.getAuthHeaders()
        : {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : ""
          }
    );

    if (!headers.Authorization && token) {
      headers.Authorization = `Bearer ${token}`;
    }

    headers["Content-Type"] = headers["Content-Type"] || "application/json";

    clearWorkspaceHeader(headers);

    const workspaceId = getActiveWorkspaceId();
    if (workspaceId) {
      headers["x-workspace-id"] = workspaceId;
    }

    return headers;
  }

  function authHeaders() {
    return missionHeaders();
  }

  function hasActiveWorkspace() {
    return Boolean(getActiveWorkspaceId());
  }

  function requireActiveWorkspace() {
    if (hasActiveWorkspace()) return true;

    alert(WORKSPACE_REQUIRED_MESSAGE);
    return false;
  }

  function formatCurrency(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
  }

  function safeText(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function renderScoreBadge(label, value) {
    return `
      <span class="status" style="font-weight:900;">
        ${safeText(label)}: ${Number(value || 0)}
      </span>
    `;
  }

  function hasNumericValue(value) {
    return value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value));
  }

  function renderOptionalScoreBadge(label, value) {
    return hasNumericValue(value) ? renderScoreBadge(label, value) : "";
  }

  function canPushLeadToCRM(lead) {
    return Number(lead?.verificationScore || 0) >= 70;
  }

  function canCreateOutreachDraft(lead) {
    return Number(lead?.verificationScore || 0) >= 70;
  }

  function cacheLeadForPush(missionId, lead, sourceAgent, leadType) {
    const cacheId = `crm_push_${++leadPushCounter}`;

    leadPushCache.set(cacheId, {
      missionId,
      lead: {
        ...lead,
        leadType,
        sourceAgent
      }
    });

    return cacheId;
  }

  function renderPushToCRMButton(missionId, lead, sourceAgent, leadType) {
    if (!missionId || !canPushLeadToCRM(lead)) {
      return "";
    }

    const cacheId = cacheLeadForPush(missionId, lead, sourceAgent, leadType);

    return `
      <button class="mini-btn" onclick="TradeFlowMissionCenterUIV1.pushLeadToCRM('${cacheId}')">
        Push To CRM
      </button>
    `;
  }

  function cacheLeadForOutreach(missionId, lead, sourceAgent, leadType) {
    const cacheId = `outreach_draft_${++outreachDraftCounter}`;

    outreachDraftCache.set(cacheId, {
      missionId,
      channel: "Email Draft",
      lead: {
        ...lead,
        leadType,
        sourceAgent
      }
    });

    return cacheId;
  }

  function renderCreateOutreachDraftButton(missionId, lead, sourceAgent, leadType) {
    if (!missionId || !canCreateOutreachDraft(lead)) {
      return "";
    }

    const cacheId = cacheLeadForOutreach(missionId, lead, sourceAgent, leadType);

    return `
      <button class="mini-btn" onclick="TradeFlowMissionCenterUIV1.createOutreachDraft('${cacheId}')">
        Create Outreach Draft
      </button>
    `;
  }

  async function fetchMissions() {
    const res = await fetch(`${API_BASE}/api/trade-agent/missions`, {
      headers: authHeaders(),
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to fetch missions");
    }

    return data.missions || [];
  }

  async function fetchOutreachApprovals() {
    const res = await fetch(`${API_BASE}/api/outreach-approvals`, {
      headers: authHeaders(),
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to fetch outreach approvals");
    }

    return data.approvals || [];
  }

  async function fetchEmailDeliveries() {
    const res = await fetch(`${API_BASE}/api/email-deliveries`, {
      headers: authHeaders(),
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to fetch email deliveries");
    }

    return data.deliveries || [];
  }

  async function runMission() {
    const input = document.getElementById("missionCenterInput");
    const missionText = input?.value?.trim();

    if (!missionText) {
      alert("Enter a mission first. Example: Export Basmati Rice to UAE");
      return;
    }

    const res = await fetch(`${API_BASE}/api/trade-agent/run`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify({ missionText })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "Mission failed");
      return;
    }

    input.value = "";
    await render();
    alert("Mission created successfully.");
  }

  async function approveMission(id) {
    const ok = confirm("Approve this mission to move it from approval stage to running?");
    if (!ok) return;

    const res = await fetch(`${API_BASE}/api/trade-agent/missions/${id}/approve`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "Mission approval failed");
      return;
    }

    await render();
    alert("Mission approved.");
  }

  async function pushLeadToCRM(cacheId) {
    const cached = leadPushCache.get(cacheId);

    if (!cached) {
      alert("Lead data is no longer available. Refresh Mission Center and try again.");
      return;
    }

    if (!requireActiveWorkspace()) return;

    const res = await fetch(`${API_BASE}/api/crm/push`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify(cached)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "CRM push failed");
      return;
    }

    alert(data.duplicate ? "Lead already exists in CRM." : "Lead added to CRM");
  }

  async function createOutreachDraft(cacheId) {
    const cached = outreachDraftCache.get(cacheId);

    if (!cached) {
      alert("Lead data is no longer available. Refresh Mission Center and try again.");
      return;
    }

    if (!requireActiveWorkspace()) return;

    const res = await fetch(`${API_BASE}/api/outreach-approvals/create`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include",
      body: JSON.stringify(cached)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "Outreach draft creation failed");
      return;
    }

    await render();
    alert("Draft created. Human approval required before sending.");
  }

  async function approveOutreachDraft(id) {
    if (!requireActiveWorkspace()) return;

    const ok = confirm("Approve this stored draft? No message will be sent.");
    if (!ok) return;

    const res = await fetch(`${API_BASE}/api/outreach-approvals/${id}/approve`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "Draft approval failed");
      return;
    }

    await render();
    alert("Draft approved. No message was sent.");
  }

  async function rejectOutreachDraft(id) {
    if (!requireActiveWorkspace()) return;

    const ok = confirm("Reject this stored draft? No message will be sent.");
    if (!ok) return;

    const res = await fetch(`${API_BASE}/api/outreach-approvals/${id}/reject`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "Draft rejection failed");
      return;
    }

    await render();
    alert("Draft rejected. No message was sent.");
  }

  async function viewOutreachAudit(id) {
    if (!requireActiveWorkspace()) return;

    const res = await fetch(`${API_BASE}/api/outreach-approvals/${id}/audit`, {
      headers: authHeaders(),
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "Failed to load audit trail");
      return;
    }

    const auditRows = safeArray(data.audit);

    if (!auditRows.length) {
      alert("No audit records found for this draft.");
      return;
    }

    const lines = auditRows.map((row) => {
      const timestamp = row.timestamp
        ? new Date(row.timestamp).toLocaleString()
        : "Unknown time";
      const actor = row.actorEmail || "Unknown actor";
      const oldStatus = row.oldStatus || "None";
      const newStatus = row.newStatus || "None";

      return `${timestamp}\n${actor}\n${row.action || "Action"}: ${oldStatus} -> ${newStatus}`;
    });

    alert(`Approval Audit Trail\n\n${lines.join("\n\n")}`);
  }

  async function sendApprovedEmail(id) {
    if (!requireActiveWorkspace()) return;

    const ok = confirm("Send this approved email draft now?");
    if (!ok) return;

    const res = await fetch(`${API_BASE}/api/email-deliveries/send-approved/${id}`, {
      method: "POST",
      headers: authHeaders(),
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || "Email sending failed");
      return;
    }

    await render();
    alert(data.message || "Approved email sent successfully.");
  }

  function renderAgentReports(mission) {
    const reports = mission.agentReports || {};

    const cards = [
      ["Research", reports.research],
      ["Buyer Discovery", reports.buyerDiscovery],
      ["Supplier Discovery", reports.supplierDiscovery],
      ["CRM", reports.crm],
      ["Compliance", reports.compliance],
      ["Revenue", reports.revenue],
      ["Outreach", reports.outreach]
    ];

    return `
      <div style="margin-top:14px;">
        <h4 style="color:white;font-weight:900;margin-bottom:10px;">Agent Reports</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
          ${cards.map(([title, report]) => `
            <div style="padding:12px;border-radius:14px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.16);">
              <b style="color:#7dd3fc;">${title}</b>
              ${
                report
                  ? `<p class="muted" style="margin-top:6px;">${safeText(
                      report.executiveSummary ||
                      report.buyerProfile ||
                      report.supplierProfile ||
                      report.dealStrategy ||
                      report.status ||
                      report.subject ||
                      "Report available"
                    )}</p>`
                  : `<p class="muted" style="margin-top:6px;">Not available yet</p>`
              }
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }

  function renderBuyerCard(buyer, missionId) {
    return `
      <div class="deal">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
          <div>
            <b style="color:white;">${safeText(buyer.companyName || "Unknown buyer")}</b>
            <p class="muted" style="margin-top:4px;">
              ${safeText(buyer.country || "Unknown country")} &bull; ${safeText(buyer.buyerType || "Buyer")}
            </p>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${renderScoreBadge("Confidence", buyer.confidenceScore)}
            ${renderOptionalScoreBadge("Verification", buyer.verificationScore)}
            <span class="status">${safeText(buyer.verificationStatus || "Unverified")}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          ${renderPushToCRMButton(missionId, buyer, "Buyer Discovery Agent", "Buyer")}
          ${renderCreateOutreachDraftButton(missionId, buyer, "Buyer Discovery Agent", "Buyer")}
        </div>
      </div>
    `;
  }

  function renderSupplierCard(supplier, missionId) {
    return `
      <div class="deal">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
          <div>
            <b style="color:white;">${safeText(supplier.companyName || "Unknown supplier")}</b>
            <p class="muted" style="margin-top:4px;">
              ${safeText(supplier.country || "Unknown country")} &bull; ${safeText(supplier.supplierType || "Supplier")}
            </p>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${renderScoreBadge("Confidence", supplier.confidenceScore)}
            ${renderScoreBadge("Risk", supplier.riskScore)}
            ${renderOptionalScoreBadge("Verification", supplier.verificationScore)}
            <span class="status">${safeText(supplier.verificationStatus || "Unverified")}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          ${renderPushToCRMButton(missionId, supplier, "Supplier Discovery Agent", "Supplier")}
          ${renderCreateOutreachDraftButton(missionId, supplier, "Supplier Discovery Agent", "Supplier")}
        </div>
      </div>
    `;
  }

  function renderApprovalDraftCard(approval, showActions) {
    const id = safeText(approval._id);
    const canSendEmail =
      approval.status === "Approved" &&
      approval.channel === "Email Draft";

    return `
      <div class="deal">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
          <div>
            <b style="color:white;">${safeText(approval.subject || "Untitled draft")}</b>
            <p class="muted" style="margin-top:4px;">
              ${safeText(approval.leadName || "Unknown lead")} &bull; ${safeText(approval.channel || "Draft")} &bull; ${safeText(approval.status || "Pending Approval")}
            </p>
          </div>
          <span class="status">${safeText(approval.priority || "Medium")}</span>
        </div>
        <p class="muted" style="margin-top:8px;">
          ${safeText(approval.message || "").slice(0, 220)}
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;">
          ${
            showActions
              ? `
                <button class="mini-btn" onclick="TradeFlowMissionCenterUIV1.approveOutreachDraft('${id}')">
                  Approve
                </button>
                <button class="mini-btn" onclick="TradeFlowMissionCenterUIV1.rejectOutreachDraft('${id}')">
                  Reject
                </button>
              `
              : ""
          }
          <button class="mini-btn" onclick="TradeFlowMissionCenterUIV1.viewOutreachAudit('${id}')">
            View Audit
          </button>
          ${
            canSendEmail
              ? `<button class="mini-btn" onclick="TradeFlowMissionCenterUIV1.sendApprovedEmail('${id}')">
                  Send Email
                </button>`
              : ""
          }
        </div>
      </div>
    `;
  }

  function renderApprovalDraftGroup(title, approvals, showActions) {
    return `
      <div class="deal">
        <h4 style="color:white;font-weight:900;margin-bottom:10px;">${safeText(title)} (${approvals.length})</h4>
        <div style="display:grid;grid-template-columns:1fr;gap:10px;">
          ${
            approvals.length
              ? approvals.map((approval) => renderApprovalDraftCard(approval, showActions)).join("")
              : `<p class="muted">No drafts.</p>`
          }
        </div>
      </div>
    `;
  }

  function renderOutreachApprovalQueue(approvals = []) {
    const pending = approvals.filter((approval) =>
      ["Draft", "Pending Approval", "Needs Edit"].includes(approval.status)
    );
    const approved = approvals.filter((approval) => approval.status === "Approved");
    const rejected = approvals.filter((approval) => approval.status === "Rejected");

    return `
      <div style="margin-top:18px;">
        <h4 style="color:white;font-weight:900;margin-bottom:10px;">Outreach Approval Queue</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;">
          ${renderApprovalDraftGroup("Pending Drafts", pending, true)}
          ${renderApprovalDraftGroup("Approved Drafts", approved, false)}
          ${renderApprovalDraftGroup("Rejected Drafts", rejected, false)}
        </div>
      </div>
    `;
  }

  function renderWorkspaceRequiredSection(title) {
    return `
      <div style="margin-top:18px;">
        <h4 style="color:white;font-weight:900;margin-bottom:10px;">${safeText(title)}</h4>
        <div class="deal">${safeText(WORKSPACE_REQUIRED_MESSAGE)}</div>
      </div>
    `;
  }

  function renderEmailDeliveryCenter(deliveries = []) {
    return `
      <div style="margin-top:18px;">
        <h4 style="color:white;font-weight:900;margin-bottom:10px;">Email Delivery Center</h4>
        <div style="display:grid;grid-template-columns:1fr;gap:10px;">
          ${
            deliveries.length
              ? deliveries.map((delivery) => {
                  const sentTime = delivery.sentAt || delivery.createdAt;
                  const displayTime = sentTime
                    ? new Date(sentTime).toLocaleString()
                    : "Not sent yet";

                  return `
                    <div class="deal">
                      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;">
                        <div>
                          <b style="color:white;">${safeText(delivery.to || "Unknown recipient")}</b>
                          <p class="muted" style="margin-top:4px;">
                            ${safeText(delivery.subject || "Untitled email")}
                          </p>
                        </div>
                        <span class="status">${safeText(delivery.status || "Queued")}</span>
                      </div>
                      <p class="muted" style="margin-top:8px;">
                        Sent Time: ${safeText(displayTime)}
                      </p>
                    </div>
                  `;
                }).join("")
              : `<div class="deal">No email deliveries yet.</div>`
          }
        </div>
      </div>
    `;
  }

  function renderBuyerDiscoveryIntelligence(mission) {
    const report = mission.agentReports?.buyerDiscovery;

    if (!report) return "";

    const discoveredBuyers = safeArray(report.discoveredBuyers);
    const buyerLeaderboard = safeArray(report.buyerLeaderboard).slice(0, 5);
    const crmReadyBuyers = Array.isArray(report.crmReadyVerifiedBuyers)
      ? report.crmReadyVerifiedBuyers
      : safeArray(report.crmReadyBuyers);
    const verifiedBuyerLeads = safeArray(report.verifiedBuyerLeads);
    const rejectedBuyerLeads = safeArray(report.rejectedBuyerLeads);
    const buyerCards = (verifiedBuyerLeads.length ? verifiedBuyerLeads : buyerLeaderboard).slice(0, 5);

    return `
      <div style="margin-top:14px;">
        <h4 style="color:white;font-weight:900;margin-bottom:10px;">Buyer Discovery Intelligence</h4>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:12px;">
          <div class="deal">
            <div class="muted">Discovered Buyers</div>
            <h3>${discoveredBuyers.length}</h3>
          </div>
          <div class="deal">
            <div class="muted">CRM Ready Buyers</div>
            <h3>${crmReadyBuyers.length}</h3>
          </div>
          <div class="deal">
            <div class="muted">Verified Buyer Leads</div>
            <h3>${verifiedBuyerLeads.length}</h3>
          </div>
          <div class="deal">
            <div class="muted">Rejected Buyer Leads</div>
            <h3>${rejectedBuyerLeads.length}</h3>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr;gap:10px;">
          ${
            buyerCards.length
              ? buyerCards.map((buyer) => renderBuyerCard(buyer, mission._id)).join("")
              : `<div class="deal">No buyer leaderboard available yet.</div>`
          }
        </div>
      </div>
    `;
  }

  function renderSupplierDiscoveryIntelligence(mission) {
    const report = mission.agentReports?.supplierDiscovery;

    if (!report) return "";

    const discoveredSuppliers = safeArray(report.discoveredSuppliers);
    const supplierLeaderboard = safeArray(report.supplierLeaderboard).slice(0, 5);
    const networkReadySuppliers = Array.isArray(report.networkReadyVerifiedSuppliers)
      ? report.networkReadyVerifiedSuppliers
      : safeArray(report.networkReadySuppliers);
    const verifiedSupplierLeads = safeArray(report.verifiedSupplierLeads);
    const rejectedSupplierLeads = safeArray(report.rejectedSupplierLeads);
    const supplierCards = (verifiedSupplierLeads.length ? verifiedSupplierLeads : supplierLeaderboard).slice(0, 5);

    return `
      <div style="margin-top:14px;">
        <h4 style="color:white;font-weight:900;margin-bottom:10px;">Supplier Discovery Intelligence</h4>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:12px;">
          <div class="deal">
            <div class="muted">Discovered Suppliers</div>
            <h3>${discoveredSuppliers.length}</h3>
          </div>
          <div class="deal">
            <div class="muted">Network Ready Suppliers</div>
            <h3>${networkReadySuppliers.length}</h3>
          </div>
          <div class="deal">
            <div class="muted">Verified Supplier Leads</div>
            <h3>${verifiedSupplierLeads.length}</h3>
          </div>
          <div class="deal">
            <div class="muted">Rejected Supplier Leads</div>
            <h3>${rejectedSupplierLeads.length}</h3>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr;gap:10px;">
          ${
            supplierCards.length
              ? supplierCards.map((supplier) => renderSupplierCard(supplier, mission._id)).join("")
              : `<div class="deal">No supplier leaderboard available yet.</div>`
          }
        </div>
      </div>
    `;
  }

  function renderMissionCard(mission) {
    return `
      <div style="
        padding:18px;
        border-radius:22px;
        background:rgba(15,23,42,.78);
        border:1px solid rgba(125,211,252,.18);
        box-shadow:0 18px 50px rgba(0,0,0,.25);
      ">
        <div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap;">
          <div>
            <h3 style="color:white;font-size:22px;font-weight:900;margin:0 0 8px;">
              ${safeText(mission.missionText)}
            </h3>

            <p class="muted">
              ${safeText(mission.direction)} • ${safeText(mission.product)} • ${safeText(mission.market)}
            </p>

            <p style="font-weight:900;color:${mission.status === "Needs Approval" ? "#facc15" : "#22c55e"};">
              Status: ${safeText(mission.status)}
            </p>
          </div>

          <div style="text-align:right;">
            <div class="deal">
              <div class="muted">Opportunity</div>
              <h3>${mission.opportunityScore || 0}/100</h3>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:14px;">
          <div class="deal">
            <div class="muted">Revenue Estimate</div>
            <h3>${formatCurrency(mission.revenueEstimate)}</h3>
          </div>

          <div class="deal">
            <div class="muted">Agents</div>
            <h3>${Array.isArray(mission.agents) ? mission.agents.length : 0}</h3>
          </div>

          <div class="deal">
            <div class="muted">Approvals</div>
            <h3>${Array.isArray(mission.approvalsRequired) ? mission.approvalsRequired.length : 0}</h3>
          </div>
        </div>

        ${renderAgentReports(mission)}
        ${renderBuyerDiscoveryIntelligence(mission)}
        ${renderSupplierDiscoveryIntelligence(mission)}

        <div style="margin-top:14px;">
          <h4 style="color:white;font-weight:900;margin-bottom:10px;">Timeline</h4>
          ${
            Array.isArray(mission.timeline) && mission.timeline.length
              ? mission.timeline.map(item => `
                <div class="deal">
                  <b>${safeText(item.status)}</b> — ${safeText(item.title)}
                </div>
              `).join("")
              : `<div class="deal">No timeline available.</div>`
          }
        </div>

        <div style="margin-top:14px;">
          <h4 style="color:white;font-weight:900;margin-bottom:10px;">Human Approval Required</h4>
          ${
            Array.isArray(mission.approvalsRequired) && mission.approvalsRequired.length
              ? mission.approvalsRequired.map(item => `<div class="deal">🔐 ${safeText(item)}</div>`).join("")
              : `<div class="deal">No approvals listed.</div>`
          }
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
          ${
            mission.status === "Needs Approval"
              ? `<button class="btn" onclick="TradeFlowMissionCenterUIV1.approveMission('${mission._id}')">
                  Approve Mission
                </button>`
              : `<button class="btn" disabled>
                  Mission ${safeText(mission.status)}
                </button>`
          }
        </div>
      </div>
    `;
  }

  async function render() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return;

    let panel = document.getElementById("missionCenterUIPanel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "missionCenterUIPanel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";
      dashboard.prepend(panel);
    }

    panel.innerHTML = `
      <div style="
        padding:24px;
        border-radius:28px;
        background:
          radial-gradient(circle at top left,rgba(14,165,233,.24),transparent 35%),
          radial-gradient(circle at bottom right,rgba(168,85,247,.24),transparent 35%),
          linear-gradient(135deg,rgba(2,6,23,.95),rgba(15,23,42,.94));
        border:1px solid rgba(125,211,252,.22);
        box-shadow:0 30px 90px rgba(0,0,0,.45);
      ">
        <div class="section-title">🚀 Mission Center UI V1</div>

        <h2 style="font-size:38px;line-height:1.05;font-weight:1000;color:white;margin:10px 0;">
          TradeFlow Agent Mission Control
        </h2>

        <p class="muted" style="max-width:900px;">
          Create and monitor export/import AI missions. Agent reports are generated, but external actions require human approval.
        </p>

        <textarea
          id="missionCenterInput"
          placeholder="Example: I want to export Basmati Rice to UAE"
          style="width:100%;min-height:110px;margin-top:16px;border-radius:20px;padding:16px;background:rgba(15,23,42,.9);color:white;border:1px solid rgba(125,211,252,.25);outline:none;"
        ></textarea>

        <button class="btn" style="margin-top:12px;background:linear-gradient(135deg,#2563eb,#7c3aed,#ec4899);" onclick="TradeFlowMissionCenterUIV1.runMission()">
          Launch Mission
        </button>

        <div id="missionCenterList" style="margin-top:22px;">
          <div class="deal">Loading missions...</div>
        </div>

        <div id="missionOutreachApprovalQueue" style="margin-top:22px;">
          <div class="deal">Loading outreach approval queue...</div>
        </div>

        <div id="missionEmailDeliveryCenter" style="margin-top:22px;">
          <div class="deal">Loading email delivery center...</div>
        </div>
      </div>
    `;

    const list = document.getElementById("missionCenterList");
    const queue = document.getElementById("missionOutreachApprovalQueue");
    const deliveryCenter = document.getElementById("missionEmailDeliveryCenter");

    try {
      const missions = await fetchMissions();
      leadPushCache.clear();
      outreachDraftCache.clear();
      leadPushCounter = 0;
      outreachDraftCounter = 0;

      list.innerHTML = missions.length
        ? `<div style="display:grid;grid-template-columns:1fr;gap:16px;">${missions.map(renderMissionCard).join("")}</div>`
        : `<div class="deal">No missions yet. Launch your first trade mission.</div>`;
    } catch (error) {
      list.innerHTML = `<div class="deal">Mission Center error: ${safeText(error.message)}</div>`;
    }

    if (!hasActiveWorkspace()) {
      queue.innerHTML = renderWorkspaceRequiredSection("Outreach Approval Queue");
      deliveryCenter.innerHTML = renderWorkspaceRequiredSection("Email Delivery Center");
      return;
    }

    try {
      const approvals = await fetchOutreachApprovals();
      queue.innerHTML = renderOutreachApprovalQueue(approvals);
    } catch (error) {
      queue.innerHTML = `
        <div style="margin-top:18px;">
          <h4 style="color:white;font-weight:900;margin-bottom:10px;">Outreach Approval Queue</h4>
          <div class="deal">Outreach queue error: ${safeText(error.message)}</div>
        </div>
      `;
    }

    try {
      const deliveries = await fetchEmailDeliveries();
      deliveryCenter.innerHTML = renderEmailDeliveryCenter(deliveries);
    } catch (error) {
      deliveryCenter.innerHTML = `
        <div style="margin-top:18px;">
          <h4 style="color:white;font-weight:900;margin-bottom:10px;">Email Delivery Center</h4>
          <div class="deal">Email delivery error: ${safeText(error.message)}</div>
        </div>
      `;
    }
  }

  function boot() {
    setTimeout(render, 1200);

    document.addEventListener("tradeflow:page-change", function () {
      setTimeout(render, 250);
    });

    console.log("✅ Mission Center UI V1 active");
  }

  window.TradeFlowMissionCenterUIV1 = {
    render,
    runMission,
    approveMission,
    pushLeadToCRM,
    createOutreachDraft,
    approveOutreachDraft,
    rejectOutreachDraft,
    viewOutreachAudit,
    sendApprovedEmail
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
