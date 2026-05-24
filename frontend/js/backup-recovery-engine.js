/* TradeFlow Backup + Recovery Engine */

(function () {

  function $(id) {
    return document.getElementById(id);
  }

  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") {
      return BACKEND_URL;
    }

    return "https://trade-flow-lc1k.onrender.com";
  }

  function getUser() {
    try {
      return JSON.parse(
        localStorage.getItem("tradeflowUser") || "{}"
      );
    } catch {
      return {};
    }
  }

  function getHeaders() {

    const user = getUser();

    return {
      "Content-Type": "application/json",

      Authorization:
        user?.token
          ? `Bearer ${user.token}`
          : "",

      "x-user-email":
        user?.email ||
        "unknown@tradeflow.local",

      "x-company-id":
        localStorage.getItem(
          "tradeflowActiveCompany"
        ) || "",

      "x-workspace-id":
        localStorage.getItem(
          "tradeflowActiveWorkspace"
        ) || ""
    };
  }

  function setStatus(text) {

    const el = $("backupRecoveryStatus");

    if (el) {
      el.innerText = text;
    }

  }

  async function exportBackup() {

    try {

      setStatus("Preparing backup export...");

      const res = await fetch(
        `${getBackendUrl()}/api/backup/export`,
        {
          headers: getHeaders()
        }
      );

      if (!res.ok) {
        throw new Error("Export failed");
      }

      const blob =
        await res.blob();

      const url =
        window.URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      a.href = url;

      a.download =
        `tradeflow-backup-${Date.now()}.json`;

      document.body.appendChild(a);

      a.click();

      a.remove();

      window.URL.revokeObjectURL(url);

      setStatus("Backup exported successfully.");

    } catch (error) {

      console.error(error);

      setStatus("Backup export failed.");

    }

  }

  async function restoreBackup(event) {

    try {

      const file =
        event.target.files[0];

      if (!file) return;

      if (
        !confirm(
          "Restore backup into current account?"
        )
      ) return;

      setStatus("Reading backup file...");

      const text =
        await file.text();

      const data =
        JSON.parse(text);

      setStatus("Restoring backup...");

      const res = await fetch(
        `${getBackendUrl()}/api/backup/restore`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(data)
        }
      );

      const result =
        await res.json();

      if (!res.ok) {
        throw new Error(
          result.message ||
          "Restore failed"
        );
      }

      setStatus(
        "Backup restored successfully."
      );

      alert(
        "Backup restored successfully."
      );

    } catch (error) {

      console.error(error);

      setStatus("Restore failed.");

      alert(
        error.message ||
        "Restore failed"
      );

    }

  }

  function buildPanel() {

    const dashboard =
      $("dashboardPage") ||
      document.body;

    if (
      $("backupRecoveryPanel")
    ) return;

    const panel =
      document.createElement("div");

    panel.id =
      "backupRecoveryPanel";

    panel.className =
      "card ai-panel";

    panel.innerHTML = `

      <div class="section-title">
        💾 Backup + Recovery
      </div>

      <p class="muted">
        Export your TradeFlow workspace,
        CRM,
        suppliers,
        AI memory,
        employees,
        and business data securely.
      </p>

      <div
        style="
          display:flex;
          gap:12px;
          flex-wrap:wrap;
          margin-top:16px;
        "
      >

        <button
          class="btn"
          onclick="TradeFlowBackup.export()"
        >
          Export Backup
        </button>

        <label
          class="btn"
          style="cursor:pointer;"
        >
          Restore Backup

          <input
            type="file"
            accept=".json"
            onchange="TradeFlowBackup.restore(event)"
            style="display:none;"
          />
        </label>

      </div>

      <div
        id="backupRecoveryStatus"
        style="
          margin-top:14px;
          color:#7dd3fc;
          font-weight:900;
        "
      >
        Backup system ready.
      </div>

    `;

    dashboard.appendChild(panel);

  }

  window.TradeFlowBackup = {
    export: exportBackup,
    restore: restoreBackup
  };

  function boot() {
    buildPanel();
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