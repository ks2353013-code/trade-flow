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

  function getToken() {
    return (
      localStorage.getItem("tradeflowToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("jwt") ||
      ""
    );
  }

  function authHeaders() {
    const token = getToken();

    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : ""
    };
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

  function renderBuyerCard(buyer) {
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
            ${renderScoreBadge("Score", buyer.confidenceScore)}
            <span class="status">${safeText(buyer.verificationStatus || "Unverified")}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderSupplierCard(supplier) {
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
            <span class="status">${safeText(supplier.verificationStatus || "Unverified")}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderBuyerDiscoveryIntelligence(mission) {
    const report = mission.agentReports?.buyerDiscovery;

    if (!report) return "";

    const discoveredBuyers = safeArray(report.discoveredBuyers);
    const buyerLeaderboard = safeArray(report.buyerLeaderboard).slice(0, 5);
    const crmReadyBuyers = safeArray(report.crmReadyBuyers);

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
        </div>

        <div style="display:grid;grid-template-columns:1fr;gap:10px;">
          ${
            buyerLeaderboard.length
              ? buyerLeaderboard.map(renderBuyerCard).join("")
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
    const networkReadySuppliers = safeArray(report.networkReadySuppliers);

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
        </div>

        <div style="display:grid;grid-template-columns:1fr;gap:10px;">
          ${
            supplierLeaderboard.length
              ? supplierLeaderboard.map(renderSupplierCard).join("")
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
      </div>
    `;

    const list = document.getElementById("missionCenterList");

    try {
      const missions = await fetchMissions();

      list.innerHTML = missions.length
        ? `<div style="display:grid;grid-template-columns:1fr;gap:16px;">${missions.map(renderMissionCard).join("")}</div>`
        : `<div class="deal">No missions yet. Launch your first trade mission.</div>`;
    } catch (error) {
      list.innerHTML = `<div class="deal">Mission Center error: ${safeText(error.message)}</div>`;
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
    approveMission
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
