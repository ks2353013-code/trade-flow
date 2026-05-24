const express = require("express");
const axios = require("axios");

const router = express.Router();

router.post("/search", async (req, res) => {

  try {

    const {
      query,
      country,
      industry
    } = req.body;

    const BRAVE_API_KEY =
      process.env.BRAVE_SEARCH_API_KEY;

    if (!BRAVE_API_KEY) {

      return res.status(400).json({
        success: false,
        message:
          "Brave Search API key missing"
      });

    }

    const searchQuery = `
      ${query || ""}
      supplier
      manufacturer
      exporter
      ${industry || ""}
      ${country || ""}
    `;

    const response =
      await axios.get(
        "https://api.search.brave.com/res/v1/web/search",
        {
          headers: {
            Accept: "application/json",
            "X-Subscription-Token":
              BRAVE_API_KEY
          },

          params: {
            q: searchQuery,
            count: 10
          }
        }
      );

    const results =
      response.data?.web?.results || [];

    const suppliers =
      results.map((item, index) => {

        const title =
          item.title || "Unknown Supplier";

        const description =
          item.description || "";

        const url =
          item.url || "";

        const score =
          Math.min(
            100,
            55 +
            (description.length > 120 ? 15 : 0) +
            (url.includes("https") ? 10 : 0) +
            (title.toLowerCase().includes("manufacturer") ? 10 : 0)
          );

        return {
          id:
            Date.now() + index,

          companyName:
            title,

          description,

          website:
            url,

          country:
            country || "Unknown",

          industry:
            industry || "General Trade",

          aiScore:
            score,

          trustLevel:
            score >= 80
              ? "High"
              : score >= 60
              ? "Medium"
              : "Low",

          aiSummary:
            `${title} appears to be a potential ${industry || "trade"} supplier with estimated sourcing confidence score of ${score}.`
        };

      });

    res.json({
      success: true,
      total:
        suppliers.length,
      suppliers
    });

  } catch (error) {

    console.error(
      "Real supplier discovery error:",
      error.message
    );

    res.status(500).json({
      success: false,
      message:
        "Supplier discovery failed",
      error:
        error.message
    });

  }

});

module.exports = router;