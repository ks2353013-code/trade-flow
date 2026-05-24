/* TradeFlow Razorpay Payment Engine + Billing Auto Sync */

(function () {
  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") return BACKEND_URL;
    return "https://trade-flow-lc1k.onrender.com";
  }

  function getUser() {
    try {
      if (typeof window.getUser === "function") return window.getUser();
    } catch {}

    try {
      return JSON.parse(localStorage.getItem("tradeflowUser") || "{}");
    } catch {
      return {};
    }
  }

  function getUserEmail() {
    const user = getUser();
    return (user.email || localStorage.getItem("tradeflowUserEmail") || "").toLowerCase();
  }

  function loadRazorpayScript() {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  function showMessage(message) {
    if (window.TradeFlowPremiumUX && typeof window.TradeFlowPremiumUX.toast === "function") {
      window.TradeFlowPremiumUX.toast(message);
      return;
    }
    alert(message.replace(/<[^>]*>/g, ""));
  }

  async function refreshBillingAfterPayment() {
    if (window.TradeFlowBillingEngine) {
      if (typeof window.TradeFlowBillingEngine.fetchSubscription === "function") {
        await window.TradeFlowBillingEngine.fetchSubscription();
      }

      if (typeof window.TradeFlowBillingEngine.fetchPayments === "function") {
        await window.TradeFlowBillingEngine.fetchPayments();
      }

      if (typeof window.TradeFlowBillingEngine.render === "function") {
        window.TradeFlowBillingEngine.render();
      }
    }

    if (window.TradeFlowSubscriptionEngine && typeof window.TradeFlowSubscriptionEngine.render === "function") {
      window.TradeFlowSubscriptionEngine.render();
    }

    if (window.TradeFlowAccessControl && typeof window.TradeFlowAccessControl.updateNavLocks === "function") {
      window.TradeFlowAccessControl.updateNavLocks();
    }
  }

  async function startPayment(plan) {
    if (!["Pro", "Enterprise"].includes(plan)) {
      alert("Please select Pro or Enterprise plan.");
      return;
    }

    const email = getUserEmail();

    if (!email) {
      alert("Please login first before upgrading.");
      return;
    }

    const loaded = await loadRazorpayScript();

    if (!loaded) {
      alert("Razorpay checkout failed to load.");
      return;
    }

    const res = await fetch(`${getBackendUrl()}/api/payment/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, email })
    });

    const order = await res.json();

    if (!res.ok) {
      alert(order.message || "Could not create payment order.");
      return;
    }

    const options = {
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "TradeFlow AI OS",
      description: `${plan} Subscription`,
      order_id: order.orderId,
      prefill: {
        email
      },

      handler: async function (response) {
        const verifyRes = await fetch(`${getBackendUrl()}/api/payment/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...response,
            plan,
            email,
            amount: order.amount,
            currency: order.currency
          })
        });

        const verifyData = await verifyRes.json();

        if (!verifyRes.ok || !verifyData.success) {
          alert(verifyData.message || "Payment verification failed.");
          return;
        }

        const activePlan =
          verifyData.subscription?.plan ||
          verifyData.plan ||
          plan;

        localStorage.setItem("tradeflowSubscriptionPlan", activePlan);
        localStorage.setItem("tradeflowPaymentId", verifyData.paymentId || response.razorpay_payment_id);
        localStorage.setItem("tradeflowBillingSynced", "yes");

        if (window.TradeFlowSubscriptionEngine) {
          TradeFlowSubscriptionEngine.setPlan(activePlan);
          TradeFlowSubscriptionEngine.render();
        }

        await refreshBillingAfterPayment();

        showMessage(`✅ Payment successful. <b>${activePlan}</b> plan activated and saved in MongoDB.`);
      },

      modal: {
        ondismiss: function () {
          showMessage("Payment window closed.");
        }
      },

      theme: {
        color: "#0ea5e9"
      }
    };

    const paymentObject = new Razorpay(options);
    paymentObject.open();
  }

  function injectPaymentButtons() {
    const modal = document.getElementById("upgradePlanCards");

    if (!modal) return;

    setTimeout(() => {
      const cards = modal.querySelectorAll(".plan-card");

      cards.forEach((card) => {
        const title = card.querySelector("h2")?.innerText?.trim();

        if ((title === "Pro" || title === "Enterprise") && !card.querySelector(".razorpay-pay-btn")) {
          const payBtn = document.createElement("button");
          payBtn.className = "btn razorpay-pay-btn";
          payBtn.style.marginTop = "10px";
          payBtn.innerText = `Pay & Activate ${title}`;
          payBtn.onclick = () => startPayment(title);
          card.appendChild(payBtn);
        }
      });
    }, 300);
  }

  const observer = new MutationObserver(() => {
    injectPaymentButtons();
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  window.TradeFlowPaymentEngine = {
    startPayment
  };
})();
