/* TradeFlow Executive AI Analytics Dashboard */

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  }

  function setText(id, value) {
    const el = $(id);
    if (el) el.innerText = value;
  }

  function getSuppliers() {
    const saved = readJson("suppliers");
    const discovered = readJson("tradeflowRealSupplierResults");
    return [...saved, ...discovered];
  }

  function getBuyers() {
    const buyers = readJson("tradeflowBuyerResults");
    const saved = readJson("tradeflowSavedBuyers");
    return [...buyers, ...saved];
  }

  function getDeals() {
    const discoveredDeals = readJson("tradeflowDiscoveredDeals");
    const localDeals = readJson("deals");
    return [...localDeals, ...discoveredDeals];
  }

  function averageScore(items) {
    if (!items.length) return 0;

    const total = items.reduce((sum, item) => {
      return sum + Number(item.score || item.aiScore || 0);
    }, 0);

    return Math.round(total / items.length);
  }

  function countHighQuality(items) {
    return items.filter((item) => {
      return Number(item.score || item.aiScore || 0) >= 80;
    }).length;
  }

  function countEmails(items) {
    return items.filter((item) => {
      const email = item.email || "";
      return email && email !== "Not Available";
    }).length;
  }

  function topCountries(items) {
    const map = {};

    items.forEach((item) => {
      const country =
        item.country ||
        item.location ||
        "Unknown";

      map[country] = (map[country] || 0) + 1;
    });

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }

  function pipelineValue(deals) {
    return deals.reduce((sum, deal) => {
      return sum + Number(deal.value || deal.dealValue || 0);
    }, 0);
  }

  function buildInsight(suppliers, buyers, deals) {
    const totalLeads = suppliers.length + buyers.length;
    const highQuality =
      countHighQuality(suppliers) +
      countHighQuality(buyers);

    if (!totalLeads) {
      return "Start by running Supplier Discovery and Buyer Discovery. TradeFlow will then calculate lead quality, outreach readiness, and CRM opportunities.";
    }

    if (highQuality >= 5) {
      return "Strong discovery quality detected. Focus on outreach automation, CRM follow-up, and converting high-score supplier/buyer leads first.";
    }

    if (buyers.length > suppliers.length) {
      return "Buyer demand signals are stronger than supplier discovery. Prioritize supplier verification so you can match products with live import demand.";
    }

    if (suppliers.length > buyers.length) {
      return "Supplier base is stronger than buyer pipeline. Run Buyer Discovery for target countries and start outreach from the best-matching leads.";
    }

    if (deals.length) {
      return "CRM pipeline is active. Move hot leads to Contacted, schedule follow-ups, and use AI outreach templates for faster conversion.";
    }

    return "Lead discovery is active. Save the best leads, add them to CRM, and generate outreach messages for the highest-score companies.";
  }

  function renderMiniBar(label, value, max) {
    const width = max ? Math.min((value / max) * 100, 100) : 0;

    return `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;gap:10px;">
          <span class="muted">${label}</span>
          <b>${value}</b>
        </div>
        <div style="height:9px;background:rgba(148,163,184,.16);border-radius:999px;overflow:hidden;margin-top:6px;">
          <div style="height:100%;width:${width}%;background:linear-gradient(90deg,#38bdf8,#8b5cf6,#22c55e);"></div>
        </div>
      </div>
    `;
  }

  function renderDashboard() {
    const panel = $("executiveAiAnalyticsPanel");
    if (!panel) return;

    const suppliers = getSuppliers();
    const buyers = getBuyers();
    const deals = getDeals();

    const totalLeads = suppliers.length + buyers.length;
    const highQuality =
      countHighQuality(suppliers) +
      countHighQuality(buyers);

    const enrichedEmails =
      countEmails(suppliers) +
      countEmails(buyers);

    const avgSupplierScore = averageScore(suppliers);
    const avgBuyerScore = averageScore(buyers);
    const value = pipelineValue(deals);

    const countries = topCountries([
      ...suppliers,
      ...buyers
    ]);

    const maxCountry =
      countries.length
        ? Math.max(...countries.map((c) => c[1]))
        : 1;

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">
        <div>
          <div class="section-title">🧠 Executive AI Trade Intelligence</div>
          <p class="muted">
            Live command layer for supplier discovery, buyer discovery, CRM pipeline, outreach readiness, and lead quality.
          </p>
        </div>

        <button class="btn" onclick="TradeFlowExecutiveAI.refresh()">
          Refresh Intelligence
        </button>
      </div>

      <div class="grid grid-4" style="margin-top:18px;">
        <div class="card metric">
          <h3>Total Trade Leads</h3>
          <p>${totalLeads}</p>
          <span>Suppliers + buyers</span>
        </div>

        <div class="card metric">
          <h3>High Quality Leads</h3>
          <p>${highQuality}</p>
          <span>Score 80+</span>
        </div>

        <div class="card metric">
          <h3>Verified Emails</h3>
          <p>${enrichedEmails}</p>
          <span>Outreach ready</span>
        </div>

        <div class="card metric">
          <h3>CRM Pipeline</h3>
          <p>${deals.length}</p>
          <span>Saved opportunities</span>
        </div>
      </div>

      <div class="grid grid-3" style="margin-top:18px;">
        <div class="card ai-panel">
          <div class="section-title">📊 Lead Quality</div>
          ${renderMiniBar("Supplier Score", avgSupplierScore, 100)}
          ${renderMiniBar("Buyer Score", avgBuyerScore, 100)}
          ${renderMiniBar("Outreach Readiness", enrichedEmails, Math.max(totalLeads, 1))}
          ${renderMiniBar("CRM Conversion Base", deals.length, Math.max(totalLeads, 1))}
        </div>

        <div class="card">
          <div class="section-title">🌍 Top Countries</div>
          ${
            countries.length
              ? countries
                  .map(([country, count]) =>
                    renderMiniBar(country, count, maxCountry)
                  )
                  .join("")
              : `<p class="muted">No country data yet. Run supplier and buyer discovery.</p>`
          }
        </div>

        <div class="card ai-panel">
          <div class="section-title">🤖 AI Executive Insight</div>
          <p class="muted">${buildInsight(suppliers, buyers, deals)}</p>

          <div class="deal">
            Estimated Pipeline Value:
            <b>${value}</b>
          </div>

          <div class="deal">
            Recommended Action:
            <b>Prioritize high-score leads</b>
          </div>
        </div>
      </div>
    `;

    setText("analyticsTotalSuppliers", suppliers.length);
    setText("analyticsTotalDeals", deals.length);
    setText("analyticsPipelineValue", value);
    setText(
      "analyticsConversionRate",
      totalLeads
        ? `${Math.round((deals.length / totalLeads) * 100)}%`
        : "0%"
    );
  }

  function buildPanel() {
    const dashboard = $("dashboardPage");

    if (!dashboard || $("executiveAiAnalyticsPanel")) return;

    const panel = document.createElement("div");
    panel.id = "executiveAiAnalyticsPanel";
    panel.className = "card ai-panel";
    panel.style.marginBottom = "18px";

    const firstGrid = dashboard.querySelector(".grid.grid-4");

    if (firstGrid && firstGrid.parentNode) {
      firstGrid.parentNode.insertBefore(panel, firstGrid.nextSibling);
    } else {
      dashboard.appendChild(panel);
    }
  }

  function boot() {
    buildPanel();
    setTimeout(renderDashboard, 1200);
    setInterval(renderDashboard, 15000);
  }

  window.TradeFlowExecutiveAI = {
    refresh: renderDashboard
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();