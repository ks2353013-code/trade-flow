/* TradeFlow Enterprise Onboarding Engine */

(function () {
  const STEPS = [
    {
      key: "company",
      title: "Create your company profile",
      text: "Set up your main company identity, GST/IEC details, and business information.",
      action: "Open Company",
      page: "master"
    },
    {
      key: "workspace",
      title: "Create your first workspace",
      text: "Build a dedicated workspace for your export/import business operations.",
      action: "Open Workspace",
      page: "workspaces"
    },
    {
      key: "branding",
      title: "Customize white-label branding",
      text: "Set company colors, logo, portal title, and branded identity.",
      action: "Open Branding",
      page: "dashboard"
    },
    {
      key: "supplier",
      title: "Add your first supplier",
      text: "Create or enrich your first supplier record using supplier intelligence.",
      action: "Open Suppliers",
      page: "suppliers"
    },
    {
      key: "crm",
      title: "Create your first CRM deal",
      text: "Start tracking a buyer, supplier, or opportunity in the CRM pipeline.",
      action: "Open CRM",
      page: "crm"
    },
    {
      key: "outreach",
      title: "Send your first outreach",
      text: "Generate and send email or WhatsApp outreach from TradeFlow.",
      action: "Open Outreach",
      page: "outreach"
    },
    {
      key: "ai",
      title: "Activate AI operations",
      text: "Use AI supplier finder, outreach writer, CRM forecast, and risk analyzer.",
      action: "Open AI Center",
      page: "ai"
    },
    {
      key: "workflow",
      title: "Create automation workflow",
      text: "Set up your first AI workflow automation rule.",
      action: "Open Dashboard",
      page: "dashboard"
    },
    {
      key: "analytics",
      title: "Review executive analytics",
      text: "Understand workflow performance, revenue forecast, and operational health.",
      action: "Open Analytics",
      page: "analytics"
    }
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") return BACKEND_URL;
    return "https://trade-flow-lc1k.onrender.com";
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowUser") || "{}");
    } catch {
      return {};
    }
  }

  function getHeaders() {
    const user = getUser();

    return {
      "Content-Type": "application/json",
      Authorization: user?.token ? `Bearer ${user.token}` : "",
      "x-user-email": user?.email || "unknown@tradeflow.local",
      "x-company-id": localStorage.getItem("tradeflowActiveCompany") || "",
      "x-workspace-id": localStorage.getItem("tradeflowActiveWorkspace") || ""
    };
  }

  async function loadProgress() {
    try {
      const res = await fetch(`${getBackendUrl()}/api/onboarding`, {
        headers: getHeaders()
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed");

      localStorage.setItem("tradeflowOnboardingProgress", JSON.stringify(data));
      renderOnboarding(data);
    } catch {
      const cached = JSON.parse(localStorage.getItem("tradeflowOnboardingProgress") || "null");
      renderOnboarding(cached || {
        completedSteps: [],
        completionPercentage: 0,
        onboardingCompleted: false
      });
    }
  }

  async function completeStep(stepKey) {
    try {
      const res = await fetch(`${getBackendUrl()}/api/onboarding/complete-step`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ step: stepKey })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed");

      localStorage.setItem("tradeflowOnboardingProgress", JSON.stringify(data));
      renderOnboarding(data);

      if (data.onboardingCompleted) {
        alert("🎉 TradeFlow onboarding completed. Your enterprise workspace is ready.");
      }
    } catch {
      const cached = JSON.parse(localStorage.getItem("tradeflowOnboardingProgress") || "{}");
      const completed = cached.completedSteps || [];

      if (!completed.includes(stepKey)) completed.push(stepKey);

      const data = {
        completedSteps: completed,
        completionPercentage: Math.round((completed.length / STEPS.length) * 100),
        onboardingCompleted: completed.length >= STEPS.length
      };

      localStorage.setItem("tradeflowOnboardingProgress", JSON.stringify(data));
      renderOnboarding(data);
    }
  }

  function openStep(page, key) {
    if (typeof showPage === "function") {
      showPage(page);
    }

    completeStep(key);

    setTimeout(() => {
      const targetMap = {
        branding: "whiteLabelPanel",
        workflow: "automationWorkflowBuilderPanel",
        analytics: "executiveAnalyticsPanel"
      };

      const targetId = targetMap[key];
      const target = targetId ? $(targetId) : null;

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 500);
  }

  function renderOnboarding(progress) {
    const box = $("enterpriseOnboardingPanel");
    if (!box) return;

    const completed = progress.completedSteps || [];
    const pct = progress.completionPercentage || 0;

    if (progress.onboardingCompleted) {
      box.innerHTML = `
        <div class="section-title">✅ Enterprise Onboarding Complete</div>
        <p class="muted">
          Your TradeFlow workspace is activated with company setup, suppliers, CRM, outreach, AI, workflows, and analytics.
        </p>

        <div style="height:12px;background:rgba(148,163,184,.18);border-radius:999px;overflow:hidden;margin-top:16px;">
          <div style="height:100%;width:100%;background:linear-gradient(90deg,#22c55e,#38bdf8,#8b5cf6);"></div>
        </div>

        <div class="deal" style="margin-top:14px;">
          Activation Score: 100%
        </div>
      `;
      return;
    }

    box.innerHTML = `
      <div class="section-title">🚀 Enterprise Onboarding</div>
      <p class="muted">
        Follow these guided steps to activate TradeFlow as your AI-powered export/import operating system.
      </p>

      <div style="margin-top:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <b style="color:white;">Activation Progress</b>
          <span class="status">${pct}%</span>
        </div>

        <div style="height:12px;background:rgba(148,163,184,.18);border-radius:999px;overflow:hidden;margin-top:10px;">
          <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#38bdf8,#8b5cf6,#22c55e);"></div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin-top:18px;">
        ${STEPS.map((step, index) => {
          const done = completed.includes(step.key);

          return `
            <div class="supplier-card" style="${done ? "opacity:.75;" : ""}">
              <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
                <h2 style="color:white;margin:0;font-size:17px;">
                  ${done ? "✅" : "⬜"} Step ${index + 1}
                </h2>
                <span class="status">${done ? "Done" : "Pending"}</span>
              </div>

              <h3 style="color:white;margin:12px 0 8px;">
                ${step.title}
              </h3>

              <p class="muted">
                ${step.text}
              </p>

              <button class="btn" onclick="TradeFlowOnboarding.open('${step.page}', '${step.key}')">
                ${done ? "Open Again" : step.action}
              </button>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("enterpriseOnboardingPanel")) return;

    const panel = document.createElement("div");
    panel.id = "enterpriseOnboardingPanel";
    panel.className = "card ai-panel";
    panel.style.marginBottom = "18px";

    dashboard.prepend(panel);
  }

  window.TradeFlowOnboarding = {
    load: loadProgress,
    complete: completeStep,
    open: openStep
  };

  function boot() {
    buildPanel();
    setTimeout(loadProgress, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();