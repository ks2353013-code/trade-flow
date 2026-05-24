/* TradeFlow Company + Workspace Engine */

(function () {
  const COMPANY_CACHE = "tradeflowCompanies";
  const WORKSPACE_CACHE = "tradeflowOrgWorkspaces";
  const ACTIVE_COMPANY = "tradeflowActiveCompany";
  const ACTIVE_WORKSPACE = "tradeflowActiveWorkspace";

  function $(id) {
    return document.getElementById(id);
  }

  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") return BACKEND_URL;
    return "https://trade-flow-lc1k.onrender.com";
  }

  function getJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function setJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getUser() {
    try {
      if (typeof window.getUser === "function") return window.getUser();
    } catch {}

    return getJson("tradeflowUser", {});
  }

  function getHeaders() {
    const user = getUser();

    return {
      "Content-Type": "application/json",
      Authorization: user?.token ? `Bearer ${user.token}` : "",
      "x-user-email":
        user?.email || "unknown@tradeflow.local"
    };
  }

  async function fetchCompanies() {
    try {
      const res = await fetch(
        `${getBackendUrl()}/api/companies`,
        {
          headers: getHeaders()
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed");
      }

      setJson(COMPANY_CACHE, data);

      renderCompanies();

      return data;
    } catch (error) {
      console.error(error);
      renderCompanies();
      return getJson(COMPANY_CACHE, []);
    }
  }

  async function createCompany() {
    const companyName =
      prompt("Enter company name");

    if (!companyName) return;

    const businessType =
      prompt(
        "Business type (Exporter / Importer / Both / Agency / Manufacturer)",
        "Both"
      ) || "Both";

    const country =
      prompt("Country", "India") || "India";

    try {
      const res = await fetch(
        `${getBackendUrl()}/api/companies`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            companyName,
            businessType,
            country
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed");
        return;
      }

      await fetchCompanies();
      await fetchWorkspaces();

      localStorage.setItem(
        ACTIVE_COMPANY,
        data.company._id
      );

      renderCompanies();
      renderWorkspaces();

      toast(
        `Company created: ${companyName}`
      );
    } catch (error) {
      console.error(error);
      alert("Company creation failed");
    }
  }

  async function fetchWorkspaces() {
    try {
      const res = await fetch(
        `${getBackendUrl()}/api/org-workspaces`,
        {
          headers: getHeaders()
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed");
      }

      setJson(WORKSPACE_CACHE, data);

      renderWorkspaces();

      return data;
    } catch (error) {
      console.error(error);
      renderWorkspaces();
      return getJson(WORKSPACE_CACHE, []);
    }
  }

  async function createWorkspace() {
    const companies =
      getJson(COMPANY_CACHE, []);

    if (!companies.length) {
      alert(
        "Create company first before workspace."
      );
      return;
    }

    const activeCompany =
      localStorage.getItem(ACTIVE_COMPANY) ||
      companies[0]._id;

    const workspaceName =
      prompt("Workspace name");

    if (!workspaceName) return;

    const type =
      prompt(
        "Workspace type",
        "Management"
      ) || "Management";

    try {
      const res = await fetch(
        `${getBackendUrl()}/api/org-workspaces`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            companyId: activeCompany,
            workspaceName,
            type
          })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed");
        return;
      }

      await fetchWorkspaces();

      localStorage.setItem(
        ACTIVE_WORKSPACE,
        data._id
      );

      renderWorkspaces();

      toast(
        `Workspace created: ${workspaceName}`
      );
    } catch (error) {
      console.error(error);
      alert("Workspace creation failed");
    }
  }

  function setActiveCompany(id) {
    localStorage.setItem(ACTIVE_COMPANY, id);
    renderCompanies();
  }

  function setActiveWorkspace(id) {
    localStorage.setItem(ACTIVE_WORKSPACE, id);
    renderWorkspaces();
  }

  function renderCompanies() {
    const container =
      $("companyWorkspaceCompanyList");

    if (!container) return;

    const companies =
      getJson(COMPANY_CACHE, []);

    const active =
      localStorage.getItem(ACTIVE_COMPANY);

    if (!companies.length) {
      container.innerHTML = `
        <div class="deal">
          No companies yet.
        </div>
      `;
      return;
    }

    container.innerHTML = companies
      .map(
        (company) => `
      <div class="supplier-card ${
        active === company._id
          ? "active-company-card"
          : ""
      }">

        <h2>${company.companyName}</h2>

        <p class="muted">
          ${company.businessType}
        </p>

        <p class="muted">
          ${company.country || ""}
        </p>

        <span class="status">
          ${company.plan || "Free"}
        </span>

        <button
          class="btn"
          onclick="TradeFlowCompanyEngine.setCompany('${company._id}')"
        >
          Open Company
        </button>
      </div>
    `
      )
      .join("");
  }

  function renderWorkspaces() {
    const container =
      $("companyWorkspaceWorkspaceList");

    if (!container) return;

    const workspaces =
      getJson(WORKSPACE_CACHE, []);

    const active =
      localStorage.getItem(ACTIVE_WORKSPACE);

    if (!workspaces.length) {
      container.innerHTML = `
        <div class="deal">
          No workspaces yet.
        </div>
      `;
      return;
    }

    container.innerHTML = workspaces
      .map(
        (workspace) => `
      <div class="supplier-card ${
        active === workspace._id
          ? "active-company-card"
          : ""
      }">

        <h2>${workspace.workspaceName}</h2>

        <p class="muted">
          ${workspace.type}
        </p>

        <p class="muted">
          ${
            workspace.companyId
              ?.companyName || ""
          }
        </p>

        <span class="status">
          ${workspace.visibility}
        </span>

        <button
          class="btn"
          onclick="TradeFlowCompanyEngine.setWorkspace('${workspace._id}')"
        >
          Open Workspace
        </button>
      </div>
    `
      )
      .join("");
  }

  function injectStyles() {
    if ($("companyWorkspaceStyles")) return;

    const style =
      document.createElement("style");

    style.id = "companyWorkspaceStyles";

    style.innerHTML = `
      .company-grid{
        display:grid;
        grid-template-columns:
          repeat(auto-fit,minmax(280px,1fr));
        gap:16px;
      }

      .active-company-card{
        border:1px solid #38bdf8;
        box-shadow:
          0 0 20px rgba(56,189,248,.2);
      }
    `;

    document.head.appendChild(style);
  }

  function toast(message) {
    if (
      window.TradeFlowPremiumUX &&
      typeof window.TradeFlowPremiumUX
        .toast === "function"
    ) {
      window.TradeFlowPremiumUX.toast(
        message
      );
      return;
    }

    alert(message);
  }

  function buildPanel() {
    const dashboard =
      $("dashboardPage");

    if (
      !dashboard ||
      $("companyWorkspacePanel")
    )
      return;

    const panel =
      document.createElement("div");

    panel.id = "companyWorkspacePanel";

    panel.className =
      "card subscription-card";

    panel.innerHTML = `
      <div class="section-title">
        🏢 Company + Workspace Engine
      </div>

      <p class="muted">
        Multi-company AI operating system infrastructure.
      </p>

      <div class="grid grid-3">

        <button
          class="btn"
          onclick="TradeFlowCompanyEngine.createCompany()"
        >
          Create Company
        </button>

        <button
          class="btn"
          onclick="TradeFlowCompanyEngine.createWorkspace()"
        >
          Create Workspace
        </button>

        <button
          class="btn"
          onclick="TradeFlowCompanyEngine.refresh()"
        >
          Refresh Organizations
        </button>

      </div>

      <div
        class="company-grid"
        style="margin-top:20px;"
      >

        <div>
          <div class="section-title">
            🏢 Companies
          </div>

          <div id="companyWorkspaceCompanyList"></div>
        </div>

        <div>
          <div class="section-title">
            🧠 Workspaces
          </div>

          <div id="companyWorkspaceWorkspaceList"></div>
        </div>

      </div>
    `;

    dashboard.appendChild(panel);

    renderCompanies();
    renderWorkspaces();
  }

  async function refresh() {
    await fetchCompanies();
    await fetchWorkspaces();
  }

  window.TradeFlowCompanyEngine = {
    fetchCompanies,
    createCompany,
    fetchWorkspaces,
    createWorkspace,
    setCompany: setActiveCompany,
    setWorkspace: setActiveWorkspace,
    refresh
  };

  function boot() {
    injectStyles();
    buildPanel();

    setTimeout(() => {
      refresh();
    }, 1200);
  }

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