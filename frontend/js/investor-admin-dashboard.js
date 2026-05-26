/* TradeFlow Investor & Enterprise Admin Dashboard */

(function () {
  if (window.TradeFlowInvestorDashboard) return;

  const MASTER_EMAIL = "ks2353013@gmail.com";

  function getUserEmail() {
    return (
      localStorage.getItem("userEmail") ||
      localStorage.getItem("tradeflowUserEmail") ||
      localStorage.getItem("email") ||
      ""
    )
      .toLowerCase()
      .trim();
  }

  function isMasterAdmin() {
    return getUserEmail() === MASTER_EMAIL;
  }

  function currency(value) {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  }

  function createPanel() {
    let panel = document.getElementById("investorAdminPanel");

    if (panel) return panel;

    const masterPage = document.getElementById("masterPage");

    if (!masterPage) return null;

    panel = document.createElement("div");

    panel.id = "investorAdminPanel";
    panel.className = "card";

    panel.innerHTML = `
      <div class="section-title">
        📈 Investor & Enterprise Command Center
      </div>

      <p class="muted">
        Real-time TradeFlow SaaS growth metrics, enterprise analytics,
        subscription performance, and operational visibility.
      </p>

      <div class="grid grid-4" id="investorMetricsGrid">
        <div class="deal">Loading metrics...</div>
      </div>

      <div class="grid grid-2" style="margin-top:20px;">
        <div class="card">
          <div class="section-title">💳 Subscription Distribution</div>
          <div id="subscriptionDistribution"></div>
        </div>

        <div class="card">
          <div class="section-title">🏢 Enterprise Overview</div>
          <div id="enterpriseOverview"></div>
        </div>
      </div>

      <div class="card" style="margin-top:20px;">
        <div class="section-title">⚡ Platform Activity</div>
        <div id="platformActivity"></div>
      </div>
    `;

    masterPage.appendChild(panel);

    return panel;
  }

  async function fetchAnalytics() {
    try {
      const res = await fetch("/api/analytics", {
        headers: {
          "x-user-email": getUserEmail()
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
          "x-user-email": getUserEmail()
        }
      });

      return await res.json();
    } catch {
      return {};
    }
  }

  async function fetchSubscriptions() {
    try {
      const res = await fetch("/api/subscriptions", {
        headers: {
          "x-user-email": getUserEmail()
        }
      });

      return await res.json();
    } catch {
      return [];
    }
  }

  async function renderDashboard() {
    if (!isMasterAdmin()) return;

    createPanel();

    const analytics = await fetchAnalytics();
    const audit = await fetchAuditSummary();
    const subscriptions = await fetchSubscriptions();

    const grid = document.getElementById("investorMetricsGrid");

    const totalSuppliers = analytics.totalSuppliers || 0;
    const totalDeals = analytics.totalDeals || 0;
    const pipelineValue = analytics.pipelineValue || 0;
    const closedValue = analytics.closedValue || 0;

    const starter =
      subscriptions.filter?.((s) => s.plan === "Starter").length || 0;

    const pro =
      subscriptions.filter?.((s) => s.plan === "Pro Exporter").length || 0;

    const enterprise =
      subscriptions.filter?.((s) => s.plan === "Enterprise AI OS").length || 0;

    const estimatedMRR =
      starter * 1999 +
      pro * 8999 +
      enterprise * 49999;

    grid.innerHTML = `
      <div class="deal">
        <b>Total Suppliers</b>
        <br><br>
        ${totalSuppliers}
      </div>

      <div class="deal">
        <b>CRM Deals</b>
        <br><br>
        ${totalDeals}
      </div>

      <div class="deal">
        <b>Pipeline Value</b>
        <br><br>
        ${currency(pipelineValue)}
      </div>

      <div class="deal">
        <b>Closed Revenue</b>
        <br><br>
        ${currency(closedValue)}
      </div>

      <div class="deal">
        <b>Estimated MRR</b>
        <br><br>
        ${currency(estimatedMRR)}
      </div>

      <div class="deal">
        <b>Enterprise Clients</b>
        <br><br>
        ${enterprise}
      </div>

      <div class="deal">
        <b>Audit Events</b>
        <br><br>
        ${audit.summary?.total || 0}
      </div>

      <div class="deal">
        <b>Platform Health</b>
        <br><br>
        Stable
      </div>
    `;

    const distribution = document.getElementById(
      "subscriptionDistribution"
    );

    distribution.innerHTML = `
      <div class="deal">Starter Plans: ${starter}</div>
      <div class="deal">Pro Exporter Plans: ${pro}</div>
      <div class="deal">Enterprise AI OS: ${enterprise}</div>
    `;

    const enterpriseOverview = document.getElementById(
      "enterpriseOverview"
    );

    enterpriseOverview.innerHTML = `
      <div class="deal">
        Active CRM Pipelines: ${analytics.totalDeals || 0}
      </div>

      <div class="deal">
        Supplier Intelligence Records: ${analytics.totalSuppliers || 0}
      </div>

      <div class="deal">
        Task Completion Rate:
        ${analytics.taskCompletionRate || 0}%
      </div>

      <div class="deal">
        Conversion Rate:
        ${analytics.conversionRate || 0}%
      </div>
    `;

    const platformActivity = document.getElementById(
      "platformActivity"
    );

    platformActivity.innerHTML = `
      <div class="deal">
        Total Audit Actions:
        ${audit.summary?.total || 0}
      </div>

      <div class="deal">
        Critical Security Events:
        ${(audit.summary?.bySeverity || {}).Critical || 0}
      </div>

      <div class="deal">
        High Severity Events:
        ${(audit.summary?.bySeverity || {}).High || 0}
      </div>

      <div class="deal">
        Active SaaS Monitoring:
        Enabled
      </div>
    `;
  }

  function boot() {
    document.addEventListener(
      "tradeflow:page-change",
      function (event) {
        const page = event.detail?.page || "";

        if (page === "master") {
          renderDashboard();
        }
      }
    );

    setTimeout(() => {
      const masterPage = document.getElementById("masterPage");

      if (
        masterPage &&
        !masterPage.classList.contains("hidden")
      ) {
        renderDashboard();
      }
    }, 1500);

    console.log(
      "✅ Investor Enterprise Dashboard active"
    );
  }

  window.TradeFlowInvestorDashboard = {
    renderDashboard
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