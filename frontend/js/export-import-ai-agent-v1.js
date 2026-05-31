/* TradeFlow Export-Import AI Agent V1 */

(function () {
  if (window.TradeFlowExportImportAIAgentV1) return;

  function getActiveWorkspace() {
    return window.TradeFlowWorkspaceEngineV1?.getActiveWorkspace?.() || null;
  }

  function createWorkspaceFromPrompt(text) {
    const lower = text.toLowerCase();

    let product = "General Product";
    let market = "Global Market";

    if (lower.includes("rice")) product = "Rice";
    if (lower.includes("basmati")) product = "Basmati Rice";
    if (lower.includes("medicine")) product = "Medicine";
    if (lower.includes("jaggery")) product = "Jaggery";
    if (lower.includes("textile")) product = "Textile";

    if (lower.includes("uae")) market = "UAE";
    if (lower.includes("dubai")) market = "UAE";
    if (lower.includes("africa")) market = "Africa";
    if (lower.includes("europe")) market = "Europe";
    if (lower.includes("usa")) market = "USA";

    const workspaceName = `${product} Export ${market}`;

    if (window.TradeFlowWorkspaceEngineV1?.createWorkspaceDirect) {
      window.TradeFlowWorkspaceEngineV1.createWorkspaceDirect({
        name: workspaceName,
        product,
        targetMarket: market
      });
    } else {
      localStorage.setItem("tradeflowAgentSuggestedWorkspace", workspaceName);
    }

    return { workspaceName, product, market };
  }

  function generatePlan(text) {
    const setup = createWorkspaceFromPrompt(text);

    return {
      setup,
      steps: [
        "Create export workspace",
        "Identify target buyers",
        "Verify supplier/buyer leads",
        "Generate outreach email",
        "Create CRM deal pipeline",
        "Create follow-up tasks",
        "Prepare export documents checklist",
        "Estimate revenue opportunity",
        "Track next actions daily"
      ],
      documents: [
        "Commercial Invoice",
        "Packing List",
        "Certificate of Origin",
        "Shipping Bill",
        "Bill of Lading / Airway Bill",
        "Insurance Certificate",
        "Product-specific compliance documents"
      ],
      outreach: `Subject: Export Opportunity for ${setup.product} to ${setup.market}

Hello,

We are exploring a serious export opportunity for ${setup.product} in ${setup.market}. Please share your requirements, target quantity, pricing expectations, packaging preference, documentation requirements and delivery timeline.

Regards,
TradeFlow Team`,
      opportunityScore: 78,
      nextAction: `Start buyer discovery for ${setup.product} in ${setup.market}.`
    };
  }

  function runAgent() {
    const input = document.getElementById("exportImportAgentInput");
    const text = input?.value?.trim();

    if (!text) {
      alert("Enter an export/import goal first.");
      return;
    }

    const result = generatePlan(text);

    localStorage.setItem("tradeflowExportImportAgentV1", JSON.stringify(result));

    renderResult(result);
  }

  function renderResult(result) {
    const box = document.getElementById("exportImportAgentResult");
    if (!box) return;

    box.innerHTML = `
      <div class="deal">
        <h3>✅ Agent Plan Created</h3>
        <p><b>Workspace:</b> ${result.setup.workspaceName}</p>
        <p><b>Product:</b> ${result.setup.product}</p>
        <p><b>Market:</b> ${result.setup.market}</p>
        <p><b>Opportunity Score:</b> ${result.opportunityScore}/100</p>
      </div>

      <div class="deal">
        <h3>🚀 Execution Steps</h3>
        ${result.steps.map(step => `<p>➡️ ${step}</p>`).join("")}
      </div>

      <div class="deal">
        <h3>📄 Export Documents Checklist</h3>
        ${result.documents.map(doc => `<p>📌 ${doc}</p>`).join("")}
      </div>

      <div class="deal">
        <h3>✉️ Outreach Draft</h3>
        <textarea style="width:100%;min-height:180px;">${result.outreach}</textarea>
      </div>

      <div class="deal">
        <h3>🎯 Next Action</h3>
        <p>${result.nextAction}</p>
      </div>
    `;
  }

  function render() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return;

    let panel = document.getElementById("exportImportAIAgentPanel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "exportImportAIAgentPanel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";
      dashboard.prepend(panel);
    }

    panel.innerHTML = `
      <div class="section-title">🌍 Export-Import AI Agent V1</div>

      <h2 style="font-size:30px;font-weight:900;color:white;margin:8px 0;">
        Tell TradeFlow what you want to export or import
      </h2>

      <p class="muted">
        Example: I want to export Basmati Rice to UAE.
      </p>

      <textarea
        id="exportImportAgentInput"
        placeholder="I want to export Basmati Rice to UAE..."
        style="width:100%;min-height:120px;margin-top:14px;"
      ></textarea>

      <button class="btn" style="margin-top:12px;" onclick="TradeFlowExportImportAIAgentV1.runAgent()">
        Run Export-Import Agent
      </button>

      <div id="exportImportAgentResult" style="margin-top:18px;"></div>
    `;

    const saved = localStorage.getItem("tradeflowExportImportAgentV1");
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

    console.log("✅ Export-Import AI Agent V1 active");
  }

  window.TradeFlowExportImportAIAgentV1 = {
    runAgent,
    generatePlan,
    render
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();