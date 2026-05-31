/* TradeFlow Mission Intelligence Dashboard V2 */

(function () {
  if (window.TradeFlowMissionIntelligenceDashboardV2) return;

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

  function headers() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`
    };
  }

  function money(v) {
    return "₹" + Number(v || 0).toLocaleString("en-IN");
  }

  function safe(v) {
    return String(v || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function hasNumericValue(value) {
    return value !== undefined && value !== null && value !== "" && Number.isFinite(Number(value));
  }

  async function fetchMissions() {
    const res = await fetch(`${API_BASE}/api/trade-agent/missions`, {
      headers: headers(),
      credentials: "include"
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to load missions");
    }

    return data.missions || [];
  }

  function getLatestMission(missions) {
    return missions[0] || null;
  }

  function buildIntelligence(mission) {
    const reports = mission?.agentReports || {};
    const buyer = reports.buyerDiscovery || {};
    const supplier = reports.supplierDiscovery || {};
    const revenue = reports.revenue || {};
    const research = reports.research || {};
    const compliance = reports.compliance || {};
    const crm = reports.crm || {};

    const discoveredBuyers = safeArray(buyer.discoveredBuyers);
    const discoveredSuppliers = safeArray(supplier.discoveredSuppliers);
    const verifiedBuyersAvailable = Array.isArray(buyer.verifiedBuyerLeads);
    const verifiedSuppliersAvailable = Array.isArray(supplier.verifiedSupplierLeads);
    const buyers = verifiedBuyersAvailable
      ? buyer.verifiedBuyerLeads
      : discoveredBuyers;
    const suppliers = verifiedSuppliersAvailable
      ? supplier.verifiedSupplierLeads
      : discoveredSuppliers;
    const crmReadyBuyers = Array.isArray(buyer.crmReadyVerifiedBuyers)
      ? buyer.crmReadyVerifiedBuyers
      : safeArray(buyer.crmReadyBuyers);
    const networkReadySuppliers = Array.isArray(supplier.networkReadyVerifiedSuppliers)
      ? supplier.networkReadyVerifiedSuppliers
      : safeArray(supplier.networkReadySuppliers);
    const rejectedBuyerLeads = safeArray(buyer.rejectedBuyerLeads);
    const rejectedSupplierLeads = safeArray(supplier.rejectedSupplierLeads);
    const leadRejectionRisks = [
      rejectedBuyerLeads.length
        ? `${rejectedBuyerLeads.length} rejected buyer leads require review`
        : "",
      rejectedSupplierLeads.length
        ? `${rejectedSupplierLeads.length} rejected supplier leads require review`
        : ""
    ].filter(Boolean);

    return {
      missionScore: mission?.opportunityScore || 0,
      revenueEstimate:
        mission?.revenueEstimate ||
        revenue.estimatedDealValue ||
        revenue.revenueScenarioBase ||
        0,
      buyerCount: buyers.length,
      supplierCount: suppliers.length,
      crmReadyBuyers: crmReadyBuyers.length,
      networkReadySuppliers: networkReadySuppliers.length,
      rejectedBuyerLeads: rejectedBuyerLeads.length,
      rejectedSupplierLeads: rejectedSupplierLeads.length,
      topBuyers: buyer.buyerLeaderboard || [],
      topSuppliers: supplier.supplierLeaderboard || [],
      risks: [
        ...leadRejectionRisks,
        ...(research.riskAnalysis || []),
        ...(compliance.complianceRisks || [])
      ].slice(0, 8),
      documents: compliance.requiredDocuments || mission?.documents || [],
      actions: [
        ...(research.nextActions || []),
        ...(buyer.recommendedNextActions || []),
        ...(supplier.recommendedNextActions || []),
        ...(crm.recommendedNextActions || []),
        ...(revenue.recommendedNextActions || [])
      ].slice(0, 10),
      executiveSummary:
        revenue.executiveSummary ||
        research.executiveSummary ||
        "Mission intelligence is available."
    };
  }

  function renderLeaderboard(title, items, type) {
    return `
      <div class="deal">
        <h3>${title}</h3>
        ${
          items.length
            ? items.slice(0, 5).map(item => `
              <div style="padding:10px;border-radius:14px;background:rgba(15,23,42,.65);margin-top:8px;">
                <b>${item.rank || ""}. ${safe(item.companyName)}</b>
                <p class="muted">
                  ${safe(item.country)} • ${safe(item.buyerType || item.supplierType || "")}
                </p>
                <p>
                  Confidence: <b>${item.confidenceScore || 0}/100</b>
                  ${
                    hasNumericValue(item.verificationScore)
                      ? ` â€¢ Verification: <b>${item.verificationScore}/100</b>`
                      : ""
                  }
                  ${type === "supplier" ? ` • Risk: <b>${item.riskScore || 0}/100</b>` : ""}
                </p>
                <p class="muted">${safe(item.verificationStatus)}</p>
              </div>
            `).join("")
            : `<p class="muted">No leaderboard available yet.</p>`
        }
      </div>
    `;
  }

  function renderMission(mission) {
    if (!mission) {
      return `<div class="deal">No mission found. Create a mission first.</div>`;
    }

    const intel = buildIntelligence(mission);

    return `
      <div style="
        padding:24px;
        border-radius:28px;
        background:
          radial-gradient(circle at top left,rgba(34,211,238,.18),transparent 34%),
          radial-gradient(circle at bottom right,rgba(236,72,153,.18),transparent 34%),
          linear-gradient(135deg,rgba(2,6,23,.95),rgba(15,23,42,.94));
        border:1px solid rgba(125,211,252,.22);
        box-shadow:0 30px 90px rgba(0,0,0,.45);
      ">
        <div class="section-title">🧠 Mission Intelligence Dashboard V2</div>

        <h2 style="font-size:34px;font-weight:1000;color:white;margin:10px 0;">
          ${safe(mission.missionText)}
        </h2>

        <p class="muted">
          ${safe(mission.direction)} • ${safe(mission.product)} • ${safe(mission.market)} • Status: <b>${safe(mission.status)}</b>
        </p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin-top:18px;">
          <div class="deal"><div class="muted">Mission Score</div><h3>${intel.missionScore}/100</h3></div>
          <div class="deal"><div class="muted">Revenue Estimate</div><h3>${money(intel.revenueEstimate)}</h3></div>
          <div class="deal"><div class="muted">Buyers Found</div><h3>${intel.buyerCount}</h3></div>
          <div class="deal"><div class="muted">Suppliers Found</div><h3>${intel.supplierCount}</h3></div>
          <div class="deal"><div class="muted">CRM Ready Buyers</div><h3>${intel.crmReadyBuyers}</h3></div>
          <div class="deal"><div class="muted">Network Ready Suppliers</div><h3>${intel.networkReadySuppliers}</h3></div>
          <div class="deal"><div class="muted">Rejected Buyer Leads</div><h3>${intel.rejectedBuyerLeads}</h3></div>
          <div class="deal"><div class="muted">Rejected Supplier Leads</div><h3>${intel.rejectedSupplierLeads}</h3></div>
        </div>

        <div style="margin-top:18px;" class="deal">
          <h3>Executive Summary</h3>
          <p>${safe(intel.executiveSummary)}</p>
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-top:18px;">
          ${renderLeaderboard("🏢 Top Buyer Candidates", intel.topBuyers, "buyer")}
          ${renderLeaderboard("🏭 Top Supplier Candidates", intel.topSuppliers, "supplier")}
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-top:18px;">
          <div class="deal">
            <h3>⚠️ Risk Intelligence</h3>
            ${
              intel.risks.length
                ? intel.risks.map(r => `<p>⚠️ ${safe(r)}</p>`).join("")
                : `<p class="muted">No risk intelligence available.</p>`
            }
          </div>

          <div class="deal">
            <h3>📄 Compliance Documents</h3>
            ${
              intel.documents.length
                ? intel.documents.slice(0, 10).map(d => `<p>📌 ${safe(d)}</p>`).join("")
                : `<p class="muted">No document checklist available.</p>`
            }
          </div>
        </div>

        <div style="margin-top:18px;" class="deal">
          <h3>✅ Recommended Next Actions</h3>
          ${
            intel.actions.length
              ? intel.actions.map(a => `<p>➡️ ${safe(a)}</p>`).join("")
              : `<p class="muted">No recommended actions available.</p>`
          }
        </div>
      </div>
    `;
  }

  async function render() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return;

    let panel = document.getElementById("missionIntelligenceDashboardV2Panel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "missionIntelligenceDashboardV2Panel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";
      dashboard.prepend(panel);
    }

    panel.innerHTML = `<div class="deal">Loading Mission Intelligence...</div>`;

    try {
      const missions = await fetchMissions();
      panel.innerHTML = renderMission(getLatestMission(missions));
    } catch (error) {
      panel.innerHTML = `<div class="deal">Mission Intelligence error: ${safe(error.message)}</div>`;
    }
  }

  function boot() {
    setTimeout(render, 1400);

    document.addEventListener("tradeflow:page-change", function () {
      setTimeout(render, 300);
    });

    console.log("✅ Mission Intelligence Dashboard V2 active");
  }

  window.TradeFlowMissionIntelligenceDashboardV2 = {
    render
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
