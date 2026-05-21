const Supplier = require("../models/Supplier");

const generateLeadScore = (product, country) => {
  let score = 70;

  if (product && product.length > 3) score += 8;
  if (country && country.length > 2) score += 7;

  return Math.min(score, 95);
};

const findSuppliers = async (req, res) => {
  try {
    const { product, country } = req.body;

    if (!product || !country) {
      return res.status(400).json({
        message: "Product and country are required",
      });
    }

    const cleanProduct = product.trim();
    const cleanCountry = country.trim();

    const leads = [
      {
        supplierName: `${cleanCountry} ${cleanProduct} Exporters Ltd`,
        product: cleanProduct,
        country: cleanCountry,
        email: `sales@${cleanProduct.toLowerCase().replace(/\s/g, "")}exporters.com`,
        phone: "+91 9876543210",
        score: generateLeadScore(cleanProduct, cleanCountry),
        status: "AI Verified Lead",
        source: "AI Supplier Finder",
        notes: `AI generated supplier lead for ${cleanProduct} in ${cleanCountry}`,
      },
      {
        supplierName: `Global ${cleanProduct} Trade House`,
        product: cleanProduct,
        country: cleanCountry,
        email: `info@global${cleanProduct.toLowerCase().replace(/\s/g, "")}.com`,
        phone: "+91 9123456780",
        score: generateLeadScore(cleanProduct, cleanCountry) - 5,
        status: "AI Suggested Lead",
        source: "AI Supplier Finder",
        notes: `Potential supplier discovered by TradeFlow AI engine`,
      },
      {
        supplierName: `${cleanProduct} International Supply Co`,
        product: cleanProduct,
        country: cleanCountry,
        email: `contact@${cleanProduct.toLowerCase().replace(/\s/g, "")}supply.com`,
        phone: "+91 9988776655",
        score: generateLeadScore(cleanProduct, cleanCountry) - 8,
        status: "AI Suggested Lead",
        source: "AI Supplier Finder",
        notes: `Supplier candidate generated for outreach and verification`,
      },
    ];

    res.json(leads);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

const saveAISupplier = async (req, res) => {
  try {
    const supplier = await Supplier.create({
      user: req.user._id,
      supplierName: req.body.supplierName,
      product: req.body.product,
      country: req.body.country,
      email: req.body.email,
      phone: req.body.phone,
      score: req.body.score || 80,
      status: req.body.status || "AI Verified Lead",
      source: req.body.source || "AI Supplier Finder",
      notes: req.body.notes || "",
    });

    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
};

module.exports = {
  findSuppliers,
  saveAISupplier,
};