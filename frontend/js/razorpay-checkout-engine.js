/* TradeFlow Razorpay Checkout Engine */

(function () {
  if (window.TradeFlowRazorpayCheckout) return;

  function getUserEmail() {
    return (
      localStorage.getItem("userEmail") ||
      localStorage.getItem("tradeflowUserEmail") ||
      localStorage.getItem("email") ||
      "ks2353013@gmail.com"
    );
  }

  function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = resolve;
      script.onerror = reject;

      document.body.appendChild(script);
    });
  }

  async function startCheckout(plan) {
    try {
      await loadRazorpayScript();

      const email = getUserEmail();

      const res = await fetch("/api/razorpay-checkout/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": email
        },
        body: JSON.stringify({
          email,
          plan
        })
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.message || "Unable to create payment order.");
        return;
      }

      const options = {
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "TradeFlow Cloud",
        description: `${plan} Subscription`,
        order_id: data.order.id,

        prefill: {
          email
        },

        theme: {
          color: "#0f172a"
        },

        handler: async function (response) {
          const verifyRes = await fetch("/api/razorpay-checkout/verify-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-email": email
            },
            body: JSON.stringify({
              email,
              plan,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          const verifyData = await verifyRes.json();

          alert(verifyData.message || "Payment processed.");

          if (window.TradeFlowSubscriptionBackendSync?.sync) {
            await window.TradeFlowSubscriptionBackendSync.sync();
          }

          if (window.TradeFlowSubscriptionEngine?.render) {
            window.TradeFlowSubscriptionEngine.render();
          }
        }
      };

      const razorpay = new Razorpay(options);
      razorpay.open();

    } catch (error) {
      console.error("Razorpay checkout failed:", error);
      alert("Payment checkout failed. Check Razorpay setup.");
    }
  }

  function patchSubscriptionButtons() {
    if (window.TradeFlowRazorpayButtonsPatched) return;

    const engine = window.TradeFlowSubscriptionEngine;

    if (!engine || !engine.setPlan) return;

    const originalSetPlan = engine.setPlan;

    engine.setPlan = function (planName) {
      if (planName === "Starter") {
        originalSetPlan(planName);

        if (window.TradeFlowSubscriptionBackendSync?.requestUpgrade) {
          window.TradeFlowSubscriptionBackendSync.requestUpgrade(planName);
        }

        return;
      }

      startCheckout(planName);
    };

    window.TradeFlowRazorpayButtonsPatched = true;

    console.log("✅ Razorpay upgrade buttons connected");
  }

  function boot() {
    setInterval(patchSubscriptionButtons, 1500);
    setTimeout(patchSubscriptionButtons, 1200);

    console.log("✅ Razorpay Checkout Engine active");
  }

  window.TradeFlowRazorpayCheckout = {
    startCheckout,
    patchSubscriptionButtons
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();