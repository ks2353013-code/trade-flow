/* TradeFlow Real Supplier Discovery — CRM + Outreach Upgrade */

(function () {
  const BACKEND_URL =
    typeof window.BACKEND_URL !== "undefined"
      ? window.BACKEND_URL
      : "https://trade-flow-lc1k.onrender.com";

  function $(id) {
    return document.getElementById(id);
  }

  function toast(message) {
    if (
      window.TradeFlowPremiumUX &&
      typeof window.TradeFlowPremiumUX.toast === "function"
    ) {
      window.TradeFlowPremiumUX.toast(message, "success");
      return;
    }

    alert(message);
  }

  function getResults() {
    try {
      return JSON.parse(
        localStorage.getItem("tradeflowRealSupplierResults") || "[]"
      );
    } catch {
      return [];
    }
  }

  function setResults(results) {
    localStorage.setItem(
      "tradeflowRealSupplierResults",
      JSON.stringify(results || [])
    );
  }

  async function searchSuppliers() {
    const product =
      prompt("Enter product name, e.g. rice, jaggery, medicine") || "";

    if (!product.trim()) return;

    const country =
      prompt("Enter country, e.g. India, UAE, USA") || "";

    try {
      toast("Searching live suppliers...");

      const res = await fetch(
        `${BACKEND_URL}/api/real-supplier-discovery/search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            product,
            country
          })
        }
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Supplier discovery failed");
      }

      setResults(data.suppliers || []);
      renderResults();

      toast(`${data.total || data.suppliers.length} suppliers discovered.`);
    } catch (error) {
      console.error("Real supplier discovery error:", error);
      alert(error.message || "Supplier discovery failed.");
    }
  }

  function saveSupplier(item) {
    let suppliers = [];

    try {
      suppliers = JSON.parse(localStorage.getItem("suppliers") || "[]");
    } catch {
      suppliers = [];
    }

    suppliers.unshift({
      id: Date.now(),
      supplierName: item.supplierName || item.companyName || "Supplier",
      name: item.supplierName || item.companyName || "Supplier",
      product: item.product || "General Trade",
      country: item.country || "Global",
      website: item.website || "",
      email: item.email || "Not Available",
      phone: item.phone || "Not Available",
      source: item.source || "Real Supplier Discovery",
      notes: item.notes || "",
      score: item.score || 75,
      status: item.status || "Discovered Lead"
    });

    localStorage.setItem("suppliers", JSON.stringify(suppliers));

    toast("Supplier saved to workspace.");
  }

  function addToCRM(item) {
    let deals = [];

    try {
      deals = JSON.parse(localStorage.getItem("tradeflowDiscoveredDeals") || "[]");
    } catch {
      deals = [];
    }

    deals.unshift({
      id: Date.now(),
      companyName: item.supplierName || "Supplier Lead",
      contactPerson: "Sales Team",
      email: item.email || "Not Available",
      phone: item.phone || "Not Available",
      product: item.product || "General Trade",
      country: item.country || "Global",
      value: 0,
      stage: "New Lead",
      priority: item.score >= 80 ? "High" : "Medium",
      notes: item.notes || "",
      source: "Real Supplier Discovery"
    });

    localStorage.setItem("tradeflowDiscoveredDeals", JSON.stringify(deals));

    toast("Supplier added to CRM lead queue.");
  }

  function generateOutreach(item) {
    const message = `Hello,

I hope you are doing well.

We found your company while researching reliable suppliers/exporters for ${item.product || "our product requirement"} in ${item.country || "your market"}.

We would like to discuss pricing, MOQ, catalogue, certifications, packaging details, payment terms, and export/import timelines.

Please share your latest quotation and product details.

Regards,
TradeFlow Team`;

    localStorage.setItem("tradeflowGeneratedOutreach", message);

    if ($("emailSubject")) {
      $("emailSubject").value =
        `Business Inquiry for ${item.product || "Product Supply"}`;
    }

    if ($("emailMessage")) {
      $("emailMessage").value = message;
    }

    if ($("outreachMessage")) {
      $("outreachMessage").value = message;
    }

    if ($("emailTo") && item.email && item.email !== "Not Available") {
      $("emailTo").value = item.email;
    }

    toast("Outreach message generated.");
  }

  function openEmail(item) {
    const email = item.email;

    if (!email || email === "Not Available") {
      alert("No verified email available for this supplier.");
      return;
    }

    const subject = encodeURIComponent(
      `Business Inquiry for ${item.product || "Product Supply"}`
    );

    const body = encodeURIComponent(
      localStorage.getItem("tradeflowGeneratedOutreach") ||
        `Hello,\n\nWe are interested in your products and would like to discuss pricing, MOQ, catalogue, and export terms.\n\nRegards,\nTradeFlow Team`
    );

    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  function openWhatsApp(item) {
    const phone = String(item.phone || "").replace(/\D/g, "");

    if (!phone || phone === "0") {
      alert("No WhatsApp phone number available for this supplier.");
      return;
    }

    const text = encodeURIComponent(
      localStorage.getItem("tradeflowGeneratedOutreach") ||
        `Hello, we are interested in your products. Please share pricing, MOQ, catalogue, and export terms.`
    );

    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
  }

  function safeText(value) {
    return String(value || "N/A")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderResults() {
    const panel = $("realSupplierDiscoveryPanel");

    if (!panel) return;

    const results = getResults();

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;">
        <div>
          <div class="section-title">🌍 Real Supplier Discovery</div>
          <p class="muted">
            Search live suppliers, enrich emails, score leads, save them, and move them into CRM/outreach.
          </p>
        </div>

        <button class="btn" onclick="TradeFlowRealSupplierDiscovery.search()">
          Search Suppliers
        </button>
      </div>

      <div style="display:grid;gap:14px;margin-top:18px;">
        ${
          results.length
            ? results
                .map((item, index) => {
                  const payload = encodeURIComponent(JSON.stringify(item));

                  return `
                    <div class="supplier-card">
                      <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
                        <div>
                          <h2 style="color:white;margin:0;">
                            ${safeText(item.supplierName)}
                          </h2>
                          <p class="muted">${safeText(item.website)}</p>
                        </div>

                        <span class="status">
                          Score ${safeText(item.score)}
                        </span>
                      </div>

                      <p class="muted"><b>Product:</b> ${safeText(item.product)}</p>
                      <p class="muted"><b>Country:</b> ${safeText(item.country)}</p>
                      <p class="muted"><b>Email:</b> ${safeText(item.email)}</p>
                      <p class="muted"><b>Phone:</b> ${safeText(item.phone)}</p>
                      <p class="muted"><b>Source:</b> ${safeText(item.source)}</p>
                      <p class="muted">${safeText(item.notes)}</p>

                      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;">
                        <button class="btn" onclick="TradeFlowRealSupplierDiscovery.saveFromPayload('${payload}')">
                          Save Supplier
                        </button>

                        <button class="btn" onclick="TradeFlowRealSupplierDiscovery.crmFromPayload('${payload}')">
                          Add to CRM
                        </button>

                        <button class="btn" onclick="TradeFlowRealSupplierDiscovery.outreachFromPayload('${payload}')">
                          Generate Outreach
                        </button>

                        <button class="mini-btn" onclick="TradeFlowRealSupplierDiscovery.emailFromPayload('${payload}')">
                          Email
                        </button>

                        <button class="mini-btn" onclick="TradeFlowRealSupplierDiscovery.whatsappFromPayload('${payload}')">
                          WhatsApp
                        </button>

                        ${
                          item.website
                            ? `<button class="mini-btn" onclick="window.open('${safeText(item.website)}','_blank')">Website</button>`
                            : ""
                        }
                      </div>
                    </div>
                  `;
                })
                .join("")
            : `
              <div class="tf-empty-state">
                <h3>No supplier searches yet</h3>
                <p>Click Search Suppliers to discover live supplier leads.</p>
              </div>
            `
        }
      </div>
    `;
  }

  function fromPayload(payload) {
    try {
      return JSON.parse(decodeURIComponent(payload));
    } catch {
      return null;
    }
  }

  function buildPanel() {
    const dashboard = $("dashboardPage");

    if (!dashboard || $("realSupplierDiscoveryPanel")) return;

    const panel = document.createElement("div");
    panel.id = "realSupplierDiscoveryPanel";
    panel.className = "card ai-panel";
    panel.style.marginBottom = "18px";

    dashboard.appendChild(panel);
  }

  function boot() {
    buildPanel();
    setTimeout(renderResults, 800);
  }

  window.TradeFlowRealSupplierDiscovery = {
    search: searchSuppliers,
    render: renderResults,
    save: saveSupplier,
    crm: addToCRM,
    outreach: generateOutreach,
    email: openEmail,
    whatsapp: openWhatsApp,

    saveFromPayload(payload) {
      const item = fromPayload(payload);
      if (item) saveSupplier(item);
    },

    crmFromPayload(payload) {
      const item = fromPayload(payload);
      if (item) addToCRM(item);
    },

    outreachFromPayload(payload) {
      const item = fromPayload(payload);
      if (item) generateOutreach(item);
    },

    emailFromPayload(payload) {
      const item = fromPayload(payload);
      if (item) openEmail(item);
    },

    whatsappFromPayload(payload) {
      const item = fromPayload(payload);
      if (item) openWhatsApp(item);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();