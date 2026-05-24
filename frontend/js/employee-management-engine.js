/* TradeFlow Employee Management UI Engine */

(function () {
  const EMPLOYEE_CACHE = "tradeflowEmployeeManagementCache";

  const ROLE_PRESETS = {
    Owner: { dashboard:true, suppliers:true, crm:true, tasks:true, analytics:true, documents:true, outreach:true, ai:true, billing:true, admin:true },
    Admin: { dashboard:true, suppliers:true, crm:true, tasks:true, analytics:true, documents:true, outreach:true, ai:true, billing:true, admin:true },
    Manager: { dashboard:true, suppliers:true, crm:true, tasks:true, analytics:true, documents:true, outreach:true, ai:true, billing:false, admin:false },
    Sales: { dashboard:true, suppliers:true, crm:true, tasks:true, analytics:false, documents:false, outreach:true, ai:true, billing:false, admin:false },
    Operations: { dashboard:true, suppliers:true, crm:false, tasks:true, analytics:true, documents:true, outreach:false, ai:true, billing:false, admin:false },
    Documentation: { dashboard:true, suppliers:false, crm:false, tasks:true, analytics:false, documents:true, outreach:false, ai:false, billing:false, admin:false },
    Viewer: { dashboard:true, suppliers:false, crm:false, tasks:false, analytics:true, documents:false, outreach:false, ai:false, billing:false, admin:false }
  };

  function $(id) { return document.getElementById(id); }

  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") return BACKEND_URL;
    return "https://trade-flow-lc1k.onrender.com";
  }

  function getJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
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
      "x-user-email": user?.email || "unknown@tradeflow.local"
    };
  }

  function toast(message) {
    if (window.TradeFlowPremiumUX && typeof window.TradeFlowPremiumUX.toast === "function") {
      window.TradeFlowPremiumUX.toast(message);
      return;
    }
    alert(message.replace(/<[^>]*>/g, ""));
  }

  async function fetchEmployees() {
    try {
      const res = await fetch(`${getBackendUrl()}/api/employees`, { headers: getHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch employees");
      setJson(EMPLOYEE_CACHE, Array.isArray(data) ? data : []);
      renderEmployees();
      return data;
    } catch (error) {
      console.error("Employee engine fetch error:", error.message);
      renderEmployees();
      return getJson(EMPLOYEE_CACHE, []);
    }
  }

  function getFormPermissions() {
    const names = ["dashboard","suppliers","crm","tasks","analytics","documents","outreach","ai","billing","admin"];
    const permissions = {};
    names.forEach((name) => {
      const el = $(`empPerm_${name}`);
      permissions[name] = !!el?.checked;
    });
    return permissions;
  }

  function applyRolePreset(role) {
    const preset = ROLE_PRESETS[role] || ROLE_PRESETS.Viewer;
    Object.keys(preset).forEach((key) => {
      const el = $(`empPerm_${key}`);
      if (el) el.checked = !!preset[key];
    });
  }

  async function createEmployee() {
    const name = $("empName")?.value?.trim();
    const email = $("empEmail")?.value?.trim();
    const role = $("empRole")?.value || "Viewer";
    const status = $("empStatus")?.value || "Active";

    if (!name || !email) {
      alert("Employee name and email are required.");
      return;
    }

    const activeCompany = localStorage.getItem("tradeflowActiveCompany") || "";
    const activeWorkspace = localStorage.getItem("tradeflowActiveWorkspace") || "";
    const user = getUser();

    try {
      const res = await fetch(`${getBackendUrl()}/api/employees`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          name,
          email,
          role,
          status,
          ownerEmail: user?.email || email,
          companyId: activeCompany || undefined,
          workspaceId: activeWorkspace || undefined,
          permissions: getFormPermissions()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to create employee");
        return;
      }

      $("empName").value = "";
      $("empEmail").value = "";
      $("empRole").value = "Viewer";
      $("empStatus").value = "Active";
      applyRolePreset("Viewer");

      await fetchEmployees();
      toast(`✅ Employee added: <b>${name}</b>`);
    } catch (error) {
      console.error("Create employee error:", error.message);
      alert("Employee creation failed.");
    }
  }

  async function updateEmployeeStatus(id, status) {
    try {
      const res = await fetch(`${getBackendUrl()}/api/employees/${id}`, {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ status })
      });

      if (!res.ok) throw new Error("Status update failed");
      await fetchEmployees();
      toast("Employee status updated.");
    } catch (error) {
      alert("Could not update employee status.");
    }
  }

  async function deleteEmployee(id) {
    if (!confirm("Delete this employee?")) return;

    try {
      const res = await fetch(`${getBackendUrl()}/api/employees/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });

      if (!res.ok) throw new Error("Delete failed");
      await fetchEmployees();
      toast("Employee deleted.");
    } catch (error) {
      alert("Could not delete employee.");
    }
  }

  function injectStyles() {
    if ($("employeeManagementStyles")) return;

    const style = document.createElement("style");
    style.id = "employeeManagementStyles";
    style.innerHTML = `
      .employee-engine-grid{display:grid;grid-template-columns:minmax(300px,.75fr) minmax(320px,1.25fr);gap:18px;margin-top:18px;}
      .permission-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:12px;}
      .permission-check{display:flex;align-items:center;gap:8px;padding:10px;border-radius:14px;background:rgba(2,6,23,.55);border:1px solid rgba(148,163,184,.14);color:#cbd5e1;font-size:13px;font-weight:800;}
      .employee-list{max-height:620px;overflow-y:auto;padding-right:6px;}
      .role-pill{display:inline-flex;padding:6px 10px;border-radius:999px;background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.24);color:#7dd3fc;font-size:12px;font-weight:900;}
      @media(max-width:950px){.employee-engine-grid{grid-template-columns:1fr;}}
    `;
    document.head.appendChild(style);
  }

  function permissionCheckbox(key, label) {
    return `<label class="permission-check"><input id="empPerm_${key}" type="checkbox"> ${label}</label>`;
  }

  function buildPanel() {
    const target = $("employeesPage") || $("dashboardPage");
    if (!target || $("employeeManagementEnginePanel")) return;

    const panel = document.createElement("div");
    panel.id = "employeeManagementEnginePanel";
    panel.className = "card ai-panel";
    panel.innerHTML = `
      <div class="section-title">👥 Employee Management Engine</div>
      <p class="muted">Invite/manage employees, roles, status, and permissions for company workspaces.</p>

      <div class="employee-engine-grid">
        <div>
          <div class="section-title">Add Employee</div>
          <input id="empName" placeholder="Employee name">
          <input id="empEmail" placeholder="Employee email">

          <select id="empRole" onchange="TradeFlowEmployeeEngine.applyRolePreset(this.value)">
            <option>Owner</option><option>Admin</option><option>Manager</option><option>Sales</option>
            <option>Operations</option><option>Documentation</option><option selected>Viewer</option>
          </select>

          <select id="empStatus">
            <option selected>Active</option><option>Inactive</option><option>Invited</option><option>Removed</option>
          </select>

          <div class="section-title" style="margin-top:16px;">Permissions</div>
          <div class="permission-grid">
            ${permissionCheckbox("dashboard","Dashboard")}
            ${permissionCheckbox("suppliers","Suppliers")}
            ${permissionCheckbox("crm","CRM")}
            ${permissionCheckbox("tasks","Tasks")}
            ${permissionCheckbox("analytics","Analytics")}
            ${permissionCheckbox("documents","Documents")}
            ${permissionCheckbox("outreach","Outreach")}
            ${permissionCheckbox("ai","AI")}
            ${permissionCheckbox("billing","Billing")}
            ${permissionCheckbox("admin","Admin")}
          </div>

          <button class="btn" onclick="TradeFlowEmployeeEngine.create()" style="margin-top:14px;">Add Employee</button>
          <button class="mini-btn" onclick="TradeFlowEmployeeEngine.refresh()">Refresh Employees</button>
        </div>

        <div>
          <div class="section-title">Team Members</div>
          <div id="employeeManagementList" class="employee-list"></div>
        </div>
      </div>
    `;

    target.appendChild(panel);
    applyRolePreset("Viewer");
    renderEmployees();
  }

  function renderEmployees() {
    const box = $("employeeManagementList");
    if (!box) return;

    const employees = getJson(EMPLOYEE_CACHE, []);

    if (!employees.length) {
      box.innerHTML = `<div class="deal">No employees yet. Add your first team member.</div>`;
      updateCounters(0, 0, 0);
      return;
    }

    let active = 0;
    let admins = 0;

    box.innerHTML = employees.map((employee) => {
      if (employee.status === "Active") active++;
      if (employee.role === "Admin" || employee.role === "Owner") admins++;

      const permissions = employee.permissions || {};

      return `
        <div class="supplier-card">
          <h2 style="font-size:20px;font-weight:900;color:white;margin:0 0 8px;">${employee.name || "Unnamed Employee"}</h2>
          <p class="muted">Email: ${employee.email || "N/A"}</p>
          <p class="muted">Status: ${employee.status || "Active"}</p>
          <span class="role-pill">${employee.role || "Viewer"}</span>

          <div class="deal" style="margin-top:12px;">
            <b>Permissions</b><br>
            Dashboard: ${permissions.dashboard ? "✅" : "❌"} |
            Suppliers: ${permissions.suppliers ? "✅" : "❌"} |
            CRM: ${permissions.crm ? "✅" : "❌"} |
            AI: ${permissions.ai ? "✅" : "❌"}<br>
            Outreach: ${permissions.outreach ? "✅" : "❌"} |
            Documents: ${permissions.documents ? "✅" : "❌"} |
            Analytics: ${permissions.analytics ? "✅" : "❌"} |
            Admin: ${permissions.admin ? "✅" : "❌"}
          </div>

          <select onchange="TradeFlowEmployeeEngine.updateStatus('${employee._id}', this.value)">
            <option ${employee.status === "Active" ? "selected" : ""}>Active</option>
            <option ${employee.status === "Inactive" ? "selected" : ""}>Inactive</option>
            <option ${employee.status === "Invited" ? "selected" : ""}>Invited</option>
            <option ${employee.status === "Removed" ? "selected" : ""}>Removed</option>
          </select>

          <button class="danger-btn" onclick="TradeFlowEmployeeEngine.delete('${employee._id}')">Delete Employee</button>
        </div>
      `;
    }).join("");

    updateCounters(employees.length, active, admins);
  }

  function updateCounters(total, active, admins) {
    const totalEl = $("employeeCount");
    const activeEl = $("activeEmployeeCount");
    const adminEl = $("adminEmployeeCount");
    if (totalEl) totalEl.innerText = total;
    if (activeEl) activeEl.innerText = active;
    if (adminEl) adminEl.innerText = admins;
  }

  window.TradeFlowEmployeeEngine = {
    refresh: fetchEmployees,
    create: createEmployee,
    updateStatus: updateEmployeeStatus,
    delete: deleteEmployee,
    applyRolePreset
  };

  function boot() {
    injectStyles();
    buildPanel();
    setTimeout(() => fetchEmployees(), 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
