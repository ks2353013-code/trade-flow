/* TradeFlow Live Supplier Intelligence Network */

(function () {
  const NETWORK_KEY = "tradeflowLiveSupplierNetwork";

  function $(id) {
    return document.getElementById(id);
  }

  function safeJson(key, fallback = []) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function getNetwork() {
    return safeJson(NETWORK_KEY, []);
  }

  function saveNetwork(items) {
    localStorage.setItem(NETWORK_KEY, JSON.stringify(items.slice(0, 100)));
  }

  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") return BACKEND_URL;
    return "https://trade-flow-lc1k.onrender.com";
  }

  function scoreSupplier(data) {
    let score = 35;

    if (data.emails?.length) score += 20;
    if (data.phones?.length) score += 15;
    if (data.description?.length > 50) score += 15;
    if (data.title && data.title !== "Unknown Company") score += 10;
    if (data.url?.includes("https")) score += 5;

    return Math.min(100, score);
  }

  function classifySupplier(data) {
    const text = `${data.title || ""} ${data.description || ""}`.toLowerCase();

    if (text.includes("rice") || text.includes("agro") || text.includes("food")) return "Agri / Food";
    if (text.includes("pharma") || text.includes("medicine") || text.includes("medical")) return "Pharma / Healthcare";
    if (text.includes("textile") || text.includes("garment")) return "Textile / Garments";
    if (text.includes("logistics") || text.includes("shipping")) return "Logistics";
    if (text.includes("manufacturing") || text.includes("manufacturer")) return "Manufacturing";

    return "General Trade";
  }

  function trustLabel(score) {
    if (score >= 80) return "High Trust";
    if (score >= 55) return "Medium Trust";
    return "Needs Verification";
  }

  function aiSummary(data, score, category) {
    return `${data.title || "Supplier"} appears to be a ${category} company with a trust score of ${score}. ${
      data.emails?.length ? "Email contacts were detected. " : "No public email detected. "
    }${
      data.phones?.length ? "Phone contacts were detected. " : "Phone details may require manual verification. "
    }Recommended next step: verify company documents and initiate controlled outreach.`;
  }

  async function enrichWebsite() {
    const url = prompt("Enter supplier website URL");

    if (!url) return;

    try {
      if (window.TradeFlowPremiumUX) {
        TradeFlowPremiumUX.toast("Analyzing supplier website...", "ai");
      }

      const res = await fetch(`${getBackendUrl()}/api/live-supplier-intelligence/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Supplier enrichment failed");
      }

      const score = scoreSupplier(data);
      const category = classifySupplier(data);

      const enriched = {
        id: Date.now(),
        url: data.url,
        title: data.title || "Unknown Company",
        description: data.description || "",
        emails: data.emails || [],
        phones: data.phones || [],
        verificationScore: score,
        trustLabel: trustLabel(score),
        category,
        aiSummary: aiSummary(data, score, category),
        enrichedAt: new Date().toISOString()
      };

      const network = getNetwork();
      network.unshift(enriched);
      saveNetwork(network);

      renderNetwork();

      if (window.TradeFlowTimeline) {
        TradeFlowTimeline.add(
          "Supplier",
          "Supplier Website Enriched",
          `${enriched.title} analyzed with ${score}% trust score.`
        );
      }

      if (window.TradeFlowPremiumUX) {
        TradeFlowPremiumUX.toast("Supplier intelligence enriched successfully.", "success");
      }

    } catch (error) {
      if (window.TradeFlowPremiumUX) {
        TradeFlowPremiumUX.toast(error.message || "Supplier enrichment failed.", "error");
      } else {
        alert(error.message || "Supplier enrichment failed.");
      }
    }
  }

  function saveToSupplierList(id) {
    const network = getNetwork();
    const item = network.find(x => String(x.id) === String(id));

    if (!item) return;

    const suppliers = safeJson("suppliers", []);

    suppliers.unshift({
      id: Date.now(),
      name: item.title,
      supplierName: item.title,
      product: item.category,
      country: "Unknown",
      email: item.emails?.[0] || "",
      phone: item.phones?.[0] || "",
      notes: item.aiSummary,
      score: item.verificationScore,
      source: "Live Supplier Network",
      website: item.url,
      createdAt: new Date().toISOString()
    });

    localStorage.setItem("suppliers", JSON.stringify(suppliers));

    if (window.TradeFlowPremiumUX) {
      TradeFlowPremiumUX.toast("Supplier saved to supplier database.", "success");
    }

    if (window.TradeFlowIntelligenceOS) TradeFlowIntelligenceOS.refresh();
    if (window.TradeFlowGrowthEngine) TradeFlowGrowthEngine.refresh();
    if (window.TradeFlowControlTower) TradeFlowControlTower.refresh();
  }

  function renderNetwork() {
    const panel = $("liveSupplierNetworkPanel");
    if (!panel) return;

    const network = getNetwork();

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">
        <div>
          <div class="section-title">🌐 Live Supplier Intelligence Network</div>
          <p class="muted">
            Controlled supplier enrichment network for website parsing, contact extraction, trust scoring, classification, and AI qualification.
          </p>
        </div>

        <button class="btn" onclick="TradeFlowLiveSupplierNetwork.enrich()">
          Enrich Supplier Website
        </button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:18px;">
        <div class="supplier-card">
          <h2 style="color:white;margin:0;">${network.length}</h2>
          <p class="muted">Enriched Suppliers</p>
        </div>

        <div class="supplier-card">
          <h2 style="color:white;margin:0;">
            ${network.filter(x => x.verificationScore >= 80).length}
          </h2>
          <p class="muted">High Trust Suppliers</p>
        </div>

        <div class="supplier-card">
          <h2 style="color:white;margin:0;">
            ${network.filter(x => x.emails?.length).length}
          </h2>
          <p class="muted">With Email Contacts</p>
        </div>
      </div>

      <div style="margin-top:18px;display:grid;gap:14px;">
        ${
          network.length
            ? network.map(item => `
              <div class="supplier-card tf-fade-in">
                <div style="display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap;">
                  <div>
                    <h2 style="color:white;margin:0;">${item.title}</h2>
                    <p class="muted">${item.url}</p>
                  </div>
                  <span class="status">${item.trustLabel}</span>
                </div>

                <div style="height:10px;background:rgba(148,163,184,.18);border-radius:999px;overflow:hidden;margin-top:12px;">
                  <div style="height:100%;width:${item.verificationScore}%;background:linear-gradient(90deg,#38bdf8,#8b5cf6,#22c55e);"></div>
                </div>

                <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
                  <span class="status">Score: ${item.verificationScore}</span>
                  <span class="status">${item.category}</span>
                  <span class="status">${item.emails.length} Emails</span>
                  <span class="status">${item.phones.length} Phones</span>
                </div>

                <p class="muted" style="margin-top:12px;">
                  ${item.aiSummary}
                </p>

                <div class="deal">
                  Emails: ${item.emails.length ? item.emails.join(", ") : "Not detected"}
                </div>

                <div class="deal">
                  Phones: ${item.phones.length ? item.phones.join(", ") : "Not detected"}
                </div>

                <button class="btn" onclick="TradeFlowLiveSupplierNetwork.saveSupplier('${item.id}')">
                  Save to Supplier Database
                </button>
              </div>
            `).join("")
            : `<div class="tf-empty-state"><h3>No enriched suppliers yet</h3><p>Click Enrich Supplier Website to analyze your first supplier website.</p></div>`
        }
      </div>
    `;
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("liveSupplierNetworkPanel")) return;

    const panel = document.createElement("div");
    panel.id = "liveSupplierNetworkPanel";
    panel.className = "card ai-panel";
    panel.style.marginBottom = "18px";

    const tower = $("strategicControlTowerPanel");

    if (tower && tower.parentNode) {
      tower.parentNode.insertBefore(panel, tower.nextSibling);
    } else {
      dashboard.appendChild(panel);
    }
  }

  function boot() {
    buildPanel();
    setTimeout(renderNetwork, 2600);
    setInterval(renderNetwork, 45000);
  }

  window.TradeFlowLiveSupplierNetwork = {
    enrich: enrichWebsite,
    render: renderNetwork,
    saveSupplier: saveToSupplierList,
    all: getNetwork
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();