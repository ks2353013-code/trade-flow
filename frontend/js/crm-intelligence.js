/* TradeFlow CRM Intelligence Upgrade */

(function () {
  function safeNumber(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n : 0;
  }

  function calculateDealProbability(deal) {
    let probability = 25;

    const stage = (deal.stage || "").toLowerCase();
    const priority = (deal.priority || "").toLowerCase();
    const value = safeNumber(deal.value);

    if (stage.includes("contacted")) probability += 15;
    if (stage.includes("negotiation")) probability += 35;
    if (stage.includes("closed")) probability = 100;
    if (stage.includes("lost")) probability = 0;

    if (priority === "high") probability += 12;
    if (priority === "medium") probability += 6;

    if (value >= 10000) probability += 8;
    if (deal.email) probability += 5;
    if (deal.phone) probability += 5;
    if (deal.notes && deal.notes.length > 25) probability += 5;

    return Math.max(0, Math.min(probability, 100));
  }

  function getDealHealth(probability) {
    if (probability >= 75) return "🟢 Strong";
    if (probability >= 45) return "🟡 Needs Follow-up";
    if (probability > 0) return "🔴 Weak";
    return "⚫ Closed/Lost";
  }

  function getNextAction(deal, probability) {
    const stage = deal.stage || "New Lead";

    if (stage === "New Lead") {
      return "Send first outreach and collect requirements.";
    }

    if (stage === "Contacted") {
      return "Follow up within 24 hours and ask for quantity, timeline, and documents.";
    }

    if (stage === "Negotiation") {
      return "Prepare pricing comparison, margin check, and closing offer.";
    }

    if (stage === "Closed") {
      return "Start documentation, payment tracking, and fulfillment workflow.";
    }

    if (stage === "Lost") {
      return "Archive reason and schedule future reactivation.";
    }

    return probability >= 70
      ? "Push toward negotiation."
      : "Collect more information before moving forward.";
  }

  function getFollowUpTiming(deal) {
    const stage = deal.stage || "New Lead";

    if (stage === "New Lead") return "Today";
    if (stage === "Contacted") return "Within 24 hours";
    if (stage === "Negotiation") return "Within 12 hours";
    if (stage === "Closed") return "After documentation confirmation";
    if (stage === "Lost") return "After 30 days";

    return "Within 24 hours";
  }

  function buildCrmInsight(deal) {
    const probability = calculateDealProbability(deal);

    return {
      probability,
      health: getDealHealth(probability),
      nextAction: getNextAction(deal, probability),
      followUp: getFollowUpTiming(deal)
    };
  }

  window.TradeFlowCrmIntel = {
    buildCrmInsight,

    showDealAdvice(encodedDeal) {
      try {
        const deal = JSON.parse(decodeURIComponent(encodedDeal));
        const insight = buildCrmInsight(deal);

        const message =
`📈 TradeFlow CRM Intelligence

Company: ${deal.companyName || "N/A"}
Product: ${deal.product || "N/A"}
Stage: ${deal.stage || "New Lead"}
Deal Value: ${deal.value || 0}

Deal Probability: ${insight.probability}%
Deal Health: ${insight.health}

AI Next Action:
${insight.nextAction}

Follow-up Timing:
${insight.followUp}`;

        const consoleBox = document.getElementById("tradeflowAiConsole");
        if (consoleBox) {
          consoleBox.value = message;
          showPage("ai");
        } else {
          alert(message);
        }
      } catch (error) {
        alert("Could not generate CRM intelligence.");
      }
    }
  };

  window.renderCrmIntelCard = function (deal) {
    const insight = buildCrmInsight(deal);
    const encodedDeal = encodeURIComponent(JSON.stringify(deal));

    return `
      <div class="deal" draggable="true" ondragstart="dragDeal(event)" data-deal-id="${deal._id}">
        <b>${deal.companyName || "Unnamed Deal"}</b>

        <p class="muted">Product: ${deal.product || "N/A"}</p>
        <p class="muted">Country: ${deal.country || "N/A"}</p>
        <p class="muted">Value: ${deal.value || 0}</p>
        <p class="muted">Priority: ${deal.priority || "Medium"}</p>
        <p class="muted">Contact: ${deal.contactPerson || "N/A"}</p>

        <div class="deal" style="margin-top:10px;">
          <b>AI CRM Intelligence</b><br>
          Probability: ${insight.probability}%<br>
          Health: ${insight.health}<br>
          Follow-up: ${insight.followUp}<br>
          Next Action: ${insight.nextAction}
        </div>

        <select onchange="updateDealStage('${deal._id}', this.value)">
          <option ${deal.stage === "New Lead" ? "selected" : ""}>New Lead</option>
          <option ${deal.stage === "Contacted" ? "selected" : ""}>Contacted</option>
          <option ${deal.stage === "Negotiation" ? "selected" : ""}>Negotiation</option>
          <option ${deal.stage === "Closed" ? "selected" : ""}>Closed</option>
          <option ${deal.stage === "Lost" ? "selected" : ""}>Lost</option>
        </select>

        <button class="mini-btn" onclick="TradeFlowCrmIntel.showDealAdvice('${encodedDeal}')">
          🤖 AI Deal Advice
        </button>

        <button class="mini-btn" onclick="showPage('outreach')">
          📧 Start Outreach
        </button>

        <button class="danger-btn" onclick="deleteDeal('${deal._id}')">
          Delete
        </button>
      </div>
    `;
  };

  const originalRenderDeals = window.renderDeals;

  if (typeof originalRenderDeals === "function") {
    window.renderDeals = function (deals) {
      const stageContainers = {
        "New Lead": document.getElementById("newLeadDeals"),
        "Contacted": document.getElementById("contactedDeals"),
        "Negotiation": document.getElementById("negotiationDeals"),
        "Closed": document.getElementById("closedDeals"),
        "Lost": document.getElementById("lostDeals")
      };

      Object.values(stageContainers).forEach((container) => {
        if (container) container.innerHTML = "";
      });

      let closedCount = 0;
      let pipelineValue = 0;

      deals.forEach((deal) => {
        pipelineValue += safeNumber(deal.value);

        if (deal.stage === "Closed") {
          closedCount++;
        }

        const html = window.renderCrmIntelCard(deal);

        if (stageContainers[deal.stage]) {
          stageContainers[deal.stage].innerHTML += html;
        }
      });

      const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.innerText = value;
      };

      setText("dealCount", deals.length);
      setText("closedDealCount", closedCount);
      setText("pipelineValue", pipelineValue);
      setText("dashboardDealCount", deals.length);
      setText("dashboardPipelineValue", pipelineValue);
      setText("dashboardClosedDeals", closedCount);
    };
  }
})();
