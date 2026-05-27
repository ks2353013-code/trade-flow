const Deal = require("../models/Deal");

async function runDealScoring(ownerEmail) {

  try {

    const deals = await Deal.find({
      ownerEmail
    });

    const updatedDeals = [];

    for (const deal of deals) {

      let score = 50;

      const value =
        Number(
          deal.value ||
          deal.dealValue ||
          0
        );

      const stage =
        deal.stage || "";

      if (value > 100000) {
        score += 20;
      }

      if (
        stage === "Negotiation"
      ) {
        score += 20;
      }

      if (
        stage === "Closed Won"
      ) {
        score = 100;
      }

      if (
        stage === "Lost"
      ) {
        score = 5;
      }

      let prediction = "Medium";

      if (score >= 80) {
        prediction = "High Probability";
      } else if (score <= 30) {
        prediction = "Low Probability";
      }

      deal.aiScore = score;

      deal.aiPrediction = prediction;

      await deal.save();

      updatedDeals.push({
        id: deal._id,
        company:
          deal.companyName ||
          deal.dealCompanyName ||
          "Unknown",
        score,
        prediction
      });
    }

    return {
      success: true,
      updatedDeals
    };

  } catch (error) {

    return {
      success: false,
      error: error.message
    };

  }

}

module.exports = {
  runDealScoring
};