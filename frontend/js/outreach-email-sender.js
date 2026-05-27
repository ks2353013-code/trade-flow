/* TradeFlow Outreach Email Sender */

(function () {
  if (window.TradeFlowOutreachEmailSender) return;

  function getEmail() {
    return (
      localStorage.getItem("userEmail") ||
      localStorage.getItem("tradeflowUserEmail") ||
      localStorage.getItem("email") ||
      "ks2353013@gmail.com"
    );
  }

  async function sendEmail({
    to,
    subject,
    message,
    outreachId = ""
  }) {

    try {

      const res = await fetch(
        "/api/outreach-email/send",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-user-email":
              getEmail()
          },

          body: JSON.stringify({
            to,
            subject,
            message,
            outreachId
          })
        }
      );

      const data = await res.json();

      if (!data.success) {

        alert(
          data.message ||
          "Failed to send outreach email."
        );

        return false;

      }

      alert(
        "✅ Outreach email sent successfully"
      );

      if (
        window.TradeFlowRealtimeClient
          ?.emitActivity
      ) {

        window
          .TradeFlowRealtimeClient
          .emitActivity(
            "outreach",
            `Outreach email sent to ${to}`
          );

      }

      return true;

    } catch (error) {

      console.error(
        "Outreach email failed:",
        error
      );

      alert(
        "Email sending failed."
      );

      return false;

    }

  }

  function createQuickSendModal() {

    if (
      document.getElementById(
        "tradeflowQuickEmailModal"
      )
    ) return;

    const modal =
      document.createElement("div");

    modal.id =
      "tradeflowQuickEmailModal";

    modal.style.display = "none";

    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.background =
      "rgba(0,0,0,.7)";
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

        <h2>
          📧 Smart Outreach Sender
        </h2>

        <input
          id="tfEmailTo"
          placeholder="Receiver Email"
          style="
            width:100%;
            margin-top:14px;
            padding:12px;
            border-radius:12px;
          "
        >

        <input
          id="tfEmailSubject"
          placeholder="Email Subject"
          style="
            width:100%;
            margin-top:14px;
            padding:12px;
            border-radius:12px;
          "
        >

        <textarea
          id="tfEmailMessage"
          placeholder="Outreach message..."
          style="
            width:100%;
            margin-top:14px;
            min-height:220px;
            padding:12px;
            border-radius:12px;
          "
        ></textarea>

        <div style="
          display:flex;
          gap:12px;
          margin-top:18px;
        ">

          <button
            id="tfSendOutreachBtn"
            class="btn"
          >
            🚀 Send Outreach
          </button>

          <button
            id="tfCloseOutreachBtn"
            class="btn secondary"
          >
            Close
          </button>

        </div>

      </div>
    `;

    document.body.appendChild(modal);

    document
      .getElementById(
        "tfCloseOutreachBtn"
      )
      .onclick = function () {

        modal.style.display = "none";

      };

    document
      .getElementById(
        "tfSendOutreachBtn"
      )
      .onclick = async function () {

        const to =
          document.getElementById(
            "tfEmailTo"
          ).value;

        const subject =
          document.getElementById(
            "tfEmailSubject"
          ).value;

        const message =
          document.getElementById(
            "tfEmailMessage"
          ).value;

        await sendEmail({
          to,
          subject,
          message
        });

      };

  }

  function openModal(prefill = {}) {

    createQuickSendModal();

    const modal =
      document.getElementById(
        "tradeflowQuickEmailModal"
      );

    modal.style.display = "block";

    document.getElementById(
      "tfEmailTo"
    ).value =
      prefill.to || "";

    document.getElementById(
      "tfEmailSubject"
    ).value =
      prefill.subject ||
      "TradeFlow Business Proposal";

    document.getElementById(
      "tfEmailMessage"
    ).value =
      prefill.message ||
`Hello,

We would like to discuss a potential export/import business opportunity with your company.

Please let us know if you are interested in collaboration.

Regards,
TradeFlow`;
  }

  function createFloatingButton() {

    if (
      document.getElementById(
        "tradeflowFloatingOutreachBtn"
      )
    ) return;

    const btn =
      document.createElement("button");

    btn.id =
      "tradeflowFloatingOutreachBtn";

    btn.innerHTML = "📧";

    btn.style.position = "fixed";
    btn.style.right = "22px";
    btn.style.bottom = "22px";
    btn.style.width = "64px";
    btn.style.height = "64px";
    btn.style.borderRadius = "50%";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "28px";
    btn.style.zIndex = "9999";
    btn.style.background =
      "linear-gradient(135deg,#2563eb,#7c3aed)";
    btn.style.color = "white";
    btn.style.boxShadow =
      "0 10px 40px rgba(37,99,235,.4)";

    btn.onclick = () => openModal();

    document.body.appendChild(btn);

  }

  function boot() {

    createFloatingButton();

    console.log(
      "✅ Outreach Email Sender active"
    );

  }

  window.TradeFlowOutreachEmailSender = {
    sendEmail,
    openModal
  };

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      boot
    );

  } else {

    boot();

  }

})();