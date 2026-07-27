(function () {
  let rows = [];
  let selected = null;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function mount() {
    const main = document.querySelector("main") || document.body;
    const section = document.createElement("section");
    section.className = "card";
    section.id = "businessVerificationReview";
    section.innerHTML = `
      <h2>Business Verification Review Center</h2>
      <p class="muted">Manual company verification. This queue is separate from buyer, supplier and lead verification.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin:15px 0">
        <select id="bvStatusFilter"><option value="">All statuses</option><option>Submitted</option><option>Under Review</option><option>More Information Required</option><option>Verified</option><option>Rejected</option><option>Suspended</option><option>Expired</option></select>
        <select id="bvCategoryFilter"><option value="">All categories</option><option>Exporter</option><option>Importer</option><option>Exporter &amp; Importer</option><option>Trading Company</option><option>Manufacturer</option><option>Supplier</option></select>
        <input id="bvCountryFilter" placeholder="Country">
        <button class="navbtn" id="bvRefresh">Filter</button>
      </div>
      <div id="bvQueue" class="muted">Loading verification queue…</div>
      <div id="bvDetail"></div>`;
    main.appendChild(section);
    document.getElementById("bvRefresh").addEventListener("click", loadQueue);
    document.getElementById("bvQueue").addEventListener("click", (event) => {
      const id = event.target.dataset.review;
      if (id) loadDetail(id);
    });
    document.getElementById("bvDetail").addEventListener("click", handleAction);
  }

  async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
  }

  async function loadQueue() {
    const params = new URLSearchParams();
    const values = {
      verificationStatus: document.getElementById("bvStatusFilter").value,
      verificationCategory: document.getElementById("bvCategoryFilter").value,
      country: document.getElementById("bvCountryFilter").value.trim()
    };
    Object.entries(values).forEach(([key, value]) => value && params.set(key, value));
    try {
      const data = await api(`/api/business-verification/admin?${params}`);
      rows = data.verifications || [];
      document.getElementById("bvQueue").innerHTML = rows.length
        ? rows.map((row) => `<div style="border-top:1px solid #334155;padding:12px 0;display:flex;justify-content:space-between;gap:12px"><span><strong>${escapeHtml(row.legalBusinessName)}</strong><br><span class="muted">${escapeHtml(row.verificationCategory)} · ${escapeHtml(row.country)} · ${escapeHtml(row.verificationStatus)} · v${row.verificationVersion}</span></span><button class="navbtn" data-review="${escapeHtml(row._id)}">Review</button></div>`).join("")
        : "No verification applications match these filters.";
    } catch (error) {
      document.getElementById("bvQueue").textContent = error.message;
    }
  }

  async function loadDetail(id) {
    try {
      const data = await api(`/api/business-verification/admin/${encodeURIComponent(id)}`);
      selected = data.verification;
      const docs = (selected.documents || []).map((doc) => `<button class="navbtn" data-document="${escapeHtml(doc._id)}">${escapeHtml(doc.type)} · ${escapeHtml(doc.scanStatus)}</button>`).join(" ");
      const flags = selected.riskFlags?.length ? selected.riskFlags.map(escapeHtml).join(", ") : "None";
      const history = (selected.reviewHistory || []).map((item) => `<li>${escapeHtml(item.previousStatus)} → ${escapeHtml(item.newStatus)} · ${new Date(item.createdAt).toLocaleString()} ${item.reason ? `· ${escapeHtml(item.reason)}` : ""}</li>`).join("");
      document.getElementById("bvDetail").innerHTML = `
        <hr style="border-color:#334155;margin:24px 0"><h3>${escapeHtml(selected.legalBusinessName)}</h3>
        <p class="muted">${escapeHtml(selected.verificationReferenceId)} · ${escapeHtml(selected.verificationCategory)} · ${escapeHtml(selected.country)} · version ${selected.verificationVersion}</p>
        <p><strong>Identifiers:</strong> PAN ${escapeHtml(selected.panMasked || "not provided")}; GSTIN ${escapeHtml(selected.gstinMasked || "not provided")}; IEC ${escapeHtml(selected.iecMasked || "not provided")}</p>
        <p><strong>Risk flags:</strong> ${flags}</p><p><strong>Missing:</strong> ${escapeHtml((data.missingRequirements || []).join(", ") || "None")}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${docs || '<span class="muted">No documents</span>'}</div>
        <label style="display:block;margin-top:14px">Review reason<textarea id="bvReason" style="width:100%;min-height:70px"></textarea></label>
        <label style="display:block;margin-top:10px">Internal notes<textarea id="bvNotes" style="width:100%;min-height:70px">${escapeHtml(selected.internalNotes || "")}</textarea></label>
        <label style="display:block;margin-top:10px">Checklist (comma separated)<input id="bvChecklist" style="width:100%" placeholder="Legal name matched, activity matched, documents current"></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
          <button class="navbtn" data-action="start">Start review</button><button class="navbtn" data-action="request_information">Request more information</button>
          <button class="navbtn" data-action="verify">Verify</button><button class="navbtn" data-action="reject">Reject</button>
          <button class="navbtn" data-action="suspend">Suspend</button><button class="navbtn" data-action="expire">Revoke / Expire</button>
        </div>
        <h4>Audit history</h4><ul>${history || "<li>No review actions yet.</li>"}</ul>`;
    } catch (error) {
      document.getElementById("bvDetail").textContent = error.message;
    }
  }

  async function handleAction(event) {
    const documentId = event.target.dataset.document;
    if (documentId) {
      const response = await fetch(`/api/business-verification/admin/${encodeURIComponent(selected._id)}/documents/${encodeURIComponent(documentId)}`);
      if (!response.ok) return alert("Document access failed");
      const url = URL.createObjectURL(await response.blob());
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }
    const action = event.target.dataset.action;
    if (!action || !selected) return;
    const destructive = ["verify", "reject", "suspend", "expire"].includes(action);
    if (destructive && !confirm(`Confirm ${action} for this business verification?`)) return;
    const reason = document.getElementById("bvReason").value.trim();
    const internalNotes = document.getElementById("bvNotes").value.trim();
    const checklist = document.getElementById("bvChecklist").value.split(",").map((item) => item.trim()).filter(Boolean);
    try {
      await api(`/api/business-verification/admin/${encodeURIComponent(selected._id)}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason, internalNotes, checklist, confirm: destructive })
      });
      await loadDetail(selected._id);
      await loadQueue();
    } catch (error) { alert(error.message); }
  }

  document.addEventListener("DOMContentLoaded", () => {
    mount();
    const wait = setInterval(() => {
      if (document.body.classList.contains("auth-pending")) return;
      clearInterval(wait);
      if (!document.getElementById("masterAccessDenied")) loadQueue();
    }, 100);
    setTimeout(() => clearInterval(wait), 10000);
  });
})();
