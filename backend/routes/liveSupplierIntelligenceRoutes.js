const express = require("express");

const {
  scrapeWebsite,
  enrichSupplier
} = require("../services/liveSupplierIntelligenceService");

const router = express.Router();

router.post("/scrape", async (req, res) => {

  try {

    const result =
      await scrapeWebsite(req.body.url);

    res.json(result);

  } catch (error) {

    res.status(500).json({
      message:
        "Website scraping failed"
    });

  }

});

router.post("/enrich", async (req, res) => {

  try {

    const result =
      await enrichSupplier(req.body);

    res.json(result);

  } catch (error) {

    res.status(500).json({
      message:
        "Supplier enrichment failed"
    });

  }

});

module.exports = router;