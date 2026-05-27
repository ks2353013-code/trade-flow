/* TradeFlow Hunter Intelligence UI */

(function () {
  if (window.TradeFlowHunterIntelligenceUI) return;

  function getEmail() {
    return (
      localStorage.getItem("userEmail") ||
      localStorage.getItem("tradeflowUserEmail") ||
      localStorage.getItem("email") ||
      "ks2353013@gmail.com"
    );
  }

  async function domainSearch(domain) {
    const res = await fetch(`/api/hunter/domain-search?domain=${encodeURIComponent(domain)}`, {
      headers: {
        "x-user-email": getEmail()
      }
    });

    return await res.json();
  }

  async function verifyEmail(email) {
    const res = await fetch(`/api/hunter/verify-email?email=${encodeURIComponent(email)}`, {
      headers: {
        "x-user-email": getEmail()
      }
    });

    return await res.json();
  }

  async function enrichSupplier(supplierId) {
    const res = await fetch(`/api/ai-lead-enrichment/enrich-supplier/${supplierId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": getEmail()
      },
      body: JSON.stringify({})
    });

    const data = await res.json();

    alert(
      data.success
        ? `AI Lead Enrichment Completed\nEmail: ${data.bestEmail || "Not found"}\nScore: ${data.score || 0}%`
        : data.message || "Lead enrichment failed"
    );

    if (window.fetchSuppliers) window.fetchSuppliers();
    if (window.fetchDeals) window.fetchDeals();
    if (window.fetchOutreachRecords) window.fetchOutreachRecords();

    return data;
  }

  function createPanel() {
    if (document.getElementById("hunterIntelligencePanel")) return;

    const supplierPage =
      document.getElementById("suppliersPage") ||
      document.getElementById("supplierPage") ||
      document.getElementById("aiPage");

    if (!supplierPage) return;

    const panel = document.createElement("div");
    panel.id = "hunterIntelligencePanel";
    panel.className = "card ai-panel";
    panel.style.marginTop = "20px";

    panel.innerHTML = `
      <div class="section-title">🎯 Hunter Lead Intelligence</div>
      <p class="muted">
        Find verified business emails, enrich supplier leads, verify contacts, and prepare outreach using Hunter.
      </p>

      <div class="grid grid-2" style="margin-top:16px;">
        <div class="card">
          <div class="section-title">🌐 Domain Search</div>
          <input id="hunterDomainInput" placeholder="example.com">
          <button class="btn" onclick="TradeFlowHunterIntelligenceUI.runDomainSearch()">
            Find Emails
          </button>
          <div id="hunterDomainResult" style="margin-top:12px;"></div>
        </div>

        <div class="card">
          <div class="section-title">✅ Verify Email</div>
          <input id="hunterVerifyEmailInput" placeholder="person@company.com">
          <button class="btn" onclick="TradeFlowHunterIntelligenceUI.runVerifyEmail()">
            Verify Email
          </button>
          <div id="hunterVerifyResult" style="margin-top:12px;"></div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <div class="section-title">🤖 AI Supplier Enrichment</div>
        <p class="muted">
          Enter a Supplier MongoDB ID to run: Supplier → Hunter → Email → Outreach Draft → CRM Deal → Notification.
        </p>
        <input id="hunterSupplierIdInput" placeholder="Supplier ID">
        <button class="btn" onclick="TradeFlowHunterIntelligenceUI.runSupplierEnrichment()">
          Run AI Lead Enrichment
        </button>
        <div id="hunterEnrichmentResult" style="margin-top:12px;"></div>
      </div>
    `;

    supplierPage.appendChild(panel);
  }

  async function runDomainSearch() {
    const domain = document.getElementById("hunterDomainInput")?.value || "";
    const box = document.getElementById("hunterDomainResult");

    if (!domain) {
      alert("Enter a domain first.");
      return;
    }

    box.innerHTML = `<div class="deal">Searching Hunter...</div>`;

    const data = await domainSearch(domain);

    if (!data.success) {
      box.innerHTML = `<div class="deal">${data.message || "Hunter search failed"}</div>`;
      return;
    }

    const emails = data.data?.data?.emails || [];

    box.innerHTML = emails.length
      ? emails.slice(0, 8).map((e) => `
          <div class="deal">
            <b>${e.value || e.email}</b><br>
            Confidence: ${e.confidence || e.score || 0}%<br>
            Type: ${e.type || "unknown"}
          </div>
        `).join("")
      : `<div class="deal">No emails found for ${domain}.</div>`;
  }

  async function runVerifyEmail() {
    const email = document.getElementById("hunterVerifyEmailInput")?.value || "";
    const box = document.getElementById("hunterVerifyResult");

    if (!email) {
      alert("Enter email first.");
      return;
    }

    box.innerHTML = `<div class="deal">Verifying email...</div>`;

    const data = await verifyEmail(email);

    if (!data.success) {
      box.innerHTML = `<div class="deal">${data.message || "Verification failed"}</div>`;
      return;
    }

    const result = data.data?.data || {};

    box.innerHTML = `
      <div class="deal">
        <b>${result.email || email}</b><br>
        Status: ${result.status || "unknown"}<br>
        Score: ${result.score || 0}<br>
        Disposable: ${result.disposable ? "Yes" : "No"}<br>
        SMTP Check: ${result.smtp_check ? "Pass" : "Fail"}
      </div>
    `;
  }

  async function runSupplierEnrichment() {
    const supplierId = document.getElementById("hunterSupplierIdInput")?.value || "";
    const box = document.getElementById("hunterEnrichmentResult");

    if (!supplierId) {
      alert("Enter Supplier ID first.");
      return;
    }

    box.innerHTML = `<div class="deal">Running AI lead enrichment...</div>`;

    const data = await enrichSupplier(supplierId);

    box.innerHTML = data.success
      ? `
        <div class="deal">
          <b>Enrichment Completed</b><br>
          Best Email: ${data.bestEmail || "Not found"}<br>
          Lead Score: ${data.score || 0}%<br>
          Outreach Created: ${data.outreach ? "Yes" : "No"}<br>
          CRM Deal Created: ${data.deal ? "Yes" : "No"}
        </div>
      `
      : `<div class="deal">${data.message || "Enrichment failed"}</div>`;
  }

  function boot() {
    document.addEventListener("tradeflow:page-change", function (event) {
      const page = event.detail?.page || "";

      if (
        page === "suppliers" ||
        page === "supplier" ||
        page === "ai"
      ) {
        setTimeout(createPanel, 600);
      }
    });

    setTimeout(createPanel, 1600);

    console.log("✅ Hunter Intelligence UI active");
  }

  window.TradeFlowHunterIntelligenceUI = {
    domainSearch,
    verifyEmail,
    enrichSupplier,
    runDomainSearch,
    runVerifyEmail,
    runSupplierEnrichment
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();