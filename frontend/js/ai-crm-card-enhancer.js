/* TradeFlow AI CRM Card Enhancer */

(function () {
  if (window.TradeFlowAICRMCardEnhancer) return;

  function calculateScore(card) {
    const text = card.innerText || "";

    let score = 50;

    if (/negotiation/i.test(text)) score += 20;
    if (/closed/i.test(text)) score += 30;
    if (/high|hot|urgent/i.test(text)) score += 15;
    if (/lost/i.test(text)) score -= 35;
    if (/follow/i.test(text)) score += 10;

    return Math.max(5, Math.min(100, score));
  }

  function prediction(score) {
    if (score >= 80) return "High Probability";
    if (score >= 55) return "Medium Probability";
    return "Needs Attention";
  }

  function nextAction(score) {
    if (score >= 80) return "Follow up within 24h";
    if (score >= 55) return "Send pricing + catalog";
    return "Review lead quality";
  }

  function enhanceCRM() {
    const crmPage =
      document.getElementById("crmPage") ||
      document.getElementById("dealsPage");

    if (!crmPage) return;

    const cards = crmPage.querySelectorAll(".deal, .crm-card, .pipeline-card");

    cards.forEach((card) => {
      if (card.dataset.aiEnhanced === "true") return;

      const score = calculateScore(card);

      const badge = document.createElement("div");
      badge.className = "ai-crm-badge";
      badge.style.marginTop = "10px";
      badge.innerHTML = `
        <div style="
          padding:10px;
          border-radius:14px;
          background:rgba(56,189,248,.10);
          border:1px solid rgba(56,189,248,.22);
          color:#e0f2fe;
          font-size:13px;
          line-height:1.6;
        ">
          🤖 <b>AI Score:</b> ${score}%<br>
          📈 <b>Prediction:</b> ${prediction(score)}<br>
          ⚡ <b>Next AI Action:</b> ${nextAction(score)}
        </div>
      `;

      card.appendChild(badge);
      card.dataset.aiEnhanced = "true";
    });
  }

  function boot() {
    document.addEventListener("tradeflow:page-change", function (event) {
      const page = event.detail?.page || "";

      if (page === "crm") {
        setTimeout(enhanceCRM, 500);
        setTimeout(enhanceCRM, 1500);
      }
    });

    setInterval(enhanceCRM, 5000);

    console.log("✅ AI CRM Card Enhancer active");
  }

  window.TradeFlowAICRMCardEnhancer = {
    enhanceCRM
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();