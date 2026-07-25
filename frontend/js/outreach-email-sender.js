/* TradeFlow Outreach Email Draft Helper */

(function () {
  if (window.TradeFlowOutreachEmailSender) return;

  async function sendEmail() {
    const status = document.getElementById("tfOutreachDraftStatus");

    if (status) {
      status.innerText =
        "Direct sending is disabled. Create an Outreach Approval draft and send only after approval.";
    }

    return false;
  }

  function createQuickSendModal() {
    if (document.getElementById("tradeflowQuickEmailModal")) return;

    const modal = document.createElement("div");
    modal.id = "tradeflowQuickEmailModal";
    modal.style.display = "none";
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.background = "rgba(0,0,0,.7)";
    modal.style.zIndex = "99999";
    modal.style.padding = "40px";
    modal.style.overflow = "auto";

    modal.innerHTML = `
      <div style="
        max-width:700px;
        margin:auto;
        background:#0f172a;
        border-radius:20px;
        padding:24px;
        border:1px solid rgba(255,255,255,.1);
      ">
        <h2>Smart Outreach Draft</h2>

        <input
          id="tfEmailTo"
          placeholder="Receiver Email"
          style="width:100%;margin-top:14px;padding:12px;border-radius:12px;"
        >

        <input
          id="tfEmailSubject"
          placeholder="Email Subject"
          style="width:100%;margin-top:14px;padding:12px;border-radius:12px;"
        >

        <textarea
          id="tfEmailMessage"
          placeholder="Outreach message..."
          style="width:100%;margin-top:14px;min-height:220px;padding:12px;border-radius:12px;"
        ></textarea>

        <div style="display:flex;gap:12px;margin-top:18px;">
          <button id="tfSendOutreachBtn" class="btn">Sending Disabled</button>
          <button id="tfCloseOutreachBtn" class="btn secondary">Close</button>
        </div>

        <div
          id="tfOutreachDraftStatus"
          style="margin-top:14px;color:#7dd3fc;font-weight:900;"
        >
          Draft mode only. Human approval is required before email delivery.
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById("tfCloseOutreachBtn").onclick = function () {
      modal.style.display = "none";
    };

    document.getElementById("tfSendOutreachBtn").onclick = function () {
      sendEmail();
    };
  }

  function openModal(prefill = {}) {
    createQuickSendModal();

    const modal = document.getElementById("tradeflowQuickEmailModal");
    modal.style.display = "block";

    document.getElementById("tfEmailTo").value = prefill.to || "";
    document.getElementById("tfEmailSubject").value =
      prefill.subject || "TradeFlow Business Proposal";
    document.getElementById("tfEmailMessage").value =
      prefill.message ||
      `Hello,

We would like to discuss a potential export/import business opportunity with your company.

Please let us know if you are interested in collaboration.

Regards,
TradeFlow`;
  }

  function createFloatingButton() {
    if (document.getElementById("tradeflowFloatingOutreachBtn")) return;

    const btn = document.createElement("button");
    btn.id = "tradeflowFloatingOutreachBtn";
    btn.innerHTML = "Email";
    btn.style.position = "fixed";
    btn.style.right = "22px";
    btn.style.bottom = "22px";
    btn.style.width = "64px";
    btn.style.height = "64px";
    btn.style.borderRadius = "50%";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "14px";
    btn.style.zIndex = "9999";
    btn.style.background = "linear-gradient(135deg,#2563eb,#7c3aed)";
    btn.style.color = "white";
    btn.style.boxShadow = "0 10px 40px rgba(37,99,235,.4)";

    btn.onclick = () => openModal();

    document.body.appendChild(btn);
  }

  function boot() {
    createFloatingButton();
  }

  window.TradeFlowOutreachEmailSender = {
    sendEmail,
    openModal
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
