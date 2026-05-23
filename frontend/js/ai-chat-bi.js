/* TradeFlow AI Chat Console + Real OpenAI Trade Agent Connection */

(function () {
  const CHAT_KEY = "tradeflowAiChatHistory";
  const BI_KEY = "tradeflowLiveBusinessFeed";

  function $(id) {
    return document.getElementById(id);
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

  function now() {
    return new Date().toLocaleString();
  }

  function getBackendUrl() {
    if (typeof BACKEND_URL !== "undefined") return BACKEND_URL;
    return "https://trade-flow-lc1k.onrender.com";
  }

  function getAuthHeadersSafe() {
    if (typeof getAuthHeaders === "function") return getAuthHeaders();

    const user = JSON.parse(localStorage.getItem("tradeflowUser") || "{}");

    return {
      "Content-Type": "application/json",
      "Authorization": user.token ? `Bearer ${user.token}` : ""
    };
  }

  function addBusinessFeed(type, message) {
    const feed = getJson(BI_KEY, []);
    feed.unshift({ type, message, time: now() });
    setJson(BI_KEY, feed.slice(0, 25));
    renderLiveBusinessFeed();
  }

  function getContextNumbers() {
    const read = (id) => {
      const el = $(id);
      return el ? el.innerText || "0" : "0";
    };

    return {
      suppliers: read("supplierCount"),
      deals: read("dashboardDealCount"),
      pipeline: read("dashboardPipelineValue"),
      closed: read("dashboardClosedDeals"),
      alerts: read("dashboardUnreadNotifications"),
      workspaces: read("dashboardWorkspaceCount"),
      activeWorkspace: localStorage.getItem("tradeflowActiveWorkspaceName") || "None"
    };
  }

  function fallbackReply(prompt) {
    const p = (prompt || "").toLowerCase();
    const ctx = getContextNumbers();

    if (p.includes("supplier") || p.includes("lead")) {
      return `🌍 Supplier Intelligence

Current supplier count: ${ctx.suppliers}

Recommended action:
1. Verify supplier email, phone, product, and country.
2. Prioritize suppliers with complete contact details.
3. Move high-quality suppliers into CRM.
4. Send WhatsApp + email outreach from TradeFlow.
5. Ask for catalogue, MOQ, price, packaging, and export documents.`;
    }

    if (p.includes("crm") || p.includes("deal") || p.includes("pipeline")) {
      return `📈 CRM Intelligence

Current deals: ${ctx.deals}
Pipeline value: ${ctx.pipeline}
Closed deals: ${ctx.closed}

Recommended action:
1. Follow up with Contacted deals within 24 hours.
2. Move serious replies into Negotiation.
3. Do not keep dead leads inside active stages.
4. Use AI Deal Advice on each CRM card.
5. Focus on high-value opportunities first.`;
    }

    if (p.includes("outreach") || p.includes("email") || p.includes("whatsapp")) {
      return `📧 Outreach Automation

Recommended outreach workflow:
1. Generate message from AI.
2. Personalize it by product and country.
3. Send email first for professionalism.
4. Send WhatsApp follow-up for faster response.
5. Save every reply into CRM.`;
    }

    if (p.includes("document") || p.includes("export") || p.includes("invoice")) {
      return `📄 Export Document Intelligence

Core export checklist:
1. Commercial Invoice
2. Packing List
3. Proforma Invoice
4. Purchase Order
5. Certificate of Origin
6. Shipping Bill
7. Bill of Lading / Airway Bill
8. Insurance Certificate
9. IEC / GST details
10. Product-specific compliance certificates`;
    }

    if (p.includes("risk") || p.includes("verify") || p.includes("fraud")) {
      return `🛡️ Risk Intelligence

Supplier / buyer risk checks:
1. Avoid unclear company identity.
2. Verify documents before payment.
3. Avoid unrealistic pricing.
4. Confirm export/import history.
5. Prefer company email over personal email.
6. Request GST/IEC or legal registration where applicable.`;
    }

    if (p.includes("today") || p.includes("next") || p.includes("focus")) {
      return `⚡ Today’s TradeFlow Focus

Based on your workspace:
• Suppliers: ${ctx.suppliers}
• Deals: ${ctx.deals}
• Alerts: ${ctx.alerts}

Priority plan:
1. Review supplier leads.
2. Send 3 high-quality outreach messages.
3. Follow up active CRM deals.
4. Prepare quotation/document checklist.
5. Clear unread alerts.`;
    }

    return `🤖 TradeFlow AI

I can help with:
• Supplier intelligence
• CRM next actions
• Outreach messages
• Negotiation strategy
• Export documentation
• Risk checks
• Daily business focus

Try asking:
“Give me today’s focus”
“Write supplier outreach”
“Analyze CRM pipeline”
“Create export checklist”
“Check supplier risk”`;
  }

  async function callRealTradeAgent(prompt) {
    const context = getContextNumbers();

    const response = await fetch(`${getBackendUrl()}/api/ai/trade-agent`, {
      method: "POST",
      headers: getAuthHeadersSafe(),
      body: JSON.stringify({
        prompt,
        context
      })
    });

    if (response.status === 401) {
      if (typeof logoutUser === "function") logoutUser();
      throw new Error("Unauthorized");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "TradeFlow AI request failed");
    }

    return {
      mode: data.mode || "openai",
      output: data.output || fallbackReply(prompt)
    };
  }

  function renderChat() {
    const box = $("tradeflowLiveAiMessages");
    if (!box) return;

    const history = getJson(CHAT_KEY, []);

    if (!history.length) {
      box.innerHTML = `<div class="deal">Ask TradeFlow AI about suppliers, CRM, outreach, documents, risk, or today’s focus.</div>`;
      return;
    }

    box.innerHTML = history.map(item => `
      <div class="supplier-card" style="margin-bottom:12px;">
        <b>${item.role === "user" ? "You" : "TradeFlow AI"}</b>
        <p class="muted" style="white-space:pre-wrap;margin-top:8px;">${item.text}</p>
        <span class="status">${item.time}${item.mode ? " • " + item.mode : ""}</span>
      </div>
    `).join("");

    box.scrollTop = box.scrollHeight;
  }

  function renderLiveBusinessFeed() {
    const box = $("tradeflowLiveBusinessFeed");
    if (!box) return;

    const feed = getJson(BI_KEY, []);

    if (!feed.length) {
      box.innerHTML = `
        <div class="deal">No live intelligence yet. Use the AI buttons or ask the assistant.</div>
      `;
      return;
    }

    box.innerHTML = feed.map(item => `
      <div class="deal">
        <b>${item.type}</b><br>
        ${item.message}
        <br><span class="muted">${item.time}</span>
      </div>
    `).join("");
  }

  function addChat(role, text, mode = "") {
    const history = getJson(CHAT_KEY, []);
    history.push({ role, text, time: now(), mode });
    setJson(CHAT_KEY, history.slice(-30));
    renderChat();
  }

  async function askTradeFlowAI() {
    const input = $("tradeflowLiveAiInput");
    if (!input) return;

    const prompt = input.value.trim();

    if (!prompt) {
      alert("Type your question first.");
      return;
    }

    addChat("user", prompt);
    input.value = "";

    const typing = $("tradeflowAiTyping");
    if (typing) typing.innerText = "TradeFlow AI is thinking with real trade context...";

    try {
      const result = await callRealTradeAgent(prompt);
      addChat("ai", result.output, result.mode === "openai" ? "Real AI" : "Fallback");
      addBusinessFeed("🤖 Trade Agent", `${result.mode === "openai" ? "Real OpenAI" : "Fallback AI"} answered: ${prompt}`);

      const consoleBox = $("tradeflowAiConsole");
      if (consoleBox) consoleBox.value = result.output;
    } catch (error) {
      const fallback = fallbackReply(prompt);
      addChat("ai", fallback, "Local Fallback");
      addBusinessFeed("⚠️ AI Fallback", `Real AI unavailable. Local fallback answered: ${prompt}`);

      const consoleBox = $("tradeflowAiConsole");
      if (consoleBox) consoleBox.value = fallback;
    } finally {
      if (typing) typing.innerText = "";
    }
  }

  function clearAiChat() {
    localStorage.removeItem(CHAT_KEY);
    renderChat();
  }

  function generateBusinessHealth() {
    const ctx = getContextNumbers();

    const message = `Business Health Snapshot:
Suppliers: ${ctx.suppliers}
CRM Deals: ${ctx.deals}
Pipeline Value: ${ctx.pipeline}
Closed Deals: ${ctx.closed}
Unread Alerts: ${ctx.alerts}
Workspaces: ${ctx.workspaces}
Active Workspace: ${ctx.activeWorkspace}

AI Recommendation:
Improve supplier-to-CRM conversion and keep outreach active daily.`;

    addBusinessFeed("📊 Business Health", message);

    const consoleBox = $("tradeflowAiConsole");
    if (consoleBox) consoleBox.value = message;
  }

  function generateTodayFocus() {
    const message = `Today’s AI Focus:
1. Review supplier intelligence cards.
2. Contact at least 3 serious suppliers/buyers.
3. Move active leads into CRM.
4. Use AI Deal Advice for open opportunities.
5. Prepare export checklist for any negotiation-stage deal.`;

    addBusinessFeed("⚡ Today’s Focus", message);

    const consoleBox = $("tradeflowAiConsole");
    if (consoleBox) consoleBox.value = message;
  }

  function generateRiskAlerts() {
    const message = `AI Risk Alerts:
• Avoid suppliers without email/phone.
• Verify payment terms before closure.
• Do not move unverified leads to Closed.
• Request export documents before advance payment.
• Watch deals with no follow-up activity.`;

    addBusinessFeed("🛡️ Risk Monitor", message);

    const consoleBox = $("tradeflowAiConsole");
    if (consoleBox) consoleBox.value = message;
  }

  function injectStyles() {
    if ($("tradeflowAiChatStyles")) return;

    const style = document.createElement("style");
    style.id = "tradeflowAiChatStyles";
    style.innerHTML = `
      .tradeflow-ai-chat-grid {
        display: grid;
        grid-template-columns: minmax(320px, 1.2fr) minmax(280px, .8fr);
        gap: 18px;
      }
      .tradeflow-ai-messages {
        max-height: 480px;
        overflow-y: auto;
        padding-right: 6px;
      }
      .tradeflow-ai-input-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 10px;
        margin-top: 12px;
      }
      .tradeflow-ai-input-row input {
        margin-top: 0;
      }
      .tradeflow-ai-typing {
        min-height: 22px;
        margin-top: 8px;
        color: #7dd3fc;
        font-size: 13px;
        font-weight: 800;
      }
      @media(max-width:900px){
        .tradeflow-ai-chat-grid { grid-template-columns: 1fr; }
        .tradeflow-ai-input-row { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  function buildAiChatConsole() {
    const aiPage = $("aiPage");
    if (!aiPage || $("tradeflowAiChatPanel")) return;

    const panel = document.createElement("div");
    panel.id = "tradeflowAiChatPanel";
    panel.className = "card ai-panel";
    panel.innerHTML = `
      <div class="section-title">💬 TradeFlow Real AI Chat Console</div>
      <p class="muted">
        Connected to backend route <b>/api/ai/trade-agent</b>. If OpenAI key is missing, fallback mode will still answer.
      </p>

      <div class="tradeflow-ai-chat-grid" style="margin-top:16px;">
        <div>
          <div id="tradeflowLiveAiMessages" class="tradeflow-ai-messages"></div>

          <div class="tradeflow-ai-input-row">
            <input id="tradeflowLiveAiInput" placeholder="Ask: Find suppliers / Analyze CRM / Write outreach / Export checklist...">
            <button class="btn" onclick="TradeFlowAIChat.ask()">Ask Real AI</button>
          </div>

          <div id="tradeflowAiTyping" class="tradeflow-ai-typing"></div>

          <button class="mini-btn" onclick="TradeFlowAIChat.clear()">Clear AI Chat</button>
        </div>

        <div>
          <div class="section-title">📡 Live Business Intelligence</div>
          <button class="btn" onclick="TradeFlowAIChat.businessHealth()">Generate Business Health</button>
          <button class="btn" onclick="TradeFlowAIChat.todayFocus()">Generate Today’s Focus</button>
          <button class="btn" onclick="TradeFlowAIChat.riskAlerts()">Generate Risk Alerts</button>

          <div id="tradeflowLiveBusinessFeed" style="margin-top:14px;"></div>
        </div>
      </div>
    `;

    aiPage.appendChild(panel);
    renderChat();
    renderLiveBusinessFeed();
  }

  window.TradeFlowAIChat = {
    ask: askTradeFlowAI,
    clear: clearAiChat,
    businessHealth: generateBusinessHealth,
    todayFocus: generateTodayFocus,
    riskAlerts: generateRiskAlerts,
    addBusinessFeed
  };

  function boot() {
    injectStyles();
    buildAiChatConsole();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
