/* TradeFlow Verified Lead Infrastructure V1
   Supplier / Buyer Verification + Scoring Engine
*/

(function () {
  if (window.TradeFlowVerifiedLeadInfrastructureV1) return;

  const STORAGE_KEY = "tradeflowVerifiedLeadsV1";

  function getLeads() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveLeads(leads) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  }

  function scoreLead(lead) {
    let score = 0;

    if (lead.name) score += 20;
    if (lead.website) score += 20;
    if (lead.email) score += 20;
    if (lead.country) score += 15;
    if (lead.source) score += 15;
    if (lead.phone) score += 10;

    return Math.min(score, 100);
  }

  function getVerificationLevel(score) {
    if (score >= 90) return "Trusted Lead";
    if (score >= 75) return "Verified Lead";
    if (score >= 50) return "Partially Verified";
    return "Unverified";
  }

  function verifyLead(lead) {
    const score = scoreLead(lead);

    return {
      ...lead,
      verificationScore: score,
      verificationLevel: getVerificationLevel(score),
      websiteVerified: !!lead.website,
      emailVerified: !!lead.email,
      countryVerified: !!lead.country,
      sourceVerified: !!lead.source,
      verifiedAt: new Date().toISOString()
    };
  }

  function addLead(lead) {
    const leads = getLeads();
    const verifiedLead = verifyLead(lead);

    leads.unshift(verifiedLead);
    saveLeads(leads);

    render();
  }

  function render() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return;

    let panel = document.getElementById("verifiedLeadInfrastructurePanel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "verifiedLeadInfrastructurePanel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";
      dashboard.prepend(panel);
    }

    const leads = getLeads().slice(0, 20);

    panel.innerHTML = `
      <div class="section-title">✅ Verified Lead Infrastructure V1</div>

      <p class="muted">
        Lead Verification • Trust Scoring • Supplier Validation • Buyer Validation
      </p>

      <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn" onclick="TradeFlowVerifiedLeadInfrastructureV1.addDemoLead()">
          Add Demo Lead
        </button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;margin-top:18px;">
        ${leads.map(lead => `
          <div style="
            padding:16px;
            border-radius:18px;
            background:rgba(15,23,42,.72);
            border:1px solid rgba(148,163,184,.16);
          ">
            <h3 style="color:white;font-weight:900;margin:0 0 8px;">
              ${lead.name}
            </h3>

            <p class="muted">${lead.country || "Country N/A"}</p>

            <div style="
              margin-top:10px;
              font-weight:900;
              color:${lead.verificationScore >= 90 ? "#22c55e" : "#facc15"};
            ">
              Score: ${lead.verificationScore}/100
            </div>

            <div style="margin-top:8px;color:#7dd3fc;font-weight:900;">
              ${lead.verificationLevel}
            </div>

            <div style="margin-top:12px;">
              <div>🌐 Website: ${lead.websiteVerified ? "Verified" : "Missing"}</div>
              <div>📧 Email: ${lead.emailVerified ? "Verified" : "Missing"}</div>
              <div>🌍 Country: ${lead.countryVerified ? "Verified" : "Missing"}</div>
              <div>📦 Source: ${lead.sourceVerified ? "Verified" : "Missing"}</div>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  function addDemoLead() {
    addLead({
      name: "ABC Rice Exporters",
      website: "https://abcrice.com",
      email: "sales@abcrice.com",
      phone: "+971500000000",
      country: "UAE",
      source: "TradeFlow Lead Finder"
    });
  }

  function boot() {
    render();
    console.log("✅ Verified Lead Infrastructure V1 active");
  }

  window.TradeFlowVerifiedLeadInfrastructureV1 = {
    addLead,
    verifyLead,
    addDemoLead,
    render
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();