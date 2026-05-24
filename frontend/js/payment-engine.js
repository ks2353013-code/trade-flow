/* TradeFlow Razorpay Payment Engine */

(function () {
  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") return BACKEND_URL;
    return "https://trade-flow-lc1k.onrender.com";
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

  async function startPayment(plan) {
    if (!["Pro", "Enterprise"].includes(plan)) {
      alert("Please select Pro or Enterprise plan.");
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
      body: JSON.stringify({ plan })
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

      handler: async function (response) {
        const verifyRes = await fetch(`${getBackendUrl()}/api/payment/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...response,
            plan
          })
        });

        const verifyData = await verifyRes.json();

        if (!verifyRes.ok || !verifyData.success) {
          alert(verifyData.message || "Payment verification failed.");
          return;
        }

        localStorage.setItem("tradeflowSubscriptionPlan", plan);
        localStorage.setItem("tradeflowPaymentId", verifyData.paymentId);

        if (window.TradeFlowSubscriptionEngine) {
          TradeFlowSubscriptionEngine.setPlan(plan);
          TradeFlowSubscriptionEngine.render();
        }

        alert(`Payment successful. ${plan} plan activated.`);
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

    if (!modal || modal.dataset.paymentButtonsAdded) return;

    modal.dataset.paymentButtonsAdded = "true";

    setTimeout(() => {
      const cards = modal.querySelectorAll(".plan-card");

      cards.forEach((card) => {
        const title = card.querySelector("h2")?.innerText?.trim();

        if (title === "Pro" || title === "Enterprise") {
          const payBtn = document.createElement("button");
          payBtn.className = "btn";
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

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  window.TradeFlowPaymentEngine = {
    startPayment
  };
})();