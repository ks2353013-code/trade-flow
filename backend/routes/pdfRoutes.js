const express = require("express");
const PDFDocument = require("pdfkit");

const router = express.Router();

router.post("/generate", async (req, res) => {
  try {
    const {
      title = "TradeFlow Report",
      content = "TradeFlow PDF Generated"
    } = req.body;

    const doc = new PDFDocument();

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="tradeflow-report.pdf"'
    );

    doc.pipe(res);

    doc
      .fontSize(24)
      .text(title);

    doc.moveDown();

    doc
      .fontSize(14)
      .text(content);

    doc.end();
  } catch (error) {
    console.error(
      "PDF generation error:",
      error.message
    );

    res.status(500).json({
      message: "Failed to generate PDF"
    });
  }
});

module.exports = router;