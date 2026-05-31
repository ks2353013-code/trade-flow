/* TradeFlow Agent Core V1
   Premium AI Employee Command Center for Export / Import
*/

(function () {
  if (window.TradeFlowAgentCoreV1) return;

  const STORAGE_KEY = "tradeflowAgentCoreV1";

  function getWorkspace() {
    return window.TradeFlowWorkspaceEngineV1?.getActiveWorkspace?.() || null;
  }

  function saveRun(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function detectIntent(text) {
    const t = text.toLowerCase();

    let product = "General Product";
    let market = "Global Market";
    let direction = "Export";

    if (t.includes("import")) direction = "Import";
    if (t.includes("rice")) product = "Rice";
    if (t.includes("basmati")) product = "Basmati Rice";
    if (t.includes("medicine")) product = "Medicine";
    if (t.includes("jaggery")) product = "Jaggery";
    if (t.includes("textile")) product = "Textile";
    if (t.includes("uae") || t.includes("dubai")) market = "UAE";
    if (t.includes("africa")) market = "Africa";
    if (t.includes("europe")) market = "Europe";
    if (t.includes("usa")) market = "USA";

    return { product, market, direction };
  }

  function buildAgentPlan(text) {
    const intent = detectIntent(text);
    const workspace = getWorkspace();

    return {
      intent,
      workspaceName:
        workspace?.name || `${intent.product} ${intent.direction} ${intent.market}`,
      mission: `${intent.direction} ${intent.product} with ${intent.market} market focus`,
      agents: [
        {
          name: "Research Agent",
          job: "Study market demand, competitors, pricing, buyer behavior and import/export opportunity.",
          status: "Ready"
        },
        {
          name: "Buyer Discovery Agent",
          job: "Find potential buyers, importers, distributors and sourcing companies.",
          status: "Ready"
        },
        {
          name: "Supplier Discovery Agent",
          job: "Find and score suppliers, manufacturers, exporters and verified vendors.",
          status: "Ready"
        },
        {
          name: "Outreach Agent",
          job: "Prepare email, WhatsApp and follow-up messages for leads.",
          status: "Approval Required"
        },
        {
          name: "CRM Agent",
          job: "Create deals, pipeline stages, next actions and follow-up tasks.",
          status: "Ready"
        },
        {
          name: "Compliance Agent",
          job: "Suggest export documents, certificates, shipment and compliance checklist.",
          status: "Ready"
        }
      ],
      executionSteps: [
        "Create or align active workspace",
        "Research target market demand",
        "Find buyers and suppliers",
        "Score and verify leads",
        "Prepare outreach messages",
        "Push qualified opportunities into CRM",
        "Create follow-up tasks",
        "Prepare export/import document checklist",
        "Track revenue and conversion potential"
      ],
      documents: [
        "Commercial Invoice",
        "Packing List",
        "Certificate of Origin",
        "Shipping Bill",
        "Bill of Lading / Airway Bill",
        "Insurance Certificate",
        "Product-specific compliance certificate"
      ],
      approvalRequired: [
        "Sending emails",
        "Sending WhatsApp messages",
        "Making calls",
        "Final price quotation",
        "Legal/compliance filing",
        "Payment or contract commitment"
      ],
      score: 86
    };
  }

  function runAgent() {
    const input = document.getElementById("tradeflowAgentCoreInput");
    const text = input?.value?.trim();

    if (!text) {
      alert("Tell the TradeFlow Agent your export/import goal first.");
      return;
    }

    const plan = buildAgentPlan(text);
    saveRun(plan);
    renderResult(plan);
  }

  function renderResult(plan) {
    const result = document.getElementById("tradeflowAgentCoreResult");
    if (!result) return;

    result.innerHTML = `
      <div style="
        margin-top:18px;
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
        gap:16px;
      ">
        <div class="deal" style="background:linear-gradient(135deg,rgba(37,99,235,.25),rgba(124,58,237,.2));">
          <h3>🎯 Mission</h3>
          <p>${plan.mission}</p>
          <p><b>Workspace:</b> ${plan.workspaceName}</p>
          <p><b>Opportunity Score:</b> ${plan.score}/100</p>
        </div>

        <div class="deal">
          <h3>🧠 AI Agent Team</h3>
          ${plan.agents.map(a => `
            <p><b>${a.name}</b><br><span class="muted">${a.job}</span><br>✅ ${a.status}</p>
          `).join("")}
        </div>

        <div class="deal">
          <h3>🚀 Execution Plan</h3>
          ${plan.executionSteps.map(s => `<p>➡️ ${s}</p>`).join("")}
        </div>

        <div class="deal">
          <h3>📄 Documents</h3>
          ${plan.documents.map(d => `<p>📌 ${d}</p>`).join("")}
        </div>

        <div class="deal">
          <h3>🛡 Human Approval Required</h3>
          ${plan.approvalRequired.map(a => `<p>🔐 ${a}</p>`).join("")}
        </div>

        <div class="deal">
          <h3>⚡ Next Best Action</h3>
          <p>Start Research Agent, then launch Buyer/Supplier Discovery for this workspace.</p>
          <button class="btn" onclick="TradeFlowAgentCoreV1.pushToWorkflow()">
            Push Mission to AI Workflow
          </button>
        </div>
      </div>
    `;
  }

  function pushToWorkflow() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return alert("Run the agent first.");

    const plan = JSON.parse(raw);

    if (window.TradeFlowAIAutomationLayerV1?.createAutomationFlow) {
      window.TradeFlowAIAutomationLayerV1.createAutomationFlow({
        name: plan.mission,
        email: "",
        country: plan.intent.market,
        verificationScore: plan.score
      });

      alert("Mission pushed into AI Automation workflow.");
    } else {
      alert("AI Automation Layer not available.");
    }
  }

  function render() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return;

    let panel = document.getElementById("tradeflowAgentCorePanel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "tradeflowAgentCorePanel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";
      dashboard.prepend(panel);
    }

    panel.innerHTML = `
      <div style="
        padding:24px;
        border-radius:28px;
        background:
          radial-gradient(circle at top left,rgba(56,189,248,.25),transparent 35%),
          radial-gradient(circle at bottom right,rgba(168,85,247,.25),transparent 35%),
          linear-gradient(135deg,rgba(2,6,23,.92),rgba(15,23,42,.92));
        border:1px solid rgba(125,211,252,.25);
        box-shadow:0 30px 90px rgba(0,0,0,.45), inset 0 0 50px rgba(59,130,246,.08);
      ">
        <div class="section-title">🧠 TradeFlow Agent Core V1</div>

        <h2 style="
          font-size:42px;
          line-height:1.05;
          font-weight:1000;
          color:white;
          margin:10px 0;
          letter-spacing:-1px;
        ">
          Your AI Employee for Export & Import
        </h2>

        <p class="muted" style="font-size:16px;max-width:880px;">
          Give one business goal. TradeFlow Agent builds the research, buyer discovery, supplier discovery,
          outreach, CRM, compliance and execution plan.
        </p>

        <textarea
          id="tradeflowAgentCoreInput"
          placeholder="Example: I want to export Basmati Rice to UAE and find serious buyers..."
          style="
            width:100%;
            min-height:130px;
            margin-top:18px;
            border-radius:22px;
            padding:18px;
            background:rgba(15,23,42,.9);
            color:white;
            border:1px solid rgba(125,211,252,.25);
            outline:none;
            font-size:15px;
          "
        ></textarea>

        <button class="btn" style="
          margin-top:14px;
          background:linear-gradient(135deg,#2563eb,#7c3aed,#ec4899);
          box-shadow:0 18px 40px rgba(124,58,237,.35);
        " onclick="TradeFlowAgentCoreV1.runAgent()">
          Launch AI Trade Mission
        </button>

        <div id="tradeflowAgentCoreResult"></div>
      </div>
    `;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        renderResult(JSON.parse(saved));
      } catch {}
    }
  }

  function boot() {
    setTimeout(render, 1200);

    document.addEventListener("tradeflow:page-change", function () {
      setTimeout(render, 200);
    });

    console.log("✅ TradeFlow Agent Core V1 active");
  }

  window.TradeFlowAgentCoreV1 = {
    runAgent,
    buildAgentPlan,
    pushToWorkflow,
    render
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();