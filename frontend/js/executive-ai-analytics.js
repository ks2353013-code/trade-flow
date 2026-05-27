/* TradeFlow Executive AI Analytics */

(function () {
  if (window.TradeFlowExecutiveAIAnalytics) return;

  function getEmail() {
    return (
      localStorage.getItem("userEmail") ||
      localStorage.getItem("tradeflowUserEmail") ||
      localStorage.getItem("email") ||
      "ks2353013@gmail.com"
    );
  }

  function currency(value) {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  }

  function createPanel() {
    let panel = document.getElementById("executiveAiAnalyticsPanel");

    if (panel) return panel;

    const analyticsPage = document.getElementById("analyticsPage");
    if (!analyticsPage) return null;

    panel = document.createElement("div");
    panel.id = "executiveAiAnalyticsPanel";
    panel.className = "card ai-panel";

    panel.innerHTML = `
      <div class="section-title">📊 Executive AI Analytics</div>
      <p class="muted">
        AI-powered boardroom view for revenue, CRM quality, supplier strength, autonomous activity, and SaaS health.
      </p>

      <div class="grid grid-4" id="executiveAiMetricGrid">
        <div class="deal">Loading AI executive metrics...</div>
      </div>

      <div class="grid grid-2" style="margin-top:20px;">
        <div class="card">
          <div class="section-title">📈 AI Revenue Forecast</div>
          <div id="aiRevenueForecastBox"></div>
        </div>

        <div class="card">
          <div class="section-title">🔥 CRM AI Probability Heatmap</div>
          <div id="aiDealHeatmapBox"></div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:20px;">
        <div class="card">
          <div class="section-title">🌍 Supplier Quality Intelligence</div>
          <div id="aiSupplierQualityBox"></div>
        </div>

        <div class="card">
          <div class="section-title">🤖 Autonomous AI Activity</div>
          <div id="aiAutonomousActivityBox"></div>
        </div>
      </div>
    `;

    analyticsPage.appendChild(panel);
    return panel;
  }

  async function fetchAnalytics() {
    try {
      const res = await fetch("/api/analytics", {
        headers: {
          "x-user-email": getEmail()
        }
      });

      return await res.json();
    } catch {
      return {};
    }
  }

  async function fetchAuditSummary() {
    try {
      const res = await fetch("/api/audit/summary", {
        headers: {
          "x-user-email": getEmail()
        }
      });

      return await res.json();
    } catch {
      return {};
    }
  }

  function progressBar(label, value) {
    const safeValue = Math.max(0, Math.min(100, Number(value || 0)));

    return `
      <div class="deal">
        <b>${label}</b><br>
        ${safeValue}%
        <div class="usage-meter" style="margin-top:8px;">
          <span style="width:${safeValue}%"></span>
        </div>
      </div>
    `;
  }

  async function render() {
    createPanel();

    const analytics = await fetchAnalytics();
    const audit = await fetchAuditSummary();

    const totalDeals = analytics.totalDeals || 0;
    const totalSuppliers = analytics.totalSuppliers || 0;
    const pipelineValue = analytics.pipelineValue || 0;
    const closedValue = analytics.closedValue || 0;
    const conversionRate = analytics.conversionRate || 0;
    const taskCompletionRate = analytics.taskCompletionRate || 0;
    const averageSupplierScore = analytics.averageSupplierScore || 0;

    const aiActivity =
      audit.summary?.byModule?.AI ||
      audit.summary?.byModule?.Ai ||
      0;

    const forecastValue =
      pipelineValue > 0
        ? Math.round(pipelineValue * ((conversionRate || 15) / 100))
        : 0;

    const healthScore = Math.min(
      100,
      Math.round(
        (conversionRate * 0.3) +
        (taskCompletionRate * 0.25) +
        (averageSupplierScore * 0.25) +
        (Math.min(totalDeals, 20) * 1)
      )
    );

    const grid = document.getElementById("executiveAiMetricGrid");
    if (grid) {
      grid.innerHTML = `
        <div class="deal">
          <b>AI Health Score</b><br><br>
          ${healthScore}%
        </div>

        <div class="deal">
          <b>Forecast Revenue</b><br><br>
          ${currency(forecastValue)}
        </div>

        <div class="deal">
          <b>Pipeline Value</b><br><br>
          ${currency(pipelineValue)}
        </div>

        <div class="deal">
          <b>Closed Revenue</b><br><br>
          ${currency(closedValue)}
        </div>

        <div class="deal">
          <b>CRM Deals</b><br><br>
          ${totalDeals}
        </div>

        <div class="deal">
          <b>Suppliers</b><br><br>
          ${totalSuppliers}
        </div>

        <div class="deal">
          <b>AI Events</b><br><br>
          ${aiActivity}
        </div>

        <div class="deal">
          <b>Executive Status</b><br><br>
          ${healthScore >= 70 ? "Strong" : healthScore >= 40 ? "Developing" : "Needs Action"}
        </div>
      `;
    }

    const revenueBox = document.getElementById("aiRevenueForecastBox");
    if (revenueBox) {
      revenueBox.innerHTML = `
        ${progressBar("Conversion Strength", conversionRate)}
        ${progressBar("Task Execution", taskCompletionRate)}
        <div class="deal">
          AI predicts ${currency(forecastValue)} potential revenue from current pipeline.
        </div>
      `;
    }

    const heatmapBox = document.getElementById("aiDealHeatmapBox");
    if (heatmapBox) {
      const confidence = Math.min(100, totalDeals * 8);

      heatmapBox.innerHTML = `
        ${progressBar("CRM Forecast Confidence", confidence)}
        <div class="deal">High Probability Deals: ${Math.round(totalDeals * 0.25)}</div>
        <div class="deal">Medium Probability Deals: ${Math.round(totalDeals * 0.5)}</div>
        <div class="deal">Needs Follow-up: ${Math.round(totalDeals * 0.25)}</div>
      `;
    }

    const supplierBox = document.getElementById("aiSupplierQualityBox");
    if (supplierBox) {
      supplierBox.innerHTML = `
        ${progressBar("Supplier Quality Score", averageSupplierScore)}
        <div class="deal">Supplier Records Analyzed: ${totalSuppliers}</div>
        <div class="deal">
          ${
            averageSupplierScore >= 75
              ? "Supplier base is strong for outreach."
              : "AI recommends verifying and enriching supplier records."
          }
        </div>
      `;
    }

    const activityBox = document.getElementById("aiAutonomousActivityBox");
    if (activityBox) {
      activityBox.innerHTML = `
        <div class="deal">Autonomous AI Runs: ${aiActivity}</div>
        <div class="deal">AI Audit Logging: Active</div>
        <div class="deal">Workflow Automation: Enabled</div>
        <button class="btn" onclick="TradeFlowExecutiveAIAnalytics.runNow()">
          Run AI Workflow Now
        </button>
      `;
    }
  }

  async function runNow() {
    try {
      const res = await fetch("/api/ai-autonomous-workflows/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": getEmail()
        },
        body: JSON.stringify({})
      });

      const data = await res.json();

      alert(
        data.success
          ? `AI workflow completed.\nTasks: ${data.summary.tasksCreated}\nOutreach: ${data.summary.outreachCreated}`
          : data.message || "AI workflow failed."
      );

      render();
    } catch {
      alert("AI workflow failed.");
    }
  }

  function boot() {
    document.addEventListener("tradeflow:page-change", function (event) {
      const page = event.detail?.page || "";

      if (page === "analytics") {
        render();
      }
    });

    setTimeout(() => {
      const analyticsPage = document.getElementById("analyticsPage");

      if (analyticsPage && !analyticsPage.classList.contains("hidden")) {
        render();
      }
    }, 1500);

    console.log("✅ Executive AI Analytics active");
  }

  window.TradeFlowExecutiveAIAnalytics = {
    render,
    runNow
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();