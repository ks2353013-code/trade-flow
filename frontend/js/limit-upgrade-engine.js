/* TradeFlow Limit + Upgrade Prompt Engine */

(function () {
  function getPlan() {
    return localStorage.getItem("tradeflowSubscriptionPlan") || "Free";
  }

  function showUpgradePrompt(data = {}) {
    const old = document.getElementById("limitUpgradeModal");
    if (old) old.remove();

    const modal = document.createElement("div");
    modal.id = "limitUpgradeModal";

    modal.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(2,6,23,.78);
      backdrop-filter:blur(12px);
      z-index:999999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:20px;
    `;

    modal.innerHTML = `
      <div style="
        max-width:520px;
        width:100%;
        background:linear-gradient(135deg,#0f172a,#020617);
        border:1px solid rgba(56,189,248,.25);
        border-radius:28px;
        padding:26px;
        color:white;
        box-shadow:0 30px 90px rgba(0,0,0,.55);
      ">
        <div style="font-size:28px;font-weight:900;margin-bottom:8px;">
          🚀 Upgrade Required
        </div>

        <p style="color:#cbd5e1;line-height:1.6;">
          ${data.message || "Your current plan limit has been reached."}
        </p>

        <div style="
          margin:18px 0;
          padding:14px;
          border-radius:18px;
          background:rgba(15,23,42,.8);
          border:1px solid rgba(148,163,184,.16);
          color:#cbd5e1;
        ">
          <b>Current Plan:</b> ${data.plan || getPlan()}<br>
          <b>Feature:</b> ${data.metricType || "Premium Feature"}<br>
          <b>Used:</b> ${data.used ?? "N/A"}<br>
          <b>Limit:</b> ${data.limit ?? "Upgrade required"}
        </div>

        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn" onclick="TradeFlowLimitUpgrade.openUpgrade()">
            Upgrade Plan
          </button>

          <button class="mini-btn" onclick="document.getElementById('limitUpgradeModal').remove()">
            Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function openUpgrade() {
    const modal = document.getElementById("limitUpgradeModal");
    if (modal) modal.remove();

    if (
      window.TradeFlowSubscriptionEngine &&
      typeof window.TradeFlowSubscriptionEngine.openUpgrade === "function"
    ) {
      window.TradeFlowSubscriptionEngine.openUpgrade();
      return;
    }

    alert("Please upgrade to Pro or Enterprise.");
  }

  function patchFetch() {
    if (window.TradeFlowLimitUpgradePatched) return;
    window.TradeFlowLimitUpgradePatched = true;

    const originalFetch = window.fetch;

    window.fetch = async function (url, options = {}) {
      const response = await originalFetch(url, options);

      if (response.status === 403) {
        try {
          const cloned = response.clone();
          const data = await cloned.json();

          const isLimit =
            data?.message?.toLowerCase().includes("limit") ||
            data?.requiredPlan ||
            data?.metricType;

          if (isLimit) {
            showUpgradePrompt(data);

            if (window.TradeFlowUsageDashboard) {
              TradeFlowUsageDashboard.fetch();
            }
          }
        } catch {}
      }

      return response;
    };
  }

  window.TradeFlowLimitUpgrade = {
    show: showUpgradePrompt,
    openUpgrade
  };

  function boot() {
    patchFetch();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();