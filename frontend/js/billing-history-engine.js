/* TradeFlow Billing History + Subscription Sync Panel */

(function () {
  const CACHE_KEY = "tradeflowBillingHistoryCache";

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

  function setCache(data) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
  }

  function getCache() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
    } catch {
      return [];
    }
  }

  async function fetchBillingHistory() {
    try {
      const res = await fetch(`${getBackendUrl()}/api/billing/payments`, {
        headers: getHeaders()
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed");

      setCache(data);
      render();

      setStatus("Billing history synced.");
    } catch {
      render();
      setStatus("Using cached billing history.");
    }
  }

  async function syncSubscription() {
    try {
      const res = await fetch(`${getBackendUrl()}/api/billing/subscription`, {
        headers: getHeaders()
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed");

      localStorage.setItem("tradeflowSubscriptionPlan", data.plan || "Free");

      if (window.TradeFlowSubscriptionEngine) {
        TradeFlowSubscriptionEngine.render();
      }

      setStatus(`Subscription synced: ${data.plan || "Free"}`);
    } catch {
      setStatus("Subscription sync failed.");
    }
  }

  function setStatus(text) {
    const el = $("billingHistoryStatus");
    if (el) el.innerText = text;
  }

  function render() {
    const box = $("billingHistoryList");
    if (!box) return;

    const rows = getCache();

    if (!rows.length) {
      box.innerHTML = `<div class="deal">No billing history yet.</div>`;
      return;
    }

    box.innerHTML = rows.map((p) => `
      <div class="supplier-card" style="margin-bottom:12px;">
        <h2 style="font-size:17px;color:white;margin:0 0 8px;">
          ${p.plan || "Subscription"} — ${p.status || "Success"}
        </h2>
        <p class="muted">Amount: ₹${Number(p.amount || 0) / 100}</p>
        <p class="muted">Payment ID: ${p.razorpayPaymentId || p.paymentId || "N/A"}</p>
        <p class="muted">Order ID: ${p.razorpayOrderId || p.orderId || "N/A"}</p>
        <span class="status">
          ${p.createdAt ? new Date(p.createdAt).toLocaleString() : "Saved"}
        </span>
      </div>
    `).join("");
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("billingHistoryPanel")) return;

    const panel = document.createElement("div");
    panel.id = "billingHistoryPanel";
    panel.className = "card ai-panel";

    panel.innerHTML = `
      <div class="section-title">💳 Billing History + Subscription Sync</div>
      <p class="muted">
        View Razorpay payments, sync active plans, and verify subscription state.
      </p>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;">
        <button class="btn" onclick="TradeFlowBillingHistory.fetch()">Refresh Billing History</button>
        <button class="btn" onclick="TradeFlowBillingHistory.sync()">Sync Subscription</button>
      </div>

      <div id="billingHistoryStatus" style="margin-top:12px;color:#7dd3fc;font-weight:900;">
        Billing history ready.
      </div>

      <div id="billingHistoryList" style="margin-top:18px;max-height:520px;overflow-y:auto;"></div>
    `;

    dashboard.appendChild(panel);
    render();
  }

  window.TradeFlowBillingHistory = {
    fetch: fetchBillingHistory,
    sync: syncSubscription,
    render
  };

  function boot() {
    buildPanel();
    setTimeout(() => {
      syncSubscription();
      fetchBillingHistory();
    }, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();