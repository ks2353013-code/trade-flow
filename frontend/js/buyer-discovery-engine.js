/* TradeFlow Buyer Discovery Engine */

(function () {

  const BACKEND_URL =
    typeof window.BACKEND_URL !== "undefined"
      ? window.BACKEND_URL
      : "https://trade-flow-lc1k.onrender.com";

  function $(id) {
    return document.getElementById(id);
  }

  function getResults() {
    try {
      return JSON.parse(
        localStorage.getItem(
          "tradeflowBuyerResults"
        ) || "[]"
      );
    } catch {
      return [];
    }
  }

  function saveResults(results) {
    localStorage.setItem(
      "tradeflowBuyerResults",
      JSON.stringify(results || [])
    );
  }

  async function searchBuyers() {

    const product =
      prompt("Enter product to find buyers");

    if (!product) return;

    const country =
      prompt("Enter target country") || "";

    try {

      const res =
        await fetch(
          `${BACKEND_URL}/api/buyer-discovery/search`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              product,
              country
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
          "Buyer discovery failed"
        );

      }

      saveResults(data.buyers || []);

      renderResults();

      alert(
        `${data.total} buyers discovered`
      );

    } catch (error) {

      console.error(error);

      alert(
        error.message ||
        "Buyer discovery failed"
      );

    }

  }

  function saveBuyer(item) {

    let buyers = [];

    try {

      buyers =
        JSON.parse(
          localStorage.getItem(
            "tradeflowSavedBuyers"
          ) || "[]"
        );

    } catch {}

    buyers.unshift({
      id: Date.now(),
      ...item
    });

    localStorage.setItem(
      "tradeflowSavedBuyers",
      JSON.stringify(buyers)
    );

    alert("Buyer saved");

  }

  function addBuyerToCRM(item) {

    let deals = [];

    try {

      deals =
        JSON.parse(
          localStorage.getItem(
            "tradeflowDiscoveredDeals"
          ) || "[]"
        );

    } catch {}

    deals.unshift({
      id: Date.now(),
      companyName:
        item.buyerName,

      product:
        item.product,

      country:
        item.country,

      email:
        item.email,

      phone:
        item.phone,

      stage:
        "New Lead",

      priority:
        item.score >= 80
          ? "High"
          : "Medium",

      source:
        "Buyer Discovery"
    });

    localStorage.setItem(
      "tradeflowDiscoveredDeals",
      JSON.stringify(deals)
    );

    alert(
      "Buyer added to CRM"
    );

  }

  function generateBuyerOutreach(item) {

    const message = `
Hello,

We found your company while researching buyers/importers for ${item.product} in ${item.country}.

We would like to discuss pricing, supply capability, packaging, MOQ, and long-term trade partnership opportunities.

Regards,
TradeFlow Team
    `;

    localStorage.setItem(
      "tradeflowBuyerOutreach",
      message
    );

    if ($("emailSubject")) {
      $("emailSubject").value =
        `Business Proposal for ${item.product}`;
    }

    if ($("emailMessage")) {
      $("emailMessage").value =
        message;
    }

    if (
      $("emailTo") &&
      item.email &&
      item.email !== "Not Available"
    ) {

      $("emailTo").value =
        item.email;

    }

    alert(
      "Buyer outreach generated"
    );

  }

  function openBuyerWebsite(item) {

    if (!item.website) return;

    window.open(
      item.website,
      "_blank"
    );

  }

  function renderResults() {

    const panel =
      $("buyerDiscoveryPanel");

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
            🌎 Buyer Discovery
          </div>

          <p class="muted">
            Discover importers,
            distributors,
            wholesale buyers,
            and trade leads globally.
          </p>

        </div>

        <button
          class="btn"
          onclick="
            TradeFlowBuyerDiscovery.search()
          "
        >
          Search Buyers
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
          ? results.map((item) => `
            <div class="supplier-card">

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
                    ${item.buyerName}
                  </h2>

                  <p class="muted">
                    ${item.website}
                  </p>

                </div>

                <span class="status">
                  Score ${item.score}
                </span>

              </div>

              <p class="muted">
                <b>Product:</b>
                ${item.product}
              </p>

              <p class="muted">
                <b>Country:</b>
                ${item.country}
              </p>

              <p class="muted">
                <b>Email:</b>
                ${item.email}
              </p>

              <p class="muted">
                <b>Source:</b>
                ${item.source}
              </p>

              <p class="muted">
                ${item.notes}
              </p>

              <div
                style="
                  display:flex;
                  gap:10px;
                  flex-wrap:wrap;
                  margin-top:12px;
                "
              >

                <button
                  class="btn"
                  onclick='
                    TradeFlowBuyerDiscovery.save(
                      ${JSON.stringify(item)}
                    )
                  '
                >
                  Save Buyer
                </button>

                <button
                  class="btn"
                  onclick='
                    TradeFlowBuyerDiscovery.crm(
                      ${JSON.stringify(item)}
                    )
                  '
                >
                  Add to CRM
                </button>

                <button
                  class="btn"
                  onclick='
                    TradeFlowBuyerDiscovery.outreach(
                      ${JSON.stringify(item)}
                    )
                  '
                >
                  Generate Outreach
                </button>

                <button
                  class="mini-btn"
                  onclick='
                    TradeFlowBuyerDiscovery.website(
                      ${JSON.stringify(item)}
                    )
                  '
                >
                  Open Website
                </button>

              </div>

            </div>
          `).join("")
          : `
            <div class="tf-empty-state">
              <h3>
                No buyer searches yet
              </h3>

              <p>
                Search global buyers and importers.
              </p>
            </div>
          `
        }

      </div>
    `;

  }

  function buildPanel() {

    const dashboard =
      $("dashboardPage");

    if (
      !dashboard ||
      $("buyerDiscoveryPanel")
    ) return;

    const panel =
      document.createElement("div");

    panel.id =
      "buyerDiscoveryPanel";

    panel.className =
      "card ai-panel";

    panel.style.marginBottom =
      "18px";

    dashboard.appendChild(panel);

  }

  function boot() {

    buildPanel();

    setTimeout(() => {
      renderResults();
    }, 1000);

  }

  window.TradeFlowBuyerDiscovery = {
    search:
      searchBuyers,

    save:
      saveBuyer,

    crm:
      addBuyerToCRM,

    outreach:
      generateBuyerOutreach,

    website:
      openBuyerWebsite,

    render:
      renderResults
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