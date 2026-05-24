const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

function fallbackAI(prompt) {
  return `
TradeFlow AI fallback response:

Your request:
${prompt}

Recommended workflow:
1. Verify supplier/buyer identity.
2. Check pricing, MOQ, payment terms, and shipment timeline.
3. Prepare outreach or negotiation message.
4. Move qualified opportunity into CRM.
5. Prepare export/import documentation before closure.
`;
}

router.post("/trade-agent", async (req, res) => {
  try {
    const { prompt, message, context } = req.body;
    const finalPrompt = prompt || message;

    if (!finalPrompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const client = getOpenAIClient();

    if (!client) {
      return res.json({
        mode: "fallback",
        output: fallbackAI(finalPrompt)
      });
    }

    const response = await client.responses.create({
      model: "gpt-5.5",
      instructions:
        "You are TradeFlow AI, an expert export/import business operating assistant.",
      input: `
User request:
${finalPrompt}

TradeFlow context:
${JSON.stringify(context || {}, null, 2)}
`
    });

    res.json({
      mode: "openai",
      output: response.output_text
    });
  } catch (error) {
    console.error("AI route error:", error.message);
    res.json({
      mode: "fallback",
      output: fallbackAI(req.body?.prompt || req.body?.message || "TradeFlow request")
    });
  }
});

router.post("/find-suppliers", async (req, res) => {
  const { product = "Product", country = "India" } = req.body;

  res.json([
    {
      supplierName: `${country} ${product} Trade Co.`,
      product,
      country,
      email: "sales@example.com",
      phone: "+910000000000",
      source: "TradeFlow AI Demo",
      notes: "Demo supplier lead. Verify before outreach.",
      score: 78,
      status: "Warm Lead"
    }
  ]);
});

router.post("/save-supplier", async (req, res) => {
  res.status(201).json({
    success: true,
    ...req.body
  });
});

module.exports = router;