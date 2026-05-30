/* TradeFlow Verified Supplier Network V1 */

(function () {
  if (window.TradeFlowVerifiedSupplierNetworkV1) return;

  const STORAGE_KEY = "tradeflowVerifiedSupplierNetworkV1";

  function getSuppliers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveSuppliers(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items || []));
  }

  function getActiveWorkspace() {
    return window.TradeFlowWorkspaceEngineV1?.getActiveWorkspace?.() || null;
  }

  function scoreVerification(supplier) {
    let score = 0;
    if (supplier.website) score += 20;
    if (supplier.email) score += 20;
    if (supplier.phone) score += 15;
    if (supplier.country) score += 15;
    if (supplier.source) score += 15;
    if (supplier.company || supplier.name) score += 15;
    return Math.min(score, 100);
  }

  function scoreRisk(supplier) {
    let risk = 0;
    if (!supplier.website) risk += 25;
    if (!supplier.email) risk += 25;
    if (!supplier.phone) risk += 15;
    if (!supplier.country) risk += 15;
    if (!supplier.source) risk += 20;
    return Math.min(risk, 100);
  }

  function getStatus(verification, risk) {
    if (verification >= 90 && risk <= 20) return "Preferred Supplier";
    if (verification >= 75 && risk <= 35) return "Trusted Supplier";
    if (verification >= 60) return "Verified Supplier";
    if (risk >= 65) return "High Risk Supplier";
    return "Watchlist Supplier";
  }

  function enrichSupplier(supplier) {
    const workspace = getActiveWorkspace();
    const verificationScore = scoreVerification(supplier);
    const riskScore = scoreRisk(supplier);
    const trustScore = Math.max(0, verificationScore - Math.floor(riskScore / 2));

    return {
      id: supplier.id || "supplier_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      name: supplier.name || supplier.company || "Unnamed Supplier",
      company: supplier.company || supplier.name || "",
      country: supplier.country || "",
      product: supplier.product || workspace?.product || "",
      website: supplier.website || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      source: supplier.source || "Manual Entry",
      workspaceId: supplier.workspaceId || workspace?.id || "",
      workspaceName: supplier.workspaceName || workspace?.name || "Default Workspace",
      verificationScore,
      trustScore,
      riskScore,
      status: getStatus(verificationScore, riskScore),
      createdAt: supplier.createdAt || new Date().toISOString(),
      lastVerifiedAt: new Date().toISOString()
    };
  }

  function addSupplier(supplier) {
    const items = getSuppliers();
    const enriched = enrichSupplier(supplier);
    items.unshift(enriched);
    saveSuppliers(items);
    render();
    return enriched;
  }

  function addDemoSupplier() {
    addSupplier({
      name: "ABC Rice Exporters",
      company: "ABC Rice Exporters LLC",
      country: "UAE",
      product: "Rice",
      website: "https://abcrice.com",
      email: "sales@abcrice.com",
      phone: "+971500000000",
      source: "TradeFlow Supplier Finder"
    });
  }

  function deleteSupplier(id) {
    const ok = confirm("Delete this supplier from Verified Supplier Network?");
    if (!ok) return;

    const next = getSuppliers().filter(item => item.id !== id);
    saveSuppliers(next);
    render();
  }

  function getStats(items) {
    const total = items.length;
    const verified = items.filter(i =>
      ["Verified Supplier", "Trusted Supplier", "Preferred Supplier"].includes(i.status)
    ).length;

    const avgTrust = total
      ? Math.round(items.reduce((sum, i) => sum + Number(i.trustScore || 0), 0) / total)
      : 0;

    const avgRisk = total
      ? Math.round(items.reduce((sum, i) => sum + Number(i.riskScore || 0), 0) / total)
      : 0;

    return { total, verified, avgTrust, avgRisk };
  }

  function render() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return;

    let panel = document.getElementById("verifiedSupplierNetworkPanel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "verifiedSupplierNetworkPanel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";
      dashboard.prepend(panel);
    }

    const workspace = getActiveWorkspace();
    const all = getSuppliers();
    const items = workspace?.id
      ? all.filter(item => !item.workspaceId || item.workspaceId === workspace.id)
      : all;

    const stats = getStats(items);

    panel.innerHTML = `
      <div class="section-title">🏭 Verified Supplier Network V1</div>

      <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;">
        <div>
          <h2 style="font-size:28px;font-weight:900;color:white;margin:6px 0;">
            Supplier Intelligence Network
          </h2>
          <p class="muted">
            Workspace: <b>${workspace?.name || "Default Workspace"}</b>
          </p>
        </div>

        <button class="btn" onclick="TradeFlowVerifiedSupplierNetworkV1.addDemoSupplier()">
          + Add Demo Supplier
        </button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin-top:18px;">
        <div class="deal"><div class="muted">Total Suppliers</div><h3>${stats.total}</h3></div>
        <div class="deal"><div class="muted">Verified Suppliers</div><h3>${stats.verified}</h3></div>
        <div class="deal"><div class="muted">Average Trust</div><h3>${stats.avgTrust}/100</h3></div>
        <div class="deal"><div class="muted">Average Risk</div><h3>${stats.avgRisk}/100</h3></div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:18px;">
        ${
          items.length
            ? items.map(item => `
              <div style="padding:16px;border-radius:18px;background:rgba(15,23,42,.72);border:1px solid rgba(148,163,184,.16);">
                <h3 style="color:white;font-weight:900;margin:0 0 8px;">${item.name}</h3>
                <p class="muted">${item.country || "Country N/A"} • ${item.product || "Product N/A"}</p>
                <p class="muted">${item.email || "Email missing"}</p>
                <p class="muted">${item.website || "Website missing"}</p>

                <div style="margin-top:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
                  <div class="deal"><div class="muted">Verify</div><b>${item.verificationScore}</b></div>
                  <div class="deal"><div class="muted">Trust</div><b>${item.trustScore}</b></div>
                  <div class="deal"><div class="muted">Risk</div><b>${item.riskScore}</b></div>
                </div>

                <div style="margin-top:12px;font-weight:900;color:${
                  item.status === "High Risk Supplier" ? "#f87171" : "#22c55e"
                };">
                  ${item.status}
                </div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;">
                  <button class="btn" onclick="TradeFlowVerifiedSupplierNetworkV1.pushToAIWorkflow('${item.id}')">
                    AI Workflow
                  </button>
                  <button class="danger-btn" onclick="TradeFlowVerifiedSupplierNetworkV1.deleteSupplier('${item.id}')">
                    Delete
                  </button>
                </div>
              </div>
            `).join("")
            : `<div class="deal">No verified suppliers yet. Add a demo supplier to test.</div>`
        }
      </div>
    `;
  }

  function pushToAIWorkflow(id) {
    const supplier = getSuppliers().find(item => item.id === id);
    if (!supplier) return;

    if (window.TradeFlowAIAutomationLayerV1?.createAutomationFlow) {
      window.TradeFlowAIAutomationLayerV1.createAutomationFlow({
        name: supplier.name,
        email: supplier.email,
        country: supplier.country,
        verificationScore: supplier.verificationScore
      });

      alert("Supplier pushed to AI Automation workflow.");
    } else {
      alert("AI Automation Layer not loaded.");
    }
  }

  function boot() {
    setTimeout(render, 1000);

    document.addEventListener("tradeflow:page-change", function () {
      setTimeout(render, 200);
    });

    console.log("✅ Verified Supplier Network V1 active");
  }

  window.TradeFlowVerifiedSupplierNetworkV1 = {
    addSupplier,
    addDemoSupplier,
    deleteSupplier,
    pushToAIWorkflow,
    render,
    getSuppliers
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();