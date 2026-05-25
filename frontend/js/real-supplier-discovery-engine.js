/* TradeFlow Real Supplier Discovery */

(function () {

  function $(id) {
    return document.getElementById(id);
  }

  function getBackendUrl() {

    if (
      typeof BACKEND_URL !==
      "undefined"
    ) {
      return BACKEND_URL;
    }

    return "https://trade-flow-lc1k.onrender.com";

  }

  async function searchSuppliers() {

    const query =
      prompt(
        "Enter product or supplier search"
      );

    if (!query) return;

    try {

      if (
        window.TradeFlowPremiumUX
      ) {

        TradeFlowPremiumUX.toast(
          "Searching global suppliers...",
          "ai"
        );

      }

      const res =
        await fetch(
          `${getBackendUrl()}/api/real-supplier-discovery/search`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              query,
              industry: query
            })
          }
        );

      const data =
        await res.json();

      if (
        !res.ok ||
        !data.success
      ) {

        throw new Error(
          data.message ||
          "Supplier search failed"
        );

      }

      localStorage.setItem(
        "tradeflowRealSupplierResults",
        JSON.stringify(
          data.suppliers || []
        )
      );

      renderResults();

      if (
        window.TradeFlowTimeline
      ) {

        TradeFlowTimeline.add(
          "Supplier",
          "Real Supplier Discovery Executed",
          `${data.total} suppliers discovered for "${query}".`
        );

      }

      if (
        window.TradeFlowPremiumUX
      ) {

        TradeFlowPremiumUX.toast(
          `${data.total} suppliers discovered.`,
          "success"
        );

      }

    } catch (error) {

      if (
        window.TradeFlowPremiumUX
      ) {

        TradeFlowPremiumUX.toast(
          error.message,
          "error"
        );

      }

    }

  }

  function getResults() {

    try {

      return JSON.parse(
        localStorage.getItem(
          "tradeflowRealSupplierResults"
        ) || "[]"
      );

    } catch {

      return [];

    }

  }

  function saveSupplier(item) {

    let suppliers = [];

    try {

      suppliers =
        JSON.parse(
          localStorage.getItem(
            "suppliers"
          ) || "[]"
        );

    } catch {}

    suppliers.unshift({
      id:
        Date.now(),

      name:
        item.companyName,

      supplierName:
        item.companyName,

      product:
        item.industry,

      country:
        item.country,

      website:
        item.website,

      notes:
        item.aiSummary,

      score:
        item.aiScore,

      source:
        "Real Supplier Discovery"
    });

    localStorage.setItem(
      "suppliers",
      JSON.stringify(suppliers)
    );

    if (
      window.TradeFlowPremiumUX
    ) {

      TradeFlowPremiumUX.toast(
        "Supplier saved to database.",
        "success"
      );

    }

  }

  function renderResults() {

    const panel =
      $("realSupplierDiscoveryPanel");

    if (!panel) return;

    const results =
      getResults();

    panel.innerHTML = `
      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:14px;
          flex-wrap:wrap;
        "
      >

        <div>

          <div class="section-title">
            🌍 Real Supplier Discovery
          </div>

          <p class="muted">
            Live supplier intelligence
            using real-world search APIs,
            AI scoring,
            and trade qualification.
          </p>

        </div>

        <button
          class="btn"
          onclick="
            TradeFlowRealSupplierDiscovery
            .search()
          "
        >
          Search Suppliers
        </button>

      </div>

      <div
        style="
          display:grid;
          gap:14px;
          margin-top:18px;
        "
      >

        ${
          results.length
          ? results.map(item => `
            <div
              class="supplier-card tf-fade-in"
            >

              <div
                style="
                  display:flex;
                  justify-content:space-between;
                  gap:12px;
                  flex-wrap:wrap;
                "
              >

                <div>

                  <h2
                    style="
                      color:white;
                      margin:0;
                    "
                  >
                    ${item.companyName}
                  </h2>

                  <p class="muted">
                    ${item.website}
                  </p>

                </div>

                <span class="status">
                  ${item.trustLevel}
                </span>

              </div>

              <div
                style="
                  height:10px;
                  background:
                  rgba(148,163,184,.18);
                  border-radius:999px;
                  overflow:hidden;
                  margin-top:14px;
                "
              >

                <div
                  style="
                    height:100%;
                    width:${item.aiScore}%;
                    background:
                    linear-gradient(
                      90deg,
                      #38bdf8,
                      #8b5cf6,
                      #22c55e
                    );
                  "
                ></div>

              </div>

              <div
                style="
                  display:flex;
                  gap:10px;
                  flex-wrap:wrap;
                  margin-top:12px;
                "
              >

                <span class="status">
                  AI Score:
                  ${item.aiScore}
                </span>

                <span class="status">
                  ${item.industry}
                </span>

              </div>

              <p
                class="muted"
                style="
                  margin-top:12px;
                "
              >
                ${item.aiSummary}
              </p>

              <button
                class="btn"
                onclick='
                  TradeFlowRealSupplierDiscovery
                  .save(
                    ${JSON.stringify(item)}
                  )
                '
              >
                Save Supplier
              </button>

            </div>
          `).join("")
          : `
            <div class="tf-empty-state">
              <h3>
                No supplier searches yet
              </h3>

              <p>
                Search global suppliers
                using real-world
                intelligence APIs.
              </p>
            </div>
          `
        }

      </div>
    `;

  }

  function buildPanel() {

    const dashboard =
      $("dashboardPage") ||
      document.body;

    if (
      !dashboard ||
      $("realSupplierDiscoveryPanel")
    ) return;

    const panel =
      document.createElement("div");

    panel.id =
      "realSupplierDiscoveryPanel";

    panel.className =
      "card ai-panel";

    panel.style.marginBottom =
      "18px";

    const apiHub =
      $("apiIntegrationHubPanel");

    if (
      apiHub &&
      apiHub.parentNode
    ) {

      apiHub.parentNode.insertBefore(
        panel,
        apiHub.nextSibling
      );

    } else {

      dashboard.appendChild(panel);

    }

  }

  function boot() {

    buildPanel();

    setTimeout(() => {
      renderResults();
    }, 3000);

  }

  window.TradeFlowRealSupplierDiscovery = {
    search:
      searchSuppliers,

    render:
      renderResults,

    save:
      saveSupplier
  };

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      boot
    );

  } else {

    boot();

  }

})();