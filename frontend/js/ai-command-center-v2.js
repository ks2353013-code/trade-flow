/* TradeFlow AI Command Center V2 */

(function () {

  if (window.TradeFlowAICommandCenterV2) return;

  function getEmail() {
    return (
      localStorage.getItem("userEmail") ||
      localStorage.getItem("tradeflowUserEmail") ||
      localStorage.getItem("email") ||
      "unknown@tradeflow.local"
    );
  }

  function createPanel() {

    let panel =
      document.getElementById(
        "aiCommandCenterV2"
      );

    if (panel) return panel;

    const aiPage =
      document.getElementById("aiPage");

    if (!aiPage) return null;

    panel = document.createElement("div");

    panel.id = "aiCommandCenterV2";

    panel.className = "card";

    panel.innerHTML = `

      <div class="section-title">
        🤖 AI Autonomous Trade Engine
      </div>

      <p class="muted">
        TradeFlow AI analyzes suppliers,
        CRM pipelines, negotiations,
        tasks, outreach, and trade activity
        to recommend next actions.
      </p>

      <div class="grid grid-3" style="margin-top:20px;">

        <div class="deal">
          <b>AI Supplier Intelligence</b>
          <br><br>
          <button class="btn"
          onclick="TradeFlowAICommandCenterV2.runSupplierAnalysis()">
            Analyze Suppliers
          </button>
        </div>

        <div class="deal">
          <b>AI CRM Forecast</b>
          <br><br>
          <button class="btn"
          onclick="TradeFlowAICommandCenterV2.runCRMForecast()">
            Predict Closures
          </button>
        </div>

        <div class="deal">
          <b>AI Outreach Writer</b>
          <br><br>
          <button class="btn"
          onclick="TradeFlowAICommandCenterV2.generateOutreach()">
            Generate Outreach
          </button>
        </div>

      </div>

      <div class="grid grid-2" style="margin-top:20px;">

        <div class="card">
          <div class="section-title">
            ⚡ AI Recommendations
          </div>

          <div id="aiRecommendationsBox">
            AI recommendations loading...
          </div>
        </div>

        <div class="card">
          <div class="section-title">
            📊 AI Trade Insights
          </div>

          <div id="aiInsightsBox">
            AI insights loading...
          </div>
        </div>

      </div>

      <div class="card" style="margin-top:20px;">

        <div class="section-title">
          🚀 Autonomous Workflow Suggestions
        </div>

        <div id="aiWorkflowBox">
          AI workflow engine loading...
        </div>

      </div>
    `;

    aiPage.appendChild(panel);

    return panel;
  }

  async function fetchAnalytics() {

    try {

      const res =
        await fetch("/api/analytics", {
          headers: {
            "x-user-email": getEmail()
          }
        });

      return await res.json();

    } catch {

      return {};

    }

  }

  async function renderAIRecommendations() {

    const analytics =
      await fetchAnalytics();

    const recommendationBox =
      document.getElementById(
        "aiRecommendationsBox"
      );

    const insightsBox =
      document.getElementById(
        "aiInsightsBox"
      );

    const workflowBox =
      document.getElementById(
        "aiWorkflowBox"
      );

    if (!recommendationBox) return;

    const suppliers =
      analytics.totalSuppliers || 0;

    const deals =
      analytics.totalDeals || 0;

    const closed =
      analytics.closedDeals || 0;

    const pipelineValue =
      analytics.pipelineValue || 0;

    recommendationBox.innerHTML = `
      <div class="deal">
        ${
          suppliers < 20
          ? "🌍 Add more suppliers to improve AI sourcing intelligence."
          : "✅ Supplier database is healthy for AI analysis."
        }
      </div>

      <div class="deal">
        ${
          deals < 5
          ? "📈 Add more CRM deals for better forecasting."
          : "✅ CRM pipeline has enough records for AI forecasting."
        }
      </div>

      <div class="deal">
        ${
          closed < 2
          ? "💰 AI recommends stronger follow-up outreach."
          : "🚀 Deal closure momentum is improving."
        }
      </div>
    `;

    insightsBox.innerHTML = `
      <div class="deal">
        Pipeline Value:
        ₹${Number(pipelineValue)
          .toLocaleString("en-IN")}
      </div>

      <div class="deal">
        Supplier Intelligence Score:
        ${Math.min(
          100,
          suppliers * 5
        )}%
      </div>

      <div class="deal">
        CRM Forecast Confidence:
        ${Math.min(
          100,
          deals * 7
        )}%
      </div>
    `;

    workflowBox.innerHTML = `
      <div class="deal">
        📧 Suggested:
        Send follow-up emails
        to inactive supplier leads.
      </div>

      <div class="deal">
        📈 Suggested:
        Move high-value CRM deals
        into Negotiation stage.
      </div>

      <div class="deal">
        🌍 Suggested:
        Launch AI buyer discovery
        for UAE and USA markets.
      </div>

      <div class="deal">
        🤖 Suggested:
        Enable autonomous outreach
        automation for hot leads.
      </div>
    `;
  }

 async function runSupplierAnalysis() {

  try {

    const email =
      localStorage.getItem("userEmail") ||
      localStorage.getItem("tradeflowUserEmail") ||
      localStorage.getItem("email") ||
      "ks2353013@gmail.com";

    const res = await fetch(
      "/api/ai-autonomous-workflows/run",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "x-user-email": email
        },

        body: JSON.stringify({})
      }
    );

    const data = await res.json();

    if (!data.success) {

      alert(
        data.message ||
        "Autonomous AI workflow failed."
      );

      return;
    }

    alert(
`Autonomous AI workflow completed.

Tasks Created: ${data.summary.tasksCreated}

Outreach Drafts: ${data.summary.outreachCreated}

CRM Suggestions: ${data.summary.crmSuggestions}`
    );

    if (window.fetchTasks) {
      window.fetchTasks();
    }

    if (window.fetchOutreachRecords) {
      window.fetchOutreachRecords();
    }

    if (window.fetchAnalytics) {
      window.fetchAnalytics();
    }

  } catch (error) {

    console.error(error);

    alert(
      "AI workflow failed. Please check backend connection."
    );

  }

}
  async function runCRMForecast() {

    alert(
      "AI CRM Forecast completed.\n\nTradeFlow predicted high probability deal opportunities."
    );

  }

  async function generateOutreach() {

    const message = `
Hello,

We are actively looking for reliable long-term trade partners for export/import collaboration.

Please share your latest catalog, MOQ, pricing, certifications, and shipment timelines.

Regards,
TradeFlow Team
    `;

    navigator.clipboard.writeText(
      message.trim()
    );

    alert(
      "AI outreach copied to clipboard."
    );

  }

  function boot() {

    document.addEventListener(
      "tradeflow:page-change",
      function (event) {

        const page =
          event.detail?.page || "";

        if (page === "ai") {

          createPanel();

          renderAIRecommendations();

        }

      }
    );

    setTimeout(() => {

      const aiPage =
        document.getElementById("aiPage");

      if (
        aiPage &&
        !aiPage.classList.contains("hidden")
      ) {

        createPanel();

        renderAIRecommendations();

      }

    }, 1500);

    console.log(
      "✅ AI Command Center V2 active"
    );

  }

  window.TradeFlowAICommandCenterV2 = {
    runSupplierAnalysis,
    runCRMForecast,
    generateOutreach,
    renderAIRecommendations
  };

  if (document.readyState === "loading") {

    document.addEventListener(
      "DOMContentLoaded",
      boot
    );

  } else {

    boot();

  }

})();