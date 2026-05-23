/* TradeFlow Supplier Intelligence Upgrade */

(function () {
  function scoreSupplier(supplier) {
    let score = Number(supplier.score || 60);

    if (supplier.email) score += 8;
    if (supplier.phone) score += 8;
    if (supplier.country) score += 6;
    if (supplier.notes && supplier.notes.length > 20) score += 6;
    if ((supplier.source || "").toLowerCase().includes("ai")) score += 5;

    return Math.min(score, 98);
  }

  function getTemperature(score) {
    if (score >= 85) return "🔥 Hot Lead";
    if (score >= 70) return "🟡 Warm Lead";
    return "❄️ Cold Lead";
  }

  function getRisk(score) {
    if (score >= 85) return "🟢 Low Risk";
    if (score >= 70) return "🟡 Medium Risk";
    return "🔴 High Risk";
  }

  function buildSupplierInsight(supplier) {
    const score = scoreSupplier(supplier);
    return {
      score,
      temperature: getTemperature(score),
      risk: getRisk(score),
      action:
        score >= 85
          ? "Move to CRM and start negotiation."
          : score >= 70
          ? "Send outreach and verify documents."
          : "Research before contacting."
    };
  }

  window.TradeFlowSupplierIntel = {
    buildSupplierInsight,

    openEmail(email, supplierName, product) {
      if (!email) {
        alert("Supplier email missing.");
        return;
      }

      const subject = encodeURIComponent(`Business Inquiry for ${product || "your product"}`);
      const body = encodeURIComponent(
`Hello ${supplierName || ""},

We found your company through TradeFlow Supplier Intelligence.

Please share your latest catalogue, pricing, MOQ, packaging details, certifications, payment terms, and export timeline.

Regards,
TradeFlow Workspace`
      );

      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    },

    openWhatsApp(phone, supplierName, product) {
      const clean = (phone || "").replace(/\D/g, "");

      if (!clean) {
        alert("Supplier WhatsApp number missing.");
        return;
      }

      const message = encodeURIComponent(
`Hello ${supplierName || ""},

We found your company through TradeFlow Supplier Intelligence.

We are interested in ${product || "your product"}. Please share catalogue, MOQ, pricing, packaging details, certifications, and export timeline.

Regards,
TradeFlow Team`
      );

      window.open(`https://wa.me/${clean}?text=${message}`, "_blank");
    }
  };

  const oldRenderSuppliers = window.renderSuppliers;

  window.renderSupplierIntelCard = function (supplier) {
    const insight = buildSupplierInsight(supplier);

    return `
      <div class="supplier-card">
        <h2 style="font-size:20px;font-weight:900;color:white;">
          ${supplier.supplierName || "Unnamed Supplier"}
        </h2>

        <p class="muted">Product: ${supplier.product || "N/A"}</p>
        <p class="muted">Country: ${supplier.country || "N/A"}</p>
        <p class="muted">Email: ${supplier.email || "N/A"}</p>
        <p class="muted">Phone: ${supplier.phone || "N/A"}</p>
        <p class="muted">Source: ${supplier.source || "Manual Entry"}</p>
        <p class="muted">Notes: ${supplier.notes || "No notes"}</p>

        <div class="deal">
          <b>AI Supplier Intelligence</b><br>
          Score: ${insight.score}/100<br>
          Temperature: ${insight.temperature}<br>
          Risk: ${insight.risk}<br>
          Recommended Action: ${insight.action}
        </div>

        <span class="status">
          ${insight.temperature} • ${insight.risk}
        </span>

        <button class="mini-btn" onclick="TradeFlowSupplierIntel.openEmail('${supplier.email || ""}', '${(supplier.supplierName || "").replace(/'/g, "\\'")}', '${(supplier.product || "").replace(/'/g, "\\'")}')">
          📧 AI Email Outreach
        </button>

        <button class="mini-btn" onclick="TradeFlowSupplierIntel.openWhatsApp('${supplier.phone || ""}', '${(supplier.supplierName || "").replace(/'/g, "\\'")}', '${(supplier.product || "").replace(/'/g, "\\'")}')">
          📱 AI WhatsApp Outreach
        </button>

        <button class="mini-btn" onclick="showPage('crm')">
          📈 Move Toward CRM
        </button>

        <button class="danger-btn" onclick="deleteSupplier('${supplier._id}')">
          Delete
        </button>
      </div>
    `;
  };

  window.enhanceSupplierList = function () {
    const cards = document.querySelectorAll("#supplierList .supplier-card");
    cards.forEach(card => {
      if (card.dataset.intelEnhanced) return;
      card.dataset.intelEnhanced = "true";
      card.style.borderColor = "rgba(56,189,248,.28)";
    });
  };

  setInterval(() => {
    const supplierPage = document.getElementById("suppliersPage");
    if (supplierPage && !supplierPage.classList.contains("hidden")) {
      enhanceSupplierList();
    }
  }, 1200);
})();