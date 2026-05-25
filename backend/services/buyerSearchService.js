const axios = require("axios");

const SERP_API_KEY =
  process.env.SERP_API_KEY ||
  "YOUR_SERP_API_KEY";

function calculateBuyerScore(item, query) {
  let score = 60;

  if (item.link) score += 10;
  if (item.title) score += 10;
  if (item.snippet) score += 10;

  const text = `${item.title || ""} ${item.snippet || ""}`.toLowerCase();

  if (text.includes("importer")) score += 10;
  if (text.includes("buyer")) score += 5;
  if (text.includes("distributor")) score += 5;

  return Math.min(score, 100);
}

async function searchBuyers(query = {}) {
  try {
    const searchQuery = `
      ${query.product || ""}
      importer buyer distributor wholesale
      ${query.country || ""}
    `;

    const response = await axios.get(
      "https://serpapi.com/search.json",
      {
        params: {
          q: searchQuery,
          api_key: SERP_API_KEY,
          engine: "google",
          google_domain: "google.com",
          num: 10
        }
      }
    );

    const organic = response.data.organic_results || [];

    return organic.map((item) => ({
      buyerName: item.title || "Unknown Buyer",
      product: query.product || "General Trade",
      country: query.country || "Global",
      website: item.link || "",
      email: "Not Available",
      phone: "Not Available",
      source: "SerpAPI Buyer Search",
      notes: item.snippet || "",
      score: calculateBuyerScore(item, query),
      status: "Live Buyer Lead"
    }));
  } catch (error) {
    console.error("Buyer search error:", error.message);
    return [];
  }
}

module.exports = {
  searchBuyers
};