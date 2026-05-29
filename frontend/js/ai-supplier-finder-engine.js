/* TradeFlow AI Supplier Finder Engine
   Safe fixed version — no HTML corruption
*/

(function () {
  if (window.TradeFlowAISupplierFinderEngine) return;

  function getBackendUrl() {
    return window.location.origin;
  }

  function getToken() {
    return (
      localStorage.getItem("tradeflowToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("authToken") ||
      "local-testing-token"
    );
  }

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`
    };
  }

  function fakeSuppliers(product, country) {
    return [
      {
        supplierName: `${country} Premium ${product} Export Co.`,
        product,
        country,
        email: "sales@example.com",
        phone: "+91-0000000000",
        source: "TradeFlow Local AI Engine",
        notes: "Demo supplier lead. Verify before outreach.",
        score: 84,
        status: "Warm Lead"
      },
      {
        supplierName: `Global ${product} Trade Network`,
        product,
        country,
        email: "trade@example.com",
        phone: "+971-000000000",
        source: "TradeFlow Local AI Engine",
        notes: "Useful for local testing and CRM workflow.",
        score: 78,
        status: "Research Needed"
      },
      {
        supplierName: `${product} Wholesale International`,
        product,
        country,
        email: "contact@example.com",
        phone: "+1-0000000000",
        source: "TradeFlow Local AI Engine",
        notes: "Ask for catalogue, MOQ, certificates and quotation.",
        score: 72,
        status: "New Lead"
      }
    ];
  }

  async function findSuppliers(product, country) {
    try {
      const res = await fetch(`${getBackendUrl()}/api/ai/find-suppliers`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ product, country })
      });

      if (!res.ok) {
        throw new Error("Backend AI supplier finder unavailable");
      }

      const data = await res.json();

      if (Array.isArray(data) && data.length) {
        return data;
      }

      return fakeSuppliers(product, country);
    } catch (error) {
      console.warn("AI supplier finder using local fallback:", error.message);
      return fakeSuppliers(product, country);
    }
  }

  async function saveSupplier(lead) {
    try {
      const res = await fetch(`${getBackendUrl()}/suppliers`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(lead)
      });

      if (!res.ok) {
        throw new Error("Save supplier failed");
      }

      return await res.json();
    } catch (error) {
      console.warn("Supplier save skipped:", error.message);
      return null;
    }
  }

  window.TradeFlowAISupplierFinderEngine = {
    findSuppliers,
    saveSupplier,
    fakeSuppliers
  };

  console.log("✅ AI Supplier Finder Engine fixed and active");
})();