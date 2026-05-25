const axios = require("axios");

const SERP_API_KEY =
  process.env.SERP_API_KEY ||
  "YOUR_SERP_API_KEY";

function calculateSupplierScore(item) {
  let score = 60;

  if (item.website) score += 10;
  if (item.phone) score += 10;
  if (item.title) score += 10;
  if (item.snippet) score += 10;

  return Math.min(score, 100);
}

async function searchSuppliers(query = {}) {
  try {

    const searchQuery = `
      ${query.product || ""}
      supplier exporter importer
      ${query.country || ""}
    `;

    const response =
      await axios.get(
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

    const organic =
      response.data.organic_results || [];

    return organic.map((item) => ({
      supplierName:
        item.title || "Unknown Supplier",

      product:
        query.product || "General Trade",

      country:
        query.country || "Global",

      website:
        item.link || "",

      email:
        "Not Available",

      phone:
        "Not Available",

      source:
        "SerpAPI Live Search",

      notes:
        item.snippet || "",

      score:
        calculateSupplierScore(item),

      status:
        "Live Discovered Lead"
    }));

  } catch (error) {

    console.error(
      "SerpAPI supplier error:",
      error.message
    );

    return [];
  }
}

module.exports = {
  searchSuppliers
};