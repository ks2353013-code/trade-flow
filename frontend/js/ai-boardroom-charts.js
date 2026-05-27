/* TradeFlow AI Boardroom Charts */

(function () {
  if (window.TradeFlowAIBoardroomCharts) return;

  function getEmail() {
    return (
      localStorage.getItem("userEmail") ||
      localStorage.getItem("tradeflowUserEmail") ||
      localStorage.getItem("email") ||
      "ks2353013@gmail.com"
    );
  }

  function loadChartJS() {
    return new Promise((resolve, reject) => {
      if (window.Chart) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/chart.js";
      script.onload = resolve;
      script.onerror = reject;

      document.body.appendChild(script);
    });
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

  function createPanel() {
    let panel = document.getElementById("aiBoardroomChartsPanel");

    if (panel) return panel;

    const analyticsPage =
      document.getElementById("analyticsPage") ||
      document.getElementById("masterPage") ||
      document.getElementById("dashboardPage");

    if (!analyticsPage) return null;

    panel = document.createElement("div");
    panel.id = "aiBoardroomChartsPanel";
    panel.className = "card ai-panel";
    panel.style.marginTop = "20px";

    panel.innerHTML = `
      <div class="section-title">📊 AI Boardroom Intelligence Charts</div>
      <p class="muted">
        Visual executive layer for pipeline value, AI activity, supplier quality, CRM confidence, and SaaS growth.
      </p>

      <div class="grid grid-2" style="margin-top:20px;">
        <div class="card">
          <div class="section-title">💰 Revenue Forecast</div>
          <canvas id="revenueForecastChart" height="180"></canvas>
        </div>

        <div class="card">
          <div class="section-title">📈 CRM Pipeline Distribution</div>
          <canvas id="pipelineChart" height="180"></canvas>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:20px;">
        <div class="card">
          <div class="section-title">🌍 Supplier Quality</div>
          <canvas id="supplierQualityChart" height="180"></canvas>
        </div>

        <div class="card">
          <div class="section-title">🤖 AI Activity by Module</div>
          <canvas id="aiActivityChart" height="180"></canvas>
        </div>
      </div>

      <div style="margin-top:18px;">
        <button class="btn" onclick="TradeFlowAIBoardroomCharts.render()">
          Refresh Boardroom Charts
        </button>
      </div>
    `;

    analyticsPage.appendChild(panel);

    return panel;
  }

  function destroyChart(id) {
    if (window.TradeFlowChartInstances?.[id]) {
      window.TradeFlowChartInstances[id].destroy();
      delete window.TradeFlowChartInstances[id];
    }
  }

  function saveChart(id, chart) {
    window.TradeFlowChartInstances = window.TradeFlowChartInstances || {};
    window.TradeFlowChartInstances[id] = chart;
  }

  function makeBarChart(id, labels, data, title) {
    const canvas = document.getElementById(id);
    if (!canvas || !window.Chart) return;

    destroyChart(id);

    const chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: title,
            data
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: "#e5e7eb"
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: "#94a3b8"
            },
            grid: {
              color: "rgba(148,163,184,.12)"
            }
          },
          y: {
            ticks: {
              color: "#94a3b8"
            },
            grid: {
              color: "rgba(148,163,184,.12)"
            }
          }
        }
      }
    });

    saveChart(id, chart);
  }

  function makeDoughnutChart(id, labels, data, title) {
    const canvas = document.getElementById(id);
    if (!canvas || !window.Chart) return;

    destroyChart(id);

    const chart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            label: title,
            data
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: "#e5e7eb"
            }
          }
        }
      }
    });

    saveChart(id, chart);
  }

  async function render() {
    try {
      await loadChartJS();
      createPanel();

      const analytics = await fetchAnalytics();
      const audit = await fetchAuditSummary();

      const pipelineValue = Number(analytics.pipelineValue || 0);
      const closedValue = Number(analytics.closedValue || 0);
      const forecastValue = Math.round(
        pipelineValue * ((analytics.conversionRate || 15) / 100)
      );

      makeBarChart(
        "revenueForecastChart",
        ["Pipeline", "Forecast", "Closed"],
        [pipelineValue, forecastValue, closedValue],
        "Revenue"
      );

      const stages = analytics.stages || {};

      makeDoughnutChart(
        "pipelineChart",
        ["New Lead", "Contacted", "Negotiation", "Closed", "Lost"],
        [
          stages.newLead || 0,
          stages.contacted || 0,
          stages.negotiation || 0,
          stages.closed || 0,
          stages.lost || 0
        ],
        "Deals"
      );

      makeBarChart(
        "supplierQualityChart",
        ["Suppliers", "Quality Score", "Conversion"],
        [
          analytics.totalSuppliers || 0,
          analytics.averageSupplierScore || 0,
          analytics.conversionRate || 0
        ],
        "Supplier Intelligence"
      );

      const byModule = audit.summary?.byModule || {};

      makeDoughnutChart(
        "aiActivityChart",
        Object.keys(byModule).length ? Object.keys(byModule) : ["AI", "CRM", "Suppliers"],
        Object.keys(byModule).length ? Object.values(byModule) : [1, 1, 1],
        "Activity"
      );

      console.log("✅ AI Boardroom Charts rendered");
    } catch (error) {
      console.warn("AI Boardroom Charts failed:", error.message);
    }
  }

  function boot() {
    document.addEventListener("tradeflow:page-change", function (event) {
      const page = event.detail?.page || "";

      if (
        page === "analytics" ||
        page === "master" ||
        page === "dashboard"
      ) {
        setTimeout(render, 500);
      }
    });

    setTimeout(render, 1800);

    console.log("✅ AI Boardroom Charts active");
  }

  window.TradeFlowAIBoardroomCharts = {
    render
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();