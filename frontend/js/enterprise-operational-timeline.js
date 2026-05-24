/* TradeFlow Enterprise Operational Timeline Engine */

(function () {
  const TIMELINE_KEY = "tradeflowOperationalTimeline";

  function $(id) {
    return document.getElementById(id);
  }

  function getTimeline() {
    try {
      return JSON.parse(localStorage.getItem(TIMELINE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveTimeline(items) {
    localStorage.setItem(TIMELINE_KEY, JSON.stringify(items.slice(0, 80)));
  }

  function addEvent(type, title, message, metadata = {}) {
    const items = getTimeline();

    items.unshift({
      id: Date.now(),
      type,
      title,
      message,
      metadata,
      createdAt: new Date().toISOString()
    });

    saveTimeline(items);
    renderTimeline();
  }

  function seedTimelineIfEmpty() {
    const items = getTimeline();

    if (items.length) return;

    saveTimeline([
      {
        id: Date.now() - 40000,
        type: "AI",
        title: "TradeFlow Intelligence OS Activated",
        message: "AI command center, onboarding, growth intelligence, and autonomous operations are active.",
        createdAt: new Date(Date.now() - 40000).toISOString()
      },
      {
        id: Date.now() - 30000,
        type: "Workspace",
        title: "Enterprise Workspace Ready",
        message: "TradeFlow workspace is configured for suppliers, CRM, outreach, AI, workflows, and analytics.",
        createdAt: new Date(Date.now() - 30000).toISOString()
      },
      {
        id: Date.now() - 20000,
        type: "Automation",
        title: "Automation Layer Online",
        message: "Workflow builder, scheduler, AI task generation, and operational recommendations are ready.",
        createdAt: new Date(Date.now() - 20000).toISOString()
      }
    ]);
  }

  function iconFor(type) {
    const icons = {
      AI: "🤖",
      Supplier: "🌍",
      CRM: "📈",
      Outreach: "📧",
      Workflow: "⚙️",
      Automation: "⚡",
      Workspace: "🏢",
      Risk: "🛡",
      Billing: "💳",
      System: "🧠"
    };

    return icons[type] || "✨";
  }

  function formatTime(date) {
    try {
      return new Date(date).toLocaleString();
    } catch {
      return "Recently";
    }
  }

  function renderTimeline() {
    const panel = $("enterpriseOperationalTimelinePanel");
    if (!panel) return;

    const items = getTimeline();

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">
        <div>
          <div class="section-title">🕒 Enterprise Operational Timeline</div>
          <p class="muted">
            Live operational memory of AI events, workflow activity, supplier actions, CRM movement, and system intelligence.
          </p>
        </div>

        <button class="mini-btn" onclick="TradeFlowTimeline.add('System','Manual Timeline Check','Timeline refreshed by user.')">
          Add Test Event
        </button>
      </div>

      <div style="margin-top:18px;display:grid;gap:12px;">
        ${
          items.length
            ? items.map((item) => `
              <div class="supplier-card tf-fade-in" style="display:flex;gap:14px;align-items:flex-start;">
                <div style="font-size:28px;line-height:1;">
                  ${iconFor(item.type)}
                </div>

                <div style="flex:1;">
                  <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                    <h2 style="color:white;margin:0;font-size:17px;">
                      ${item.title}
                    </h2>
                    <span class="status">${item.type}</span>
                  </div>

                  <p class="muted" style="margin-top:8px;">
                    ${item.message}
                  </p>

                  <div class="deal" style="margin-top:8px;">
                    ${formatTime(item.createdAt)}
                  </div>
                </div>
              </div>
            `).join("")
            : `<div class="tf-empty-state"><h3>No activity yet</h3><p>TradeFlow operational events will appear here.</p></div>`
        }
      </div>
    `;
  }

  function patchActions() {
    if (window.TradeFlowTimelinePatched) return;
    window.TradeFlowTimelinePatched = true;

    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const response = await originalFetch(...args);

      try {
        const url = String(args[0] || "");

        if (response.ok && url.includes("/api/")) {
          if (url.includes("supplier")) {
            addEvent("Supplier", "Supplier Intelligence Updated", "Supplier data or enrichment activity completed.");
          } else if (url.includes("crm")) {
            addEvent("CRM", "CRM Activity Updated", "CRM pipeline activity was updated.");
          } else if (url.includes("workflow")) {
            addEvent("Workflow", "Workflow Activity Detected", "Automation workflow activity completed.");
          } else if (url.includes("email")) {
            addEvent("Outreach", "Email Automation Executed", "TradeFlow email execution completed.");
          } else if (url.includes("whatsapp")) {
            addEvent("Outreach", "WhatsApp Automation Executed", "TradeFlow WhatsApp execution completed.");
          } else if (url.includes("analytics")) {
            addEvent("System", "Analytics Refreshed", "Executive analytics or operational metrics refreshed.");
          }
        }
      } catch {}

      return response;
    };
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("enterpriseOperationalTimelinePanel")) return;

    const panel = document.createElement("div");
    panel.id = "enterpriseOperationalTimelinePanel";
    panel.className = "card ai-panel";
    panel.style.marginBottom = "18px";

    const growth = $("aiGrowthOpportunityPanel");

    if (growth && growth.parentNode) {
      growth.parentNode.insertBefore(panel, growth.nextSibling);
    } else {
      dashboard.appendChild(panel);
    }
  }

  function boot() {
    seedTimelineIfEmpty();
    buildPanel();
    patchActions();
    setTimeout(renderTimeline, 1800);
    setInterval(renderTimeline, 30000);
  }

  window.TradeFlowTimeline = {
    add: addEvent,
    render: renderTimeline,
    all: getTimeline
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();