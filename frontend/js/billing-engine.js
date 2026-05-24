/* TradeFlow Billing Database Engine */

(function () {
  const BILLING_CACHE_KEY = "tradeflowBillingCache";
  const PAYMENT_CACHE_KEY = "tradeflowPaymentHistoryCache";

  function $(id) {
    return document.getElementById(id);
  }

  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") return BACKEND_URL;
    return "https://trade-flow-lc1k.onrender.com";
  }

  function getJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getUser() {
    try {
      if (typeof window.getUser === "function") return window.getUser();
    } catch {}
    return getJson("tradeflowUser", {});
  }

  function getUserEmail() {
    const user = getUser();
    return (user?.email || localStorage.getItem("tradeflowUserEmail") || "unknown@tradeflow.local").toLowerCase();
  }

  function getHeaders() {
    const user = getUser();

    return {
      "Content-Type": "application/json",
      "Authorization": user?.token ? `Bearer ${user.token}` : "",
      "x-user-email": getUserEmail()
    };
  }

  async function fetchSubscription() {
    try {
      const email = encodeURIComponent(getUserEmail());

      const res = await fetch(`${getBackendUrl()}/api/billing/subscription?email=${email}`, {
        headers: getHeaders()
      });

      if (!res.ok) throw new Error("Failed to fetch subscription");

      const subscription = await res.json();

      setJson(BILLING_CACHE_KEY, subscription);

      if (subscription?.plan) {
        localStorage.setItem("tradeflowSubscriptionPlan", subscription.plan);
      }

      if (window.TradeFlowSubscriptionEngine) {
        TradeFlowSubscriptionEngine.render();
      }

      if (window.TradeFlowAccessControl) {
        TradeFlowAccessControl.updateNavLocks();
      }

      renderBillingPanels();

      return subscription;
    } catch (error) {
      renderBillingStatus("Using local billing cache.");
      return getJson(BILLING_CACHE_KEY, null);
    }
  }

  async function fetchPayments() {
    try {
      const email = encodeURIComponent(getUserEmail());

      const res = await fetch(`${getBackendUrl()}/api/billing/payments?email=${email}`, {
        headers: getHeaders()
      });

      if (!res.ok) throw new Error("Failed to fetch payments");

      const payments = await res.json();
      setJson(PAYMENT_CACHE_KEY, Array.isArray(payments) ? payments : []);
      renderBillingPanels();

      return payments;
    } catch (error) {
      renderBillingStatus("Using local payment cache.");
      return getJson(PAYMENT_CACHE_KEY, []);
    }
  }

  async function activateSubscriptionFromPayment(paymentData) {
    try {
      const res = await fetch(`${getBackendUrl()}/api/billing/activate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          email: getUserEmail(),
          plan: paymentData.plan,
          razorpayPaymentId: paymentData.razorpayPaymentId || paymentData.razorpay_payment_id || "",
          razorpayOrderId: paymentData.razorpayOrderId || paymentData.razorpay_order_id || "",
          razorpaySignature: paymentData.razorpaySignature || paymentData.razorpay_signature || "",
          amount: paymentData.amount,
          currency: paymentData.currency || "INR"
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Billing activation failed");
      }

      setJson(BILLING_CACHE_KEY, data.subscription);
      localStorage.setItem("tradeflowSubscriptionPlan", data.subscription.plan);

      await fetchPayments();

      if (window.TradeFlowSubscriptionEngine) {
        TradeFlowSubscriptionEngine.setPlan(data.subscription.plan);
        TradeFlowSubscriptionEngine.render();
      }

      if (window.TradeFlowAccessControl) {
        TradeFlowAccessControl.updateNavLocks();
      }

      renderBillingStatus(`${data.subscription.plan} plan activated in database.`);
      renderBillingPanels();

      return data.subscription;
    } catch (error) {
      renderBillingStatus("Payment succeeded locally, but database billing sync failed.");
      return null;
    }
  }

  async function setFreePlan() {
    try {
      const res = await fetch(`${getBackendUrl()}/api/billing/set-free`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          email: getUserEmail()
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed to set free plan");

      setJson(BILLING_CACHE_KEY, data.subscription);
      localStorage.setItem("tradeflowSubscriptionPlan", "Free");

      if (window.TradeFlowSubscriptionEngine) {
        TradeFlowSubscriptionEngine.setPlan("Free");
        TradeFlowSubscriptionEngine.render();
      }

      if (window.TradeFlowAccessControl) {
        TradeFlowAccessControl.updateNavLocks();
      }

      renderBillingPanels();
      renderBillingStatus("Free plan set in database.");
    } catch (error) {
      renderBillingStatus("Could not set free plan in database.");
    }
  }

  function renderBillingStatus(text) {
    const el = $("billingEngineStatus");
    if (el) el.innerText = text;
  }

  function getSubscriptionCache() {
    return getJson(BILLING_CACHE_KEY, null);
  }

  function getPaymentCache() {
    return getJson(PAYMENT_CACHE_KEY, []);
  }

  function formatDate(value) {
    if (!value) return "N/A";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return "N/A";
    }
  }

  function renderBillingPanels() {
    const subscription = getSubscriptionCache();
    const payments = getPaymentCache();

    const boxes = [
      $("billingSummaryBox"),
      $("dashboardBillingSummaryBox")
    ].filter(Boolean);

    boxes.forEach((box) => {
      if (!subscription) {
        box.innerHTML = `<div class="deal">No billing record loaded yet.</div>`;
        return;
      }

      box.innerHTML = `
        <div class="deal">
          <b>Current Plan:</b> ${subscription.plan || "Free"}<br>
          <b>Status:</b> ${subscription.status || "Active"}<br>
          <b>Email:</b> ${subscription.email || getUserEmail()}<br>
          <b>Started:</b> ${formatDate(subscription.startsAt)}<br>
          <b>Expires:</b> ${formatDate(subscription.expiresAt)}
        </div>

        <div class="deal">
          <b>Entitlements</b><br>
          AI: ${subscription.entitlements?.aiLimit || 20}<br>
          Suppliers: ${subscription.entitlements?.supplierLimit || 25}<br>
          Deals: ${subscription.entitlements?.dealLimit || 20}<br>
          Workspaces: ${subscription.entitlements?.workspaceLimit || 1}<br>
          Employees: ${subscription.entitlements?.employeeLimit || 1}
        </div>
      `;
    });

    const paymentBox = $("billingPaymentHistoryBox");
    if (paymentBox) {
      if (!payments.length) {
        paymentBox.innerHTML = `<div class="deal">No payment history yet.</div>`;
      } else {
        paymentBox.innerHTML = payments.map((payment) => `
          <div class="supplier-card">
            <h2 style="font-size:18px;font-weight:900;color:white;margin:0 0 8px;">
              ${payment.plan} Payment
            </h2>
            <p class="muted">Amount: ₹${Number(payment.amount || 0) / 100}</p>
            <p class="muted">Payment ID: ${payment.razorpayPaymentId}</p>
            <p class="muted">Order ID: ${payment.razorpayOrderId}</p>
            <span class="status">${payment.status} • ${formatDate(payment.createdAt)}</span>
          </div>
        `).join("");
      }
    }
  }

  function injectStyles() {
    if ($("billingEngineStyles")) return;

    const style = document.createElement("style");
    style.id = "billingEngineStyles";
    style.innerHTML = `
      .billing-grid {
        display: grid;
        grid-template-columns: minmax(300px, 1fr) minmax(280px, .9fr);
        gap: 18px;
        margin-top: 18px;
      }

      .billing-status {
        margin-top: 10px;
        color: #7dd3fc;
        font-size: 13px;
        font-weight: 900;
      }

      .billing-history {
        max-height: 480px;
        overflow-y: auto;
        padding-right: 6px;
      }

      @media(max-width:900px){
        .billing-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildBillingPanel() {
    const masterPage = $("masterPage") || $("aiPage");
    if (!masterPage || $("billingDatabasePanel")) return;

    const panel = document.createElement("div");
    panel.id = "billingDatabasePanel";
    panel.className = "card subscription-card";
    panel.innerHTML = `
      <div class="section-title">💳 Billing Database Engine</div>
      <p class="muted">
        Subscription, payments, billing history, active plan, and user entitlements are now read from MongoDB.
      </p>

      <div class="billing-grid">
        <div>
          <div id="billingSummaryBox"></div>

          <div class="grid grid-3" style="margin-top:14px;">
            <button class="btn" onclick="TradeFlowBillingEngine.fetchSubscription()">Refresh Subscription</button>
            <button class="btn" onclick="TradeFlowBillingEngine.fetchPayments()">Refresh Payments</button>
            <button class="btn" onclick="TradeFlowBillingEngine.setFree()">Set Free Plan</button>
          </div>

          <div id="billingEngineStatus" class="billing-status">Billing engine ready.</div>
        </div>

        <div>
          <div class="section-title">🧾 Payment History</div>
          <div id="billingPaymentHistoryBox" class="billing-history"></div>
        </div>
      </div>
    `;

    masterPage.appendChild(panel);
    renderBillingPanels();
  }

  function buildDashboardBillingPanel() {
    const dashboard = $("dashboardPage");
    if (!dashboard || $("dashboardBillingPanel")) return;

    const panel = document.createElement("div");
    panel.id = "dashboardBillingPanel";
    panel.className = "card subscription-card";
    panel.innerHTML = `
      <div class="section-title">💳 Billing & Entitlements</div>
      <p class="muted">Your active plan is restored from MongoDB after login.</p>
      <div id="dashboardBillingSummaryBox"></div>
      <button class="btn" onclick="TradeFlowBillingEngine.openUpgrade()">Upgrade / Manage Plan</button>
    `;

    dashboard.appendChild(panel);
    renderBillingPanels();
  }

  function patchPaymentEngine() {
    if (window.TradeFlowBillingPaymentPatched) return;
    if (!window.TradeFlowPaymentEngine || typeof window.TradeFlowPaymentEngine.startPayment !== "function") return;

    window.TradeFlowBillingPaymentPatched = true;
    const originalStartPayment = window.TradeFlowPaymentEngine.startPayment;

    window.TradeFlowPaymentEngine.startPayment = async function (plan) {
      return originalStartPayment(plan);
    };
  }

  function openUpgrade() {
    if (window.TradeFlowSubscriptionEngine && typeof window.TradeFlowSubscriptionEngine.openUpgrade === "function") {
      window.TradeFlowSubscriptionEngine.openUpgrade();
    }
  }

  window.TradeFlowBillingEngine = {
    fetchSubscription,
    fetchPayments,
    activate: activateSubscriptionFromPayment,
    setFree: setFreePlan,
    render: renderBillingPanels,
    openUpgrade
  };

  function boot() {
    injectStyles();
    buildBillingPanel();
    buildDashboardBillingPanel();

    setTimeout(() => {
      patchPaymentEngine();
      fetchSubscription();
      fetchPayments();
    }, 1200);

    setInterval(() => {
      patchPaymentEngine();
    }, 3000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
