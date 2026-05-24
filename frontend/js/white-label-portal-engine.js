/* TradeFlow White-Label Company Portal Engine */

(function () {
  function $(id) {
    return document.getElementById(id);
  }

  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") return BACKEND_URL;
    return "https://trade-flow-lc1k.onrender.com";
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem("tradeflowUser") || "{}");
    } catch {
      return {};
    }
  }

  function getHeaders() {
    const user = getUser();

    return {
      "Content-Type": "application/json",
      Authorization: user?.token ? `Bearer ${user.token}` : "",
      "x-user-email": user?.email || "unknown@tradeflow.local",
      "x-company-id": localStorage.getItem("tradeflowActiveCompany") || "",
      "x-workspace-id": localStorage.getItem("tradeflowActiveWorkspace") || ""
    };
  }

  function applyBranding(settings) {
    if (!settings) return;

    document.documentElement.style.setProperty("--brand-primary", settings.primaryColor || "#2563eb");
    document.documentElement.style.setProperty("--brand-secondary", settings.secondaryColor || "#0f172a");
    document.documentElement.style.setProperty("--brand-accent", settings.accentColor || "#38bdf8");

    document.title = settings.portalTitle || "TradeFlow Enterprise Portal";

    const existing = document.getElementById("whiteLabelCustomCss");
    if (existing) existing.remove();

    if (settings.customCss) {
      const style = document.createElement("style");
      style.id = "whiteLabelCustomCss";
      style.innerHTML = settings.customCss;
      document.head.appendChild(style);
    }

    const brandEls = document.querySelectorAll("[data-brand-name]");
    brandEls.forEach((el) => {
      el.innerText = settings.companyName || "TradeFlow";
    });
  }

  async function loadSettings() {
    try {
      const res = await fetch(`${getBackendUrl()}/api/white-label`, {
        headers: getHeaders()
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Failed");

      localStorage.setItem("tradeflowWhiteLabelSettings", JSON.stringify(data));
      applyBranding(data);
      fillForm(data);
      setStatus("White-label settings synced.");
    } catch {
      const cached = JSON.parse(localStorage.getItem("tradeflowWhiteLabelSettings") || "null");
      if (cached) {
        applyBranding(cached);
        fillForm(cached);
      }
      setStatus("Using cached branding settings.");
    }
  }

  async function saveSettings() {
    try {
      const payload = {
        companyName: $("wlCompanyName")?.value || "TradeFlow",
        companyLogo: $("wlCompanyLogo")?.value || "",
        primaryColor: $("wlPrimaryColor")?.value || "#2563eb",
        secondaryColor: $("wlSecondaryColor")?.value || "#0f172a",
        accentColor: $("wlAccentColor")?.value || "#38bdf8",
        portalTitle: $("wlPortalTitle")?.value || "TradeFlow Enterprise Portal",
        customDomain: $("wlCustomDomain")?.value || "",
        customCss: $("wlCustomCss")?.value || ""
      };

      setStatus("Saving white-label settings...");

      const res = await fetch(`${getBackendUrl()}/api/white-label`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Save failed");

      localStorage.setItem("tradeflowWhiteLabelSettings", JSON.stringify(data));
      applyBranding(data);
      fillForm(data);
      setStatus("White-label branding saved.");
      alert("Branding saved successfully.");
    } catch (error) {
      setStatus(error.message || "Failed to save branding.");
    }
  }

  function fillForm(s) {
    if (!s) return;

    if ($("wlCompanyName")) $("wlCompanyName").value = s.companyName || "";
    if ($("wlCompanyLogo")) $("wlCompanyLogo").value = s.companyLogo || "";
    if ($("wlPrimaryColor")) $("wlPrimaryColor").value = s.primaryColor || "#2563eb";
    if ($("wlSecondaryColor")) $("wlSecondaryColor").value = s.secondaryColor || "#0f172a";
    if ($("wlAccentColor")) $("wlAccentColor").value = s.accentColor || "#38bdf8";
    if ($("wlPortalTitle")) $("wlPortalTitle").value = s.portalTitle || "";
    if ($("wlCustomDomain")) $("wlCustomDomain").value = s.customDomain || "";
    if ($("wlCustomCss")) $("wlCustomCss").value = s.customCss || "";
  }

  function setStatus(text) {
    const el = $("whiteLabelStatus");
    if (el) el.innerText = text;
  }

  function buildPanel() {
    const dashboard = $("dashboardPage") || document.body;
    if (!dashboard || $("whiteLabelPanel")) return;

    const panel = document.createElement("div");
    panel.id = "whiteLabelPanel";
    panel.className = "card ai-panel";

    panel.innerHTML = `
      <div class="section-title">🏢 White-Label Company Portal</div>
      <p class="muted">
        Customize company identity, branding, colors, portal title, logo URL, and enterprise portal appearance.
      </p>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:18px;">
        <input id="wlCompanyName" class="input" placeholder="Company Name">
        <input id="wlCompanyLogo" class="input" placeholder="Logo URL">
        <input id="wlPortalTitle" class="input" placeholder="Portal Title">
        <input id="wlCustomDomain" class="input" placeholder="Custom Domain">

        <input id="wlPrimaryColor" class="input" type="color" value="#2563eb">
        <input id="wlSecondaryColor" class="input" type="color" value="#0f172a">
        <input id="wlAccentColor" class="input" type="color" value="#38bdf8">
      </div>

      <textarea
        id="wlCustomCss"
        class="input"
        placeholder="Custom CSS"
        style="margin-top:12px;min-height:130px;resize:vertical;"
      ></textarea>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:14px;">
        <button class="btn" onclick="TradeFlowWhiteLabel.save()">Save Branding</button>
        <button class="mini-btn" onclick="TradeFlowWhiteLabel.load()">Refresh Branding</button>
      </div>

      <div id="whiteLabelStatus" style="margin-top:14px;color:#7dd3fc;font-weight:900;">
        White-label portal ready.
      </div>
    `;

    dashboard.appendChild(panel);
  }

  window.TradeFlowWhiteLabel = {
    load: loadSettings,
    save: saveSettings,
    apply: applyBranding
  };

  function boot() {
    buildPanel();
    loadSettings();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();