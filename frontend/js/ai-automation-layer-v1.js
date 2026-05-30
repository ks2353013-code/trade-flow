/* TradeFlow AI Automation Layer V1
   End-to-end workflow:
   Verified Lead → Outreach → Follow-up → CRM → Analytics
*/

(function () {
  if (window.TradeFlowAIAutomationLayerV1) return;

  const STORAGE_KEY = "tradeflowAIAutomationV1";

  function getAutomations() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveAutomations(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function getActiveWorkspace() {
    if (window.TradeFlowWorkspaceEngineV1?.getActiveWorkspace) {
      return window.TradeFlowWorkspaceEngineV1.getActiveWorkspace();
    }
    return null;
  }

  function getBusinessType() {
    return (
      localStorage.getItem("tradeflowBusinessType") ||
      "Trading Company"
    );
  }

  function createAutomationFlow(lead) {
    const workspace = getActiveWorkspace();

    const flow = {
      id: "auto_" + Date.now(),
      leadName: lead?.name || "New Verified Lead",
      leadEmail: lead?.email || "",
      leadCountry: lead?.country || "",
      leadScore: lead?.verificationScore || 75,
      workspaceId: workspace?.id || "",
      workspaceName: workspace?.name || "Default Workspace",
      businessType: getBusinessType(),
      status: "Prepared",
      steps: [
        {
          name: "Lead Verified",
          status: "Completed"
        },
        {
          name: "Outreach Draft Created",
          status: "Completed"
        },
        {
          name: "Follow-up Plan Generated",
          status: "Pending"
        },
        {
          name: "CRM Push Ready",
          status: "Pending"
        },
        {
          name: "Analytics Tracking Ready",
          status: "Pending"
        }
      ],
      outreach: generateOutreach(lead),
      followup: generateFollowupPlan(lead),
      createdAt: new Date().toISOString()
    };

    const items = getAutomations();
    items.unshift(flow);
    saveAutomations(items);

    render();

    return flow;
  }

  function generateOutreach(lead = {}) {
    const product =
      getActiveWorkspace()?.product ||
      "your product";

    const market =
      getActiveWorkspace()?.targetMarket ||
      lead.country ||
      "your market";

    return `Subject: Business Opportunity for ${product}

Hello ${lead.name || "Team"},

I hope you are doing well.

We are exploring a serious trade opportunity related to ${product} for ${market}. Your company appears relevant for this requirement, and we would like to discuss pricing, availability, MOQ, certifications, packaging and delivery timeline.

Please share your latest catalogue, quotation, payment terms and export/import support details.

Regards,
TradeFlow Team`;
  }

  function generateFollowupPlan(lead = {}) {
    return `Follow-up Plan for ${lead.name || "Lead"}:

Day 1:
Send first professional outreach.

Day 2:
Follow up if no response.

Day 4:
Ask for catalogue, MOQ, pricing and certificates.

Day 7:
Move to CRM negotiation if response is positive.

Day 10:
Mark as cold if no response after final follow-up.`;
  }

  function markStepDone(flowId, stepIndex) {
    const items = getAutomations();

    const next = items.map(flow => {
      if (flow.id !== flowId) return flow;

      const steps = flow.steps.map((step, index) => {
        if (index === stepIndex) {
          return {
            ...step,
            status: "Completed"
          };
        }
        return step;
      });

      const allDone = steps.every(step => step.status === "Completed");

      return {
        ...flow,
        steps,
        status: allDone ? "Completed" : "In Progress"
      };
    });

    saveAutomations(next);
    render();
  }

  function sendToOutreach(flowId) {
    const flow = getAutomations().find(item => item.id === flowId);
    if (!flow) return;

    if (typeof window.showPage === "function") {
      window.showPage("outreach");
    }

    setTimeout(() => {
      const subject = document.getElementById("emailSubject");
      const message = document.getElementById("emailMessage");
      const to = document.getElementById("emailTo");

      if (subject) subject.value = `Business Opportunity - ${flow.leadName}`;
      if (message) message.value = flow.outreach;
      if (to) to.value = flow.leadEmail || "";

      alert("AI outreach draft moved to Outreach module.");
    }, 400);
  }

  function pushToCRM(flowId) {
    const flow = getAutomations().find(item => item.id === flowId);
    if (!flow) return;

    if (typeof window.showPage === "function") {
      window.showPage("crm");
    }

    setTimeout(() => {
      const company = document.getElementById("dealCompanyName");
      const email = document.getElementById("dealEmail");
      const country = document.getElementById("dealCountry");
      const product = document.getElementById("dealProduct");
      const notes = document.getElementById("dealNotes");

      if (company) company.value = flow.leadName;
      if (email) email.value = flow.leadEmail;
      if (country) country.value = flow.leadCountry;
      if (product) product.value = getActiveWorkspace()?.product || "";
      if (notes) {
        notes.value = `AI Automation Lead
Workspace: ${flow.workspaceName}
Business Type: ${flow.businessType}
Lead Score: ${flow.leadScore}/100

${flow.followup}`;
      }

      alert("Lead prepared inside CRM form.");
    }, 400);
  }

  function addDemoAutomation() {
    createAutomationFlow({
      name: "ABC Rice Exporters",
      email: "sales@abcrice.com",
      country: "UAE",
      verificationScore: 92
    });
  }

  function render() {
    const dashboard = document.getElementById("dashboardPage");
    if (!dashboard) return;

    let panel = document.getElementById("aiAutomationLayerPanel");

    if (!panel) {
      panel = document.createElement("div");
      panel.id = "aiAutomationLayerPanel";
      panel.className = "card ai-panel";
      panel.style.marginBottom = "18px";
      dashboard.prepend(panel);
    }

    const items = getAutomations().slice(0, 20);

    panel.innerHTML = `
      <div class="section-title">🤖 AI Automation Layer V1</div>

      <p class="muted">
        Verified Lead → Outreach → Follow-up → CRM → Analytics
      </p>

      <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap;">
        <button class="btn" onclick="TradeFlowAIAutomationLayerV1.addDemoAutomation()">
          Add Demo AI Workflow
        </button>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:18px;">
        ${
          items.length
            ? items.map(flow => `
              <div style="
                padding:16px;
                border-radius:18px;
                background:rgba(15,23,42,.72);
                border:1px solid rgba(148,163,184,.16);
              ">
                <h3 style="color:white;font-weight:900;margin:0 0 8px;">
                  ${flow.leadName}
                </h3>

                <p class="muted">Workspace: ${flow.workspaceName}</p>
                <p class="muted">Business Type: ${flow.businessType}</p>
                <p class="muted">Lead Score: ${flow.leadScore}/100</p>

                <div style="margin-top:10px;font-weight:900;color:#7dd3fc;">
                  Status: ${flow.status}
                </div>

                <div style="margin-top:12px;">
                  ${flow.steps.map((step, index) => `
                    <div style="
                      display:flex;
                      justify-content:space-between;
                      gap:8px;
                      margin-top:8px;
                      padding:8px;
                      border-radius:12px;
                      background:rgba(255,255,255,.05);
                    ">
                      <span>${step.status === "Completed" ? "✅" : "⏳"} ${step.name}</span>
                      <button class="mini-btn" onclick="TradeFlowAIAutomationLayerV1.markStepDone('${flow.id}', ${index})">
                        Done
                      </button>
                    </div>
                  `).join("")}
                </div>

                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;">
                  <button class="btn" onclick="TradeFlowAIAutomationLayerV1.sendToOutreach('${flow.id}')">
                    Send to Outreach
                  </button>

                  <button class="btn" onclick="TradeFlowAIAutomationLayerV1.pushToCRM('${flow.id}')">
                    Push to CRM
                  </button>
                </div>
              </div>
            `).join("")
            : `<div class="deal">No AI workflows yet. Add a demo workflow to test.</div>`
        }
      </div>
    `;
  }

  function boot() {
    render();
    console.log("✅ AI Automation Layer V1 active");
  }

  window.TradeFlowAIAutomationLayerV1 = {
    createAutomationFlow,
    addDemoAutomation,
    markStepDone,
    sendToOutreach,
    pushToCRM,
    render
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();