/* TradeFlow AI Chat Console + Live Business Intelligence */

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
      workspaces: read("dashboardWorkspaceCount")
    };
  }

  function buildAiReply(prompt) {
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
5. Ask for catalogue, MOQ, price, packaging, and export documents.

AI note:
Strong suppliers should have clear documents, fast replies, and realistic pricing.`;
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
5. Focus on high-value opportunities first.

AI note:
Your CRM should behave like a revenue machine, not just a storage table.`;
    }

    if (p.includes("outreach") || p.includes("email") || p.includes("whatsapp")) {
      return `📧 Outreach Automation

Recommended outreach workflow:
1. Generate message from AI.
2. Personalize it by product and country.
3. Send email first for professionalism.
4. Send WhatsApp follow-up for faster response.
5. Save every reply into CRM.

Best message structure:
• Greeting
• Product interest
• MOQ/pricing request
• Certification/document request
• Clear next step`;
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
10. Product-specific compliance certificates

AI note:
Before dispatch, confirm destination-country compliance and payment terms.`;
    }

    if (p.includes("risk") || p.includes("verify") || p.includes("fraud")) {
      return `🛡️ Risk Intelligence

Supplier / buyer risk checks:
1. Avoid unclear company identity.
2. Verify documents before payment.
3. Avoid unrealistic pricing.
4. Confirm export/import history.
5. Prefer company email over personal email.
6. Request GST/IEC or legal registration where applicable.

AI warning:
High margin is useless if supplier reliability is weak.`;
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
5. Clear unread alerts.

AI goal:
Create momentum every day: lead → outreach → CRM → negotiation → documents → closure.`;
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
        <span class="status">${item.time}</span>
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

  function addChat(role, text) {
    const history = getJson(CHAT_KEY, []);
    history.push({ role, text, time: now() });
    setJson(CHAT_KEY, history.slice(-30));
    renderChat();
  }

  function askTradeFlowAI() {
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
    if (typing) typing.innerText = "TradeFlow AI is thinking...";

    setTimeout(() => {
      const reply = buildAiReply(prompt);
      addChat("ai", reply);
      addBusinessFeed("🤖 AI Assistant", `Answered: ${prompt}`);
      if (typing) typing.innerText = "";
    }, 650);
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
      <div class="section-title">💬 TradeFlow AI Chat Console</div>
      <p class="muted">
        Ask your AI trade operator about suppliers, CRM, outreach, documents, risk, and today’s business focus.
      </p>

      <div class="tradeflow-ai-chat-grid" style="margin-top:16px;">
        <div>
          <div id="tradeflowLiveAiMessages" class="tradeflow-ai-messages"></div>

          <div class="tradeflow-ai-input-row">
            <input id="tradeflowLiveAiInput" placeholder="Ask: Give me today’s focus / Analyze CRM / Write outreach...">
            <button class="btn" onclick="TradeFlowAIChat.ask()">Ask AI</button>
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
