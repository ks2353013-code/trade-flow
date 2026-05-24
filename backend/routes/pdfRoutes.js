const express = require("express");
const PDFDocument = require("pdfkit");
const { usageTracker } = require("../middleware/usageMiddleware");
const {
  requirePlan
} = require("../middleware/subscriptionMiddleware");

const router = express.Router();

router.post("/invoice", requirePlan("Pro"), async (req, res) => {
  try {
    const {
      companyName = "TradeFlow Company",
      buyerName = "Buyer",
      product = "Product",
      quantity = "0",
      price = "0",
      country = "N/A",
      notes = ""
    } = req.body;

    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="tradeflow-invoice.pdf"'
    );

    doc.pipe(res);

    doc.fontSize(24).text("TradeFlow Invoice", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text(`Company: ${companyName}`);
    doc.text(`Buyer: ${buyerName}`);
    doc.text(`Product: ${product}`);
    doc.text(`Quantity: ${quantity}`);
    doc.text(`Price: ${price}`);
    doc.text(`Country: ${country}`);
    doc.moveDown();
    doc.text(`Notes: ${notes || "N/A"}`);

    doc.end();
  } catch (error) {
    console.error("PDF invoice error:", error.message);
    res.status(500).json({
      message: "Failed to generate invoice PDF"
    });
  }
});

router.post("/generate", requirePlan("Pro"), usageTracker("pdf_export"), async (req, res) => {
  try {
    const {
      title = "TradeFlow Report",
      content = "TradeFlow PDF Generated"
    } = req.body;

    const doc = new PDFDocument();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="tradeflow-report.pdf"'
    );

    doc.pipe(res);

    doc.fontSize(24).text(title, { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(content);

    doc.end();
  } catch (error) {
    console.error("PDF generation error:", error.message);
    res.status(500).json({
      message: "Failed to generate PDF"
    });
  }
});

module.exports = router;