/* TradeFlow API Integration Hub */

(function () {
  const KEY = "tradeflowApiIntegrations";

  function $(id) {
    return document.getElementById(id);
  }

  function getIntegrations() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveIntegrations(data) {
    localStorage.setItem(KEY, JSON.stringify(data || {}));
  }

  function save() {
    const data = {
      braveSearch: $("apiBraveSearch")?.value || "",
      serpApi: $("apiSerpApi")?.value || "",
      hunter: $("apiHunter")?.value || "",
      apollo: $("apiApollo")?.value || "",
      openai: $("apiOpenai")?.value || "",
      updatedAt: new Date().toISOString()
    };

    saveIntegrations(data);

    if (window.TradeFlowPremiumUX) {
      TradeFlowPremiumUX.toast("API integrations saved securely in workspace.", "success");
    } else {
      alert("API integrations saved.");
    }

    render();
  }

  function mask(value) {
    if (!value) return "Not connected";
    return value.slice(0, 4) + "••••••••" + value.slice(-4);
  }

  function render() {
    const panel = $("apiIntegrationHubPanel");
    if (!panel) return;

    const data = getIntegrations();

    panel.innerHTML = `
      <div class="section-title">🔌 TradeFlow API Integration Hub</div>
      <p class="muted">
        Connect real intelligence providers for supplier discovery, contact enrichment, AI ranking, and company intelligence.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:18px;">
        <div class="supplier-card">
          <h2 style="color:white;margin:0;">Brave Search API</h2>
          <p class="muted">Supplier search and web discovery.</p>
          <input id="apiBraveSearch" class="input" placeholder="Brave Search API Key">
          <div class="deal">Status: ${mask(data.braveSearch)}</div>
        </div>

        <div class="supplier-card">
          <h2 style="color:white;margin:0;">SerpAPI</h2>
          <p class="muted">Google-style search results for suppliers.</p>
          <input id="apiSerpApi" class="input" placeholder="SerpAPI Key">
          <div class="deal">Status: ${mask(data.serpApi)}</div>
        </div>

        <div class="supplier-card">
          <h2 style="color:white;margin:0;">Hunter</h2>
          <p class="muted">Email discovery and domain enrichment.</p>
          <input id="apiHunter" class="input" placeholder="Hunter API Key">
          <div class="deal">Status: ${mask(data.hunter)}</div>
        </div>

        <div class="supplier-card">
          <h2 style="color:white;margin:0;">Apollo</h2>
          <p class="muted">B2B contact and company intelligence.</p>
          <input id="apiApollo" class="input" placeholder="Apollo API Key">
          <div class="deal">Status: ${mask(data.apollo)}</div>
        </div>

        <div class="supplier-card">
          <h2 style="color:white;margin:0;">OpenAI</h2>
          <p class="muted">Real AI ranking, summaries, and decision logic.</p>
          <input id="apiOpenai" class="input" placeholder="OpenAI API Key">
          <div class="deal">Status: ${mask(data.openai)}</div>
        </div>
      </div>

      <button class="btn" onclick="TradeFlowAPIHub.save()" style="margin-top:16px;">
        Save API Integrations
      </button>

      <div class="supplier-card" style="margin-top:18px;">
        <h2 style="color:white;margin-top:0;">🚀 Recommended Low-Cost Setup</h2>
        <div class="deal">Start with Brave Search or SerpAPI for supplier discovery.</div>
        <div class="deal">Use Hunter only when you need real email enrichment.</div>
        <div class="deal">Use OpenAI only after pilot users or demo clients are ready.</div>
      </div>
    `;
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("apiIntegrationHubPanel")) return;

    const panel = document.createElement("div");
    panel.id = "apiIntegrationHubPanel";
    panel.className = "card ai-panel";
    panel.style.marginBottom = "18px";

    const commercial = $("tradeflowCommercialPanel");

    if (commercial && commercial.parentNode) {
      commercial.parentNode.insertBefore(panel, commercial.nextSibling);
    } else {
      dashboard.appendChild(panel);
    }
  }

  function boot() {
    buildPanel();
    setTimeout(render, 2800);
  }

  window.TradeFlowAPIHub = {
    save,
    render,
    all: getIntegrations
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();