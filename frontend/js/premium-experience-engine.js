/* TradeFlow Premium Experience Engine */

(function () {
  function createStyles() {
    if (document.getElementById("premiumExperienceStyles")) return;

    const style = document.createElement("style");
    style.id = "premiumExperienceStyles";

    style.innerHTML = `
      .tf-fade-in {
        animation: tfFadeIn .35s ease both;
      }

      @keyframes tfFadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .tf-toast {
        position: fixed;
        right: 22px;
        bottom: 22px;
        z-index: 999999;
        min-width: 260px;
        max-width: 420px;
        background: linear-gradient(135deg, rgba(15,23,42,.96), rgba(2,6,23,.98));
        color: white;
        border: 1px solid rgba(56,189,248,.28);
        box-shadow: 0 24px 70px rgba(0,0,0,.45);
        border-radius: 20px;
        padding: 16px 18px;
        font-weight: 800;
        animation: tfToastIn .25s ease both;
      }

      @keyframes tfToastIn {
        from {
          opacity: 0;
          transform: translateY(16px) scale(.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .tf-loading-overlay {
        position: fixed;
        inset: 0;
        z-index: 999998;
        background: rgba(2,6,23,.55);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .tf-loader-card {
        width: min(420px, 92vw);
        background: linear-gradient(135deg, rgba(15,23,42,.95), rgba(2,6,23,.98));
        color: white;
        border: 1px solid rgba(56,189,248,.28);
        box-shadow: 0 30px 90px rgba(0,0,0,.55);
        border-radius: 26px;
        padding: 28px;
        text-align: center;
      }

      .tf-spinner {
        width: 54px;
        height: 54px;
        border-radius: 999px;
        border: 4px solid rgba(148,163,184,.18);
        border-top-color: #38bdf8;
        margin: 0 auto 16px;
        animation: tfSpin .75s linear infinite;
      }

      @keyframes tfSpin {
        to {
          transform: rotate(360deg);
        }
      }

      .tf-skeleton {
        position: relative;
        overflow: hidden;
        background: rgba(148,163,184,.12);
        border-radius: 16px;
        min-height: 18px;
      }

      .tf-skeleton::after {
        content: "";
        position: absolute;
        inset: 0;
        transform: translateX(-100%);
        background: linear-gradient(90deg, transparent, rgba(255,255,255,.16), transparent);
        animation: tfShimmer 1.2s infinite;
      }

      @keyframes tfShimmer {
        100% {
          transform: translateX(100%);
        }
      }

      .tf-empty-state {
        padding: 28px;
        border-radius: 24px;
        border: 1px dashed rgba(56,189,248,.35);
        background: rgba(15,23,42,.45);
        text-align: center;
        color: #cbd5e1;
      }

      .tf-empty-state h3 {
        color: white;
        font-size: 20px;
        font-weight: 900;
        margin-bottom: 8px;
      }

      .tf-premium-focus {
        outline: 2px solid rgba(56,189,248,.45);
        box-shadow: 0 0 0 6px rgba(56,189,248,.12);
      }

      @media (max-width: 900px) {
        .app {
          display: block !important;
        }

        .sidebar {
          position: relative !important;
          width: 100% !important;
          min-height: auto !important;
          display: grid !important;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
          gap: 8px !important;
        }

        .main {
          width: 100% !important;
          padding: 14px !important;
        }

        .topbar {
          flex-direction: column !important;
          align-items: flex-start !important;
          gap: 12px !important;
        }

        .dashboard-hero,
        .admin-hero {
          padding: 22px !important;
        }

        .hero-title {
          font-size: 30px !important;
          line-height: 1.15 !important;
        }

        .grid {
          grid-template-columns: 1fr !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function toast(message, type = "info") {
    const old = document.querySelector(".tf-toast");
    if (old) old.remove();

    const icon =
      type === "success" ? "✅" :
      type === "error" ? "⚠️" :
      type === "ai" ? "🤖" :
      "✨";

    const el = document.createElement("div");
    el.className = "tf-toast";
    el.innerHTML = `${icon} ${message}`;

    document.body.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(12px)";
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }

  function showLoader(message = "Loading TradeFlow workspace...") {
    hideLoader();

    const overlay = document.createElement("div");
    overlay.id = "tfPremiumLoader";
    overlay.className = "tf-loading-overlay";

    overlay.innerHTML = `
      <div class="tf-loader-card">
        <div class="tf-spinner"></div>
        <h2 style="font-size:22px;font-weight:900;margin-bottom:8px;">
          TradeFlow is preparing your workspace
        </h2>
        <p style="color:#cbd5e1;">
          ${message}
        </p>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function hideLoader() {
    const old = document.getElementById("tfPremiumLoader");
    if (old) old.remove();
  }

  function enhanceCards() {
    document.querySelectorAll(".card, .supplier-card").forEach((card) => {
      card.classList.add("tf-fade-in");
    });
  }

  function enhanceButtons() {
    document.querySelectorAll("button").forEach((btn) => {
      if (btn.dataset.tfEnhanced) return;

      btn.dataset.tfEnhanced = "true";

      btn.addEventListener("click", () => {
        btn.classList.add("tf-premium-focus");

        setTimeout(() => {
          btn.classList.remove("tf-premium-focus");
        }, 350);
      });
    });
  }

  function patchFetch() {
    if (window.TradeFlowPremiumFetchPatched) return;
    window.TradeFlowPremiumFetchPatched = true;

    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      try {
        const response = await originalFetch(...args);

        if (!response.ok && response.status >= 500) {
          toast("Server issue detected. Please retry in a moment.", "error");
        }

        if (response.ok) {
          const url = String(args[0] || "");
          if (
            url.includes("/api/") &&
            !url.includes("/analytics") &&
            !url.includes("/usage")
          ) {
            setTimeout(() => {
              enhanceCards();
              enhanceButtons();
            }, 300);
          }
        }

        return response;
      } catch (error) {
        toast("Network connection issue. Please check your internet.", "error");
        throw error;
      }
    };
  }

  function intelligentEmptyStates() {
    const emptyTargets = [
      {
        id: "supplierList",
        title: "No suppliers yet",
        text: "Add your first supplier or use Live Supplier Intelligence to enrich a supplier website."
      },
      {
        id: "taskList",
        title: "No tasks yet",
        text: "Create your first follow-up task or use AI Follow-up Automation."
      },
      {
        id: "outreachList",
        title: "No outreach history yet",
        text: "Send your first WhatsApp or email outreach from TradeFlow."
      },
      {
        id: "notificationList",
        title: "No notifications yet",
        text: "Important alerts, workflow updates, and reminders will appear here."
      }
    ];

    emptyTargets.forEach((target) => {
      const el = document.getElementById(target.id);
      if (!el) return;

      const text = (el.innerText || "").trim();

      if (!text) {
        el.innerHTML = `
          <div class="tf-empty-state">
            <h3>${target.title}</h3>
            <p>${target.text}</p>
          </div>
        `;
      }
    });
  }

  function welcomePulse() {
    setTimeout(() => {
      toast("Enterprise workspace ready. Continue guided activation for best setup.", "ai");
    }, 1400);
  }

  function observeDom() {
    const observer = new MutationObserver(() => {
      enhanceCards();
      enhanceButtons();
      intelligentEmptyStates();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  window.TradeFlowPremiumUX = {
    toast,
    showLoader,
    hideLoader,
    refresh: function () {
      enhanceCards();
      enhanceButtons();
      intelligentEmptyStates();
    }
  };

  function boot() {
    createStyles();
    patchFetch();
    enhanceCards();
    enhanceButtons();
    intelligentEmptyStates();
    observeDom();
    welcomePulse();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();