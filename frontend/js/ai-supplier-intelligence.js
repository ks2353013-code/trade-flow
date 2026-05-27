/* TradeFlow AI Supplier Intelligence */

(function () {
  if (window.TradeFlowAISupplierIntelligence) return;

  function calculateSupplierScore(card) {
    const text = card.innerText || "";

    let score = 70;

    if (/verified|certified|iso|fssai|apeda|trusted/i.test(text)) score += 20;
    if (/high|premium|export|manufacturer/i.test(text)) score += 10;
    if (/not available|missing|unknown|pending/i.test(text)) score -= 20;
    if (/risk|delay|unverified|low/i.test(text)) score -= 25;

    return Math.max(5, Math.min(100, score));
  }

  function riskLabel(score) {
    if (score >= 80) {
      return "🟢 Trusted Supplier";
    }

    if (score >= 55) {
      return "🟡 Medium Risk";
    }

    return "🔴 Needs Verification";
  }

  function recommendation(score) {
    if (score >= 80) {
      return "Recommended for outreach and negotiation.";
    }

    if (score >= 55) {
      return "Verify documents before bulk order.";
    }

    return "Do not proceed before full verification.";
  }

  function enhanceSuppliers() {
    const supplierPage =
      document.getElementById("suppliersPage") ||
      document.getElementById("supplierPage");

    if (!supplierPage) return;

    const cards = supplierPage.querySelectorAll(
      ".supplier-card, .deal, .lead-card, .record-card"
    );

    cards.forEach((card) => {
      if (card.dataset.aiSupplierEnhanced === "true") return;

      const score = calculateSupplierScore(card);

      const badge = document.createElement("div");
      badge.className = "ai-supplier-badge";
      badge.style.marginTop = "10px";
      badge.innerHTML = `
        <div style="
          padding:10px;
          border-radius:14px;
          background:rgba(34,197,94,.10);
          border:1px solid rgba(34,197,94,.22);
          color:#dcfce7;
          font-size:13px;
          line-height:1.6;
        ">
          🤖 <b>AI Supplier Score:</b> ${score}%<br>
          ${riskLabel(score)}<br>
          ⚡ <b>Recommendation:</b> ${recommendation(score)}
        </div>
      `;

      card.appendChild(badge);
      card.dataset.aiSupplierEnhanced = "true";
    });
  }

  function boot() {
    document.addEventListener("tradeflow:page-change", function (event) {
      const page = event.detail?.page || "";

      if (
        page === "suppliers" ||
        page === "supplier"
      ) {
        setTimeout(enhanceSuppliers, 500);
        setTimeout(enhanceSuppliers, 1500);
      }
    });

    setInterval(enhanceSuppliers, 5000);

    console.log("✅ AI Supplier Intelligence active");
  }

  window.TradeFlowAISupplierIntelligence = {
    enhanceSuppliers
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();