const axios = require("axios");

const SERP_API_KEY =
  process.env.SERP_API_KEY ||
  "YOUR_SERP_API_KEY";

const HUNTER_API_KEY =
  process.env.HUNTER_API_KEY ||
  "";

function calculateSupplierScore(item, email) {
  let score = 60;

  if (item.link) score += 10;
  if (item.title) score += 10;
  if (item.snippet) score += 10;
  if (email && email !== "Not Available") score += 10;

  return Math.min(score, 100);
}

function getDomainFromUrl(url) {
  try {
    return new URL(url)
      .hostname
      .replace("www.", "");
  } catch {
    return "";
  }
}

async function enrichCompanyEmail(website) {
  try {
    if (!HUNTER_API_KEY || !website) {
      return "Not Available";
    }

    const domain = getDomainFromUrl(website);

    if (!domain) {
      return "Not Available";
    }

    const response = await axios.get(
      "https://api.hunter.io/v2/domain-search",
      {
        params: {
          domain,
          api_key: HUNTER_API_KEY
        }
      }
    );

    const emails = response.data?.data?.emails || [];

    if (!emails.length) {
      return "Not Available";
    }

    return emails[0].value || "Not Available";
  } catch {
    return "Not Available";
  }
}

async function searchSuppliers(query = {}) {
  try {
    const searchQuery = `
      ${query.product || ""}
      supplier exporter importer manufacturer wholesaler
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

    const organic =
      response.data.organic_results || [];

    const enrichedResults = [];

    for (const item of organic) {
      const email =
        await enrichCompanyEmail(item.link);

      enrichedResults.push({
        supplierName:
          item.title || "Unknown Supplier",

        product:
          query.product || "General Trade",

        country:
          query.country || "Global",

        website:
          item.link || "",

        email,

        phone:
          "Not Available",

        source:
          email !== "Not Available"
            ? "SerpAPI + Hunter"
            : "SerpAPI Live Search",

        notes:
          item.snippet || "",

        score:
          calculateSupplierScore(item, email),

        status:
          email !== "Not Available"
            ? "Enriched Lead"
            : "Live Discovered Lead"
      });
    }

    return enrichedResults;
  } catch (error) {
    console.error(
      "Supplier search error:",
      error.message
    );

    return [];
  }
}

module.exports = {
  searchSuppliers
};