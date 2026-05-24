const axios = require("axios");
const cheerio = require("cheerio");

async function scrapeWebsite(url) {
  try {

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 TradeFlow Enterprise Intelligence"
      }
    });

    const html = response.data;

    const $ = cheerio.load(html);

    const title =
      $("title").text().trim() || "Unknown Company";

    const text = $("body").text();

    const emails =
      text.match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
      ) || [];

    const phones =
      text.match(
        /(\+?\d[\d\s\-]{7,}\d)/g
      ) || [];

    const description =
      $("meta[name='description']").attr("content") ||
      "";

    return {
      success: true,
      url,
      title,
      description,
      emails: [...new Set(emails)].slice(0, 10),
      phones: [...new Set(phones)].slice(0, 10),
      verificationScore:
        calculateScore({
          emails,
          phones,
          description
        })
    };

  } catch (error) {

    return {
      success: false,
      url,
      error: error.message
    };

  }
}

function calculateScore(data) {

  let score = 40;

  if (data.emails?.length) score += 20;
  if (data.phones?.length) score += 20;
  if (data.description?.length > 50) score += 20;

  if (score > 100) score = 100;

  return score;
}

async function enrichSupplier({ companyName, website }) {

  let websiteData = null;

  if (website) {
    websiteData = await scrapeWebsite(website);
  }

  return {
    companyName,
    website,
    enrichedAt: new Date(),
    intelligence: websiteData
  };
}

module.exports = {
  scrapeWebsite,
  enrichSupplier
};