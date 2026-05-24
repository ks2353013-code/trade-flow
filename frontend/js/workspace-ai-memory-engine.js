/* TradeFlow Workspace AI Memory Engine */

(function () {
  const MEMORY_CACHE = "tradeflowWorkspaceAIMemoryCache";

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
      "x-user-email": user?.email || "unknown@tradeflow.local"
    };
  }

  function getContextIds() {
    return {
      companyId: localStorage.getItem("tradeflowActiveCompany") || "",
      workspaceId: localStorage.getItem("tradeflowActiveWorkspace") || ""
    };
  }

  async function saveMemory(type, prompt, response, metadata = {}) {
    try {
      const ids = getContextIds();

      const res = await fetch(`${getBackendUrl()}/api/ai-memory`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          type,
          prompt,
          response,
          companyId: ids.companyId || undefined,
          workspaceId: ids.workspaceId || undefined,
          metadata
        })
      });

      if (!res.ok) throw new Error("Memory save failed");

      await fetchMemory(false);
    } catch (error) {
      console.warn("AI memory save fallback:", error.message);
    }
  }

  async function fetchMemory(renderStatus = true) {
    try {
      const ids = getContextIds();

      const params = new URLSearchParams();

      if (ids.companyId) params.set("companyId", ids.companyId);
      if (ids.workspaceId) params.set("workspaceId", ids.workspaceId);

      const url = `${getBackendUrl()}/api/ai-memory?${params.toString()}`;

      const res = await fetch(url, {
        headers: getHeaders()
      });

      if (!res.ok) throw new Error("Memory fetch failed");

      const data = await res.json();

      setJson(MEMORY_CACHE, Array.isArray(data) ? data : []);
      renderMemory();

      if (renderStatus) setStatus("Workspace AI memory synced.");

      return data;
    } catch (error) {
      setStatus("Using local AI memory cache.");
      renderMemory();
      return getJson(MEMORY_CACHE, []);
    }
  }

  async function clearMemory() {
    if (!confirm("Clear AI memory for this workspace?")) return;

    try {
      const ids = getContextIds();

      const params = new URLSearchParams();

      if (ids.companyId) params.set("companyId", ids.companyId);
      if (ids.workspaceId) params.set("workspaceId", ids.workspaceId);

      const res = await fetch(`${getBackendUrl()}/api/ai-memory?${params.toString()}`, {
        method: "DELETE",
        headers: getHeaders()
      });

      if (!res.ok) throw new Error("Clear failed");

      setJson(MEMORY_CACHE, []);
      renderMemory();
      setStatus("Workspace AI memory cleared.");
    } catch (error) {
      setStatus("Could not clear AI memory.");
    }
  }

  function setStatus(text) {
    const el = $("workspaceAIMemoryStatus");
    if (el) el.innerText = text;
  }

  function renderMemory() {
    const box = $("workspaceAIMemoryList");
    if (!box) return;

    const memories = getJson(MEMORY_CACHE, []);

    if (!memories.length) {
      box.innerHTML = `<div class="deal">No AI memory yet for this workspace.</div>`;
      return;
    }

    box.innerHTML = memories.map((memory) => `
      <div class="supplier-card" style="margin-bottom:12px;">
        <h2 style="font-size:18px;font-weight:900;color:white;margin:0 0 8px;">
          ${memory.type || "AI Memory"}
        </h2>
        <p class="muted"><b>Prompt:</b> ${memory.prompt || "N/A"}</p>
        <p class="muted" style="white-space:pre-wrap;"><b>Response:</b> ${memory.response || "N/A"}</p>
        <span class="status">${memory.createdAt ? new Date(memory.createdAt).toLocaleString() : "Saved"}</span>
      </div>
    `).join("");
  }

  function injectStyles() {
    if ($("workspaceAIMemoryStyles")) return;

    const style = document.createElement("style");
    style.id = "workspaceAIMemoryStyles";
    style.innerHTML = `
      .workspace-memory-grid {
        display: grid;
        grid-template-columns: minmax(300px, .8fr) minmax(320px, 1.2fr);
        gap: 18px;
        margin-top: 18px;
      }

      .workspace-memory-list {
        max-height: 520px;
        overflow-y: auto;
        padding-right: 6px;
      }

      .workspace-memory-status {
        margin-top: 10px;
        color: #7dd3fc;
        font-size: 13px;
        font-weight: 900;
      }

      @media(max-width:950px){
        .workspace-memory-grid { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const aiPage = $("aiPage") || $("dashboardPage");
    if (!aiPage || $("workspaceAIMemoryPanel")) return;

    const panel = document.createElement("div");
    panel.id = "workspaceAIMemoryPanel";
    panel.className = "card ai-panel";
    panel.innerHTML = `
      <div class="section-title">🧠 Workspace AI Memory</div>
      <p class="muted">
        AI memory is now saved per active company/workspace in MongoDB.
      </p>

      <div class="workspace-memory-grid">
        <div>
          <button class="btn" onclick="TradeFlowWorkspaceMemory.fetch()">Refresh Memory</button>
          <button class="btn" onclick="TradeFlowWorkspaceMemory.manualSave()">Save Manual Memory</button>
          <button class="danger-btn" onclick="TradeFlowWorkspaceMemory.clear()">Clear Workspace Memory</button>

          <div id="workspaceAIMemoryStatus" class="workspace-memory-status">
            Workspace memory ready.
          </div>
        </div>

        <div>
          <div class="section-title">Saved AI Memory</div>
          <div id="workspaceAIMemoryList" class="workspace-memory-list"></div>
        </div>
      </div>
    `;

    aiPage.appendChild(panel);
    renderMemory();
  }

  function manualSave() {
    const prompt = promptText("Memory prompt?");
    if (!prompt) return;

    const response = promptText("Memory response?");
    if (!response) return;

    saveMemory("General", prompt, response, {
      manual: true
    });
  }

  function promptText(label) {
    return window.prompt(label);
  }

  function patchAIChatMemory() {
    if (window.TradeFlowWorkspaceMemoryPatched) return;
    if (!window.TradeFlowAIChat || typeof window.TradeFlowAIChat.ask !== "function") return;

    window.TradeFlowWorkspaceMemoryPatched = true;

    const originalAsk = window.TradeFlowAIChat.ask;

    window.TradeFlowAIChat.ask = async function (...args) {
      const input = $("tradeflowLiveAiInput");
      const promptBefore = input?.value || "";

      const result = await originalAsk.apply(this, args);

      setTimeout(() => {
        const memories = JSON.parse(localStorage.getItem("tradeflowAiChatHistory") || "[]");
        const lastAI = [...memories].reverse().find((m) => m.role === "ai");

        if (promptBefore && lastAI?.text) {
          saveMemory("Chat", promptBefore, lastAI.text, {
            mode: lastAI.mode || "AI"
          });
        }
      }, 900);

      return result;
    };
  }

  window.TradeFlowWorkspaceMemory = {
    save: saveMemory,
    fetch: fetchMemory,
    clear: clearMemory,
    manualSave
  };

  function boot() {
    injectStyles();
    buildPanel();

    setTimeout(() => {
      patchAIChatMemory();
      fetchMemory(false);
    }, 1400);

    setInterval(() => {
      patchAIChatMemory();
    }, 4000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();