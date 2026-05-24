/* TradeFlow Automation Workflow Builder */

(function () {
  const CACHE_KEY = "tradeflowAutomationWorkflows";

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

  function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value || []));
  }

  function getJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function setStatus(text) {
    const el = $("automationBuilderStatus");
    if (el) el.innerText = text;
  }

  async function fetchWorkflows() {
    try {
      const res = await fetch(`${getBackendUrl()}/api/automation-workflows`, {
        headers: getHeaders()
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed");

      setJson(CACHE_KEY, data);
      renderWorkflows();
      setStatus("Automation workflows synced.");
    } catch {
      renderWorkflows();
      setStatus("Using cached automation workflows.");
    }
  }

  async function createWorkflow() {
    try {
      const payload = {
        name: $("workflowName")?.value || "New AI Workflow",
        description: $("workflowDescription")?.value || "",
        triggerType: $("workflowTrigger")?.value || "supplier_score",
        triggerCondition: {
          operator: $("workflowOperator")?.value || ">",
          value: $("workflowValue")?.value || "80"
        },
        actionType: $("workflowAction")?.value || "create_followup",
        actionConfig: {
          priority: $("workflowPriority")?.value || "Medium"
        },
        enabled: true
      };

      setStatus("Creating automation workflow...");

      const res = await fetch(`${getBackendUrl()}/api/automation-workflows`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Workflow creation failed");

      await fetchWorkflows();
      setStatus(`Workflow created: ${data.name}`);
    } catch (error) {
      setStatus(error.message || "Workflow creation failed.");
    }
  }

  async function executeWorkflow(id) {
    try {
      setStatus("Executing workflow...");

      const res = await fetch(`${getBackendUrl()}/api/automation-workflows/${id}/execute`, {
        method: "POST",
        headers: getHeaders()
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Execution failed");

      alert(data.aiSummary || "Workflow executed.");
      await fetchWorkflows();
    } catch (error) {
      setStatus(error.message || "Workflow execution failed.");
    }
  }

  function renderWorkflows() {
    const box = $("automationWorkflowList");
    if (!box) return;

    const workflows = getJson(CACHE_KEY, []);

    if (!workflows.length) {
      box.innerHTML = `<div class="deal">No workflows yet. Create your first automation.</div>`;
      return;
    }

    box.innerHTML = workflows.map((w) => `
      <div class="supplier-card" style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center;">
          <h2 style="color:white;margin:0;">${w.name}</h2>
          <span class="status">${w.enabled ? "Enabled" : "Disabled"}</span>
        </div>

        <p class="muted">${w.description || "No description"}</p>

        <div class="deal"><b>Trigger:</b> ${w.triggerType}</div>
        <div class="deal"><b>Condition:</b> ${w.triggerCondition?.operator || ">"} ${w.triggerCondition?.value || ""}</div>
        <div class="deal"><b>Action:</b> ${w.actionType}</div>
        <div class="deal"><b>Executions:</b> ${w.executionCount || 0}</div>
        <div class="deal"><b>Last Run:</b> ${w.lastExecutedAt ? new Date(w.lastExecutedAt).toLocaleString() : "Never"}</div>

        <button class="btn" onclick="TradeFlowAutomationBuilder.execute('${w._id}')">
          Execute Workflow
        </button>
      </div>
    `).join("");
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("automationWorkflowBuilderPanel")) return;

    const panel = document.createElement("div");
    panel.id = "automationWorkflowBuilderPanel";
    panel.className = "card ai-panel";

    panel.innerHTML = `
      <div class="section-title">⚙️ AI Workflow Automation Builder</div>
      <p class="muted">
        Create no-code automation rules for supplier scoring, CRM movement, follow-ups, alerts, and operational workflows.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:18px;">
        <input id="workflowName" class="input" placeholder="Workflow Name">
        <input id="workflowDescription" class="input" placeholder="Description">

        <select id="workflowTrigger" class="input">
          <option value="supplier_score">Supplier Score</option>
          <option value="deal_probability">Deal Probability</option>
          <option value="payment_risk">Payment Risk</option>
          <option value="inactive_deal">Inactive Deal</option>
          <option value="new_supplier">New Supplier</option>
        </select>

        <select id="workflowOperator" class="input">
          <option>></option>
          <option><</option>
          <option>=</option>
          <option>>=</option>
          <option><=</option>
        </select>

        <input id="workflowValue" class="input" placeholder="Trigger Value e.g. 80">

        <select id="workflowAction" class="input">
          <option value="create_followup">Create Follow-up</option>
          <option value="generate_outreach">Generate Outreach</option>
          <option value="send_notification">Send Notification</option>
          <option value="move_crm_stage">Move CRM Stage</option>
          <option value="flag_risk">Flag Risk</option>
        </select>

        <select id="workflowPriority" class="input">
          <option>High</option>
          <option selected>Medium</option>
          <option>Low</option>
        </select>
      </div>

      <button class="btn" onclick="TradeFlowAutomationBuilder.create()" style="margin-top:16px;">
        Create Automation Workflow
      </button>

      <button class="mini-btn" onclick="TradeFlowAutomationBuilder.fetch()">
        Refresh Workflows
      </button>

      <div id="automationBuilderStatus" style="margin-top:14px;color:#7dd3fc;font-weight:900;">
        Automation builder ready.
      </div>

      <div id="automationWorkflowList" style="margin-top:20px;"></div>
    `;

    dashboard.appendChild(panel);
    renderWorkflows();
  }

  window.TradeFlowAutomationBuilder = {
    fetch: fetchWorkflows,
    create: createWorkflow,
    execute: executeWorkflow
  };

  function boot() {
    buildPanel();
    setTimeout(fetchWorkflows, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();