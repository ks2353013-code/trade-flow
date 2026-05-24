/* TradeFlow AI Daily Command Center */

(function () {

  function $(id) {
    return document.getElementById(id);
  }

  function safeJson(key) {
    try {
      return JSON.parse(
        localStorage.getItem(key) || "[]"
      );
    } catch {
      return [];
    }
  }

  function getSuppliers() {
    return safeJson("suppliers");
  }

  function getDeals() {
    return safeJson("crmDeals");
  }

  function getTasks() {
    return safeJson("tasks");
  }

  function productivityScore(
    suppliers,
    deals,
    tasks
  ) {

    let score = 40;

    score += Math.min(
      suppliers.length * 4,
      20
    );

    score += Math.min(
      deals.length * 5,
      25
    );

    const completedTasks =
      tasks.filter(
        t =>
          (t.status || "")
            .toLowerCase()
            .includes("complete")
      ).length;

    score += Math.min(
      completedTasks * 3,
      15
    );

    return Math.min(score, 100);
  }

  function generateBriefing() {

    const suppliers =
      getSuppliers();

    const deals =
      getDeals();

    const tasks =
      getTasks();

    const score =
      productivityScore(
        suppliers,
        deals,
        tasks
      );

    const pendingTasks =
      tasks.filter(
        t =>
          !(t.status || "")
            .toLowerCase()
            .includes("complete")
      ).length;

    const completedTasks =
      tasks.length -
      pendingTasks;

    const briefing = [];

    briefing.push({
      icon: "📦",
      title: "Supplier Network",
      value: suppliers.length,
      text:
        suppliers.length > 5
          ? "Supplier network growth is healthy."
          : "Expand supplier sourcing for stronger trade resilience."
    });

    briefing.push({
      icon: "💰",
      title: "CRM Opportunities",
      value: deals.length,
      text:
        deals.length > 3
          ? "CRM pipeline activity is increasing."
          : "Pipeline growth opportunities detected."
    });

    briefing.push({
      icon: "✅",
      title: "Completed Tasks",
      value: completedTasks,
      text:
        completedTasks > 5
          ? "Execution performance is strong."
          : "Operational execution can improve."
    });

    briefing.push({
      icon: "⚠️",
      title: "Pending Tasks",
      value: pendingTasks,
      text:
        pendingTasks > 7
          ? "Operational pressure increasing."
          : "Task backlog is manageable."
    });

    return {
      score,
      suppliers,
      deals,
      tasks,
      briefing
    };
  }

  function generateAIRecommendations(
    data
  ) {

    const recommendations = [];

    if (data.suppliers.length < 5) {
      recommendations.push(
        "Use Live Supplier Intelligence to expand supplier sourcing."
      );
    }

    if (data.deals.length < 3) {
      recommendations.push(
        "Activate CRM outreach workflows to increase deal generation."
      );
    }

    if (data.tasks.length > 8) {
      recommendations.push(
        "Enable AI workflow automation to reduce operational overload."
      );
    }

    if (data.score > 75) {
      recommendations.push(
        "TradeFlow detects strong operational momentum across sourcing and CRM."
      );
    }

    if (!recommendations.length) {
      recommendations.push(
        "Continue scaling AI operations and supplier intelligence."
      );
    }

    return recommendations;
  }

  function renderCommandCenter() {

    const panel =
      $("aiDailyCommandCenter");

    if (!panel) return;

    const data =
      generateBriefing();

    const recommendations =
      generateAIRecommendations(
        data
      );

    panel.innerHTML = `
      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:20px;
          flex-wrap:wrap;
        "
      >

        <div>

          <div class="section-title">
            🧠 AI Daily Command Center
          </div>

          <p class="muted">
            AI-generated operational briefing,
            productivity analysis,
            growth intelligence,
            and execution recommendations.
          </p>

        </div>

        <div
          style="
            width:120px;
            height:120px;
            border-radius:999px;
            display:flex;
            align-items:center;
            justify-content:center;
            background:
              radial-gradient(circle at top,
              rgba(56,189,248,.35),
              rgba(15,23,42,.9));
            border:
              2px solid rgba(56,189,248,.35);
            box-shadow:
              0 20px 60px rgba(0,0,0,.35);
            flex-direction:column;
          "
        >

          <div
            style="
              font-size:38px;
              font-weight:900;
              color:white;
              line-height:1;
            "
          >
            ${data.score}
          </div>

          <div
            style="
              color:#cbd5e1;
              font-weight:700;
              margin-top:6px;
            "
          >
            Productivity
          </div>

        </div>

      </div>

      <div
        style="
          display:grid;
          grid-template-columns:
          repeat(auto-fit,minmax(220px,1fr));
          gap:14px;
          margin-top:22px;
        "
      >

        ${data.briefing.map(item => `
          <div class="supplier-card tf-fade-in">

            <div
              style="
                display:flex;
                align-items:center;
                gap:12px;
                margin-bottom:12px;
              "
            >

              <div
                style="
                  font-size:30px;
                "
              >
                ${item.icon}
              </div>

              <div>

                <div
                  style="
                    color:#cbd5e1;
                    font-size:13px;
                    font-weight:700;
                  "
                >
                  ${item.title}
                </div>

                <div
                  style="
                    color:white;
                    font-size:28px;
                    font-weight:900;
                  "
                >
                  ${item.value}
                </div>

              </div>

            </div>

            <p class="muted">
              ${item.text}
            </p>

          </div>
        `).join("")}

      </div>

      <div
        class="supplier-card"
        style="
          margin-top:18px;
        "
      >

        <h2
          style="
            color:white;
            margin-top:0;
          "
        >
          🤖 AI Executive Recommendations
        </h2>

        ${recommendations.map(r => `
          <div class="deal">
            ${r}
          </div>
        `).join("")}

      </div>

      <div
        class="supplier-card"
        style="
          margin-top:18px;
        "
      >

        <h2
          style="
            color:white;
            margin-top:0;
          "
        >
          🚀 TradeFlow Operational Status
        </h2>

        <div class="deal">
          AI systems operational
        </div>

        <div class="deal">
          Enterprise workflows synchronized
        </div>

        <div class="deal">
          Supplier intelligence active
        </div>

        <div class="deal">
          CRM intelligence monitoring enabled
        </div>

      </div>
    `;
  }

  function buildPanel() {

    const dashboard =
      $("dashboardPage") ||
      document.body;

    if (
      !dashboard ||
      $("aiDailyCommandCenter")
    ) return;

    const panel =
      document.createElement("div");

    panel.id =
      "aiDailyCommandCenter";

    panel.className =
      "card ai-panel";

    panel.style.marginBottom =
      "18px";

    dashboard.prepend(panel);

  }

  function boot() {

    buildPanel();

    setTimeout(() => {
      renderCommandCenter();
    }, 1500);

    setInterval(() => {
      renderCommandCenter();
    }, 25000);

  }

  window.TradeFlowDailyCommandCenter = {
    refresh:
      renderCommandCenter
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