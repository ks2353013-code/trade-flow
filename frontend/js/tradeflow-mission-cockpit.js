/* TradeFlow Mission Cockpit: keep operational complexity inside the OS. */
(function () {
  if (window.TradeFlowMissionCockpit) return;
  const API = window.TRADEFLOW_API_BASE || window.TRADEFLOW_API_BASE_URL || window.BACKEND_URL || "";

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" })[ch];
    });
  }

  function injectStyle() {
    if (document.getElementById("tradeflowMissionCockpitStyle")) return;
    const style = document.createElement("style");
    style.id = "tradeflowMissionCockpitStyle";
    style.textContent =
      ".tf-cockpit{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:16px;margin:16px 0}" +
      ".tf-cockpit-card{background:rgba(255,255,255,.96);border:1px solid rgba(20,30,50,.09);border-radius:18px;padding:18px;box-shadow:0 10px 30px rgba(20,30,50,.05)}" +
      ".tf-cockpit-title{font-size:20px;font-weight:750;margin:0 0 4px}.tf-cockpit-muted{color:#667085;font-size:13px}" +
      ".tf-cockpit-flow{display:flex;gap:6px;overflow:auto;padding:12px 0 4px}.tf-stage{min-width:72px;text-align:center;font-size:11px;color:#667085}.tf-dot{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;margin:auto auto 5px;background:#eef1f5}.tf-stage.active .tf-dot{background:#111827;color:#fff}.tf-stage.done .tf-dot{background:#dfeee5;color:#185c37}" +
      ".tf-next{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 14px;border-radius:12px;background:#f7f8fa;margin-top:10px}.tf-badge{font-size:11px;font-weight:700;padding:5px 8px;border-radius:999px;background:#eef1f5}.tf-list{display:grid;gap:8px;margin-top:12px}.tf-row{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #edf0f3}.tf-row:last-child{border-bottom:0}@media(max-width:900px){.tf-cockpit{grid-template-columns:1fr}.tf-stage{min-width:60px}}";
    document.head.appendChild(style);
  }

  async function request(path) {
    const response = await fetch(API + path, { credentials: "include" });
    const data = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(data.message || "TradeFlow request failed");
    return data;
  }

  function render(execution) {
    if (!execution) return;
    injectStyle();
    const host = document.querySelector("#dashboardPage") || document.querySelector("main");
    if (!host) return;
    let box = document.getElementById("tradeflowMissionCockpit");
    if (!box) {
      box = document.createElement("section");
      box.id = "tradeflowMissionCockpit";
      host.prepend(box);
    }
    const stages = ["qualification","negotiation","deal","documents","compliance","government","logistics","shipment","invoice","payment","realisation","closed"];
    const current = stages.indexOf(execution.stage);
    const flow = stages.map(function (name, i) {
      const state = i < current ? "done" : i === current ? "active" : "next";
      return '<div class="tf-stage ' + state + '"><div class="tf-dot">' + (i + 1) + '</div><div>' + esc(name) + '</div></div>';
    }).join("");
    const blockers = (execution.blockers || []).map(function (x) {
      return '<div class="tf-row"><span>' + esc(x) + '</span><span class="tf-badge">Blocked</span></div>';
    }).join("");
    box.innerHTML =
      '<div class="tf-cockpit">' +
        '<div class="tf-cockpit-card">' +
          '<div class="tf-cockpit-title">' + esc(execution.product) + ' · ' + esc(execution.market) + '</div>' +
          '<div class="tf-cockpit-muted">' + esc(execution.direction) + ' mission execution</div>' +
          '<div class="tf-cockpit-flow">' + flow + '</div>' +
          '<div class="tf-next"><div><strong>Current step</strong><div class="tf-cockpit-muted">' + esc(execution.stage) + '</div></div><span class="tf-badge">' + esc(execution.status) + '</span></div>' +
        '</div>' +
        '<div class="tf-cockpit-card"><strong>What needs attention</strong><div class="tf-list">' +
          (blockers || '<div class="tf-cockpit-muted">Nothing blocked. TradeFlow will surface the next required action.</div>') +
        '</div></div>' +
      '</div>';
  }

  async function refresh() {
    try {
      const data = await request("/api/trade-executions");
      if (data.executions && data.executions[0]) render(data.executions[0]);
    } catch (error) {
      window.TradeFlowMissionCockpit.lastError = error.message;
    }
  }

  window.TradeFlowMissionCockpit = { refresh: refresh, render: render };
  document.addEventListener("tradeflow:page-change", function () { setTimeout(refresh, 400); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(refresh, 800); });
  else setTimeout(refresh, 800);
})();
