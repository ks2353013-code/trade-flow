/* TradeFlow Master Enterprise Approval Engine */

(function () {
  if (window.TradeFlowMasterEnterpriseApproval) return;

  const MASTER_EMAIL = "ks2353013@gmail.com";

  function getUserEmail() {
    return (
      localStorage.getItem("userEmail") ||
      localStorage.getItem("tradeflowUserEmail") ||
      localStorage.getItem("email") ||
      ""
    ).toLowerCase();
  }

  function isMasterAdmin() {
    return getUserEmail() === MASTER_EMAIL;
  }

  function getContainer() {
    let box = document.getElementById("enterpriseApprovalPanel");

    if (!box) {
      const masterPage = document.getElementById("masterPage");
      if (!masterPage) return null;

      box = document.createElement("div");
      box.id = "enterpriseApprovalPanel";
      box.className = "card";
      box.innerHTML = `
        <div class="section-title">👑 Enterprise AI OS Approval Queue</div>
        <p class="muted">
          Review paid Enterprise AI OS requests. Enterprise features unlock only after Master Admin approval.
        </p>
        <div id="enterpriseApprovalList"></div>
      `;

      masterPage.appendChild(box);
    }

    return document.getElementById("enterpriseApprovalList");
  }

  async function fetchPendingEnterprise() {
    if (!isMasterAdmin()) return;

    const list = getContainer();
    if (!list) return;

    list.innerHTML = `<div class="deal">Loading Enterprise requests...</div>`;

    try {
      const res = await fetch("/api/subscription/pending-enterprise", {
        headers: {
          "x-user-email": getUserEmail()
        }
      });

      const data = await res.json();

      if (!data.success) {
        list.innerHTML = `<div class="deal">Unable to load requests: ${data.message || "Unknown error"}</div>`;
        return;
      }

      if (!data.pending || data.pending.length === 0) {
        list.innerHTML = `<div class="deal">No pending Enterprise AI OS requests.</div>`;
        return;
      }

      list.innerHTML = data.pending.map((sub) => `
        <div class="deal" style="margin-bottom:14px;">
          <b>${sub.email}</b><br>
          Plan: ${sub.plan}<br>
          Price: ₹${sub.price}<br>
          Status: ${sub.status}<br>
          Approval: ${sub.approvalStatus}<br>
          Requested: ${new Date(sub.createdAt).toLocaleString()}

          <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
            <button class="btn" onclick="TradeFlowMasterEnterpriseApproval.approve('${sub._id}')">
              Approve Enterprise
            </button>

            <button class="danger-btn" onclick="TradeFlowMasterEnterpriseApproval.reject('${sub._id}')">
              Reject
            </button>
          </div>
        </div>
      `).join("");
    } catch (error) {
      list.innerHTML = `<div class="deal">Failed to fetch Enterprise requests.</div>`;
    }
  }

  async function approve(subscriptionId) {
    if (!confirm("Approve this Enterprise AI OS subscription?")) return;

    const res = await fetch("/api/subscription/approve-enterprise", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": getUserEmail()
      },
      body: JSON.stringify({ subscriptionId })
    });

    const data = await res.json();

    alert(data.message || "Approval completed.");

    fetchPendingEnterprise();
  }

  async function reject(subscriptionId) {
    if (!confirm("Reject this Enterprise AI OS subscription?")) return;

    const res = await fetch("/api/subscription/reject-enterprise", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": getUserEmail()
      },
      body: JSON.stringify({ subscriptionId })
    });

    const data = await res.json();

    alert(data.message || "Request rejected.");

    fetchPendingEnterprise();
  }

  function boot() {
    document.addEventListener("tradeflow:page-change", function (event) {
      const page = event.detail?.page || "";

      if (page === "master") {
        fetchPendingEnterprise();
      }
    });

    setTimeout(() => {
      const masterPage = document.getElementById("masterPage");
      if (masterPage && !masterPage.classList.contains("hidden")) {
        fetchPendingEnterprise();
      }
    }, 1200);

    console.log("✅ Master Enterprise Approval Engine active");
  }

  window.TradeFlowMasterEnterpriseApproval = {
    fetchPendingEnterprise,
    approve,
    reject
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();