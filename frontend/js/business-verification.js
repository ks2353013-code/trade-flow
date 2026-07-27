(function () {
  const form = document.getElementById("verificationForm");
  const documentForm = document.getElementById("documentForm");
  let current = null;
  let requirements = [];

  function text(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  async function jsonFetch(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.message || "Request failed"), { data, status: response.status });
    return data;
  }

  function setMessage(message, failed = false) {
    const target = document.getElementById("message");
    target.textContent = message || "";
    target.style.color = failed ? "#ff8c88" : "#43d6a5";
  }

  function fillForm(verification) {
    if (!verification) return;
    for (const [key, value] of Object.entries(verification)) {
      const input = form.elements[key];
      if (!input) continue;
      if (input.type === "checkbox") input.checked = value === true;
      else if (Array.isArray(value)) input.value = value.join(", ");
      else if (!key.endsWith("Masked")) input.value = value || "";
    }
  }

  function render(data) {
    current = data.verification;
    requirements = data.requiredDocuments || requirements;
    const status = current?.verificationStatus || data.status || "Not Started";
    document.getElementById("status").textContent = status;
    const missing = data.missingRequirements || [];
    const completed = requirements.length ? Math.round(((requirements.length - missing.filter((item) => requirements.includes(item)).length) / requirements.length) * 100) : 0;
    document.getElementById("progress").value = Math.max(0, completed);
    document.getElementById("missing").textContent = missing.length ? `Missing: ${missing.join(", ")}` : current ? "Required evidence checklist complete." : "Save a draft to begin.";
    document.getElementById("documentType").innerHTML = requirements.map((item) => `<option>${text(item)}</option>`).join("");
    document.getElementById("documents").innerHTML = (current?.documents || []).map((doc) => `<div class="doc"><span><strong>${text(doc.type)}</strong><br><span class="muted">${text(doc.originalName)} · ${Math.ceil(doc.size / 1024)} KB · ${text(doc.scanStatus)}</span></span><button class="danger" type="button" data-remove="${text(doc._id)}">Remove</button></div>`).join("") || '<p class="muted">No documents uploaded.</p>';
    document.getElementById("history").innerHTML = (current?.reviewHistory || []).map((event) => `<p><strong>${text(event.newStatus)}</strong> · ${new Date(event.createdAt).toLocaleString()}${event.reason ? `<br>${text(event.reason)}` : ""}</p>`).join("") || "No review events yet.";
    const locked = Boolean(current) && status !== "Draft";
    [...form.elements].forEach((input) => {
      if (input.tagName !== "BUTTON") input.disabled = locked;
    });
    documentForm.querySelectorAll("input,select,button").forEach((input) => input.disabled = locked || !current);
    document.getElementById("submitReview").disabled = locked || !current;
    const canResubmit = ["More Information Required", "Rejected", "Verified"].includes(status);
    document.getElementById("resubmit").classList.toggle("hidden", !canResubmit);
    document.getElementById("resubmit").textContent = status === "Verified" ? "Update verified details" : "Start resubmission";
    fillForm(current);
  }

  async function load() {
    const data = await jsonFetch("/api/business-verification/me");
    if (data.verification?.verificationCategory) {
      const req = await jsonFetch(`/api/business-verification/requirements?category=${encodeURIComponent(data.verification.verificationCategory)}`);
      data.requiredDocuments = req.requiredDocuments;
    }
    render(data);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(form));
    raw.representativeAuthorityDeclaration = form.elements.representativeAuthorityDeclaration.checked;
    for (const field of ["operatingMarkets", "exportProducts", "importProducts"]) raw[field] = raw[field].split(",").map((item) => item.trim()).filter(Boolean);
    try {
      const data = await jsonFetch("/api/business-verification/me", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(raw)
      });
      setMessage("Draft saved securely.");
      await load();
    } catch (error) {
      setMessage(error.data?.errors?.join(". ") || error.message, true);
    }
  });

  documentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await jsonFetch("/api/business-verification/me/documents", { method: "POST", body: new FormData(documentForm) });
      setMessage("Document uploaded privately.");
      documentForm.reset();
      await load();
    } catch (error) { setMessage(error.message, true); }
  });

  document.getElementById("documents").addEventListener("click", async (event) => {
    const id = event.target.dataset.remove;
    if (!id || !confirm("Remove this verification document?")) return;
    try {
      await jsonFetch(`/api/business-verification/me/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
    } catch (error) { setMessage(error.message, true); }
  });

  document.getElementById("submitReview").addEventListener("click", async () => {
    if (!confirm("Submit this verification version for Master Admin review? Submitted fields and documents will be locked.")) return;
    try {
      await jsonFetch("/api/business-verification/me/submit", { method: "POST" });
      setMessage("Application submitted for review.");
      await load();
    } catch (error) {
      setMessage(error.data?.missingRequirements?.join(", ") || error.message, true);
    }
  });

  document.getElementById("resubmit").addEventListener("click", async () => {
    try {
      await jsonFetch("/api/business-verification/me/resubmit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resubmissionNotes: form.elements.resubmissionNotes.value })
      });
      await load();
    } catch (error) { setMessage(error.message, true); }
  });

  (async () => {
    const authenticated = await window.TradeFlowSessionManager.restoreSession();
    if (!authenticated) {
      location.replace("/login?next=/business-verification.html");
      return;
    }
    document.getElementById("app").classList.remove("hidden");
    try { await load(); } catch (error) { setMessage(error.message, true); }
  })();
})();
