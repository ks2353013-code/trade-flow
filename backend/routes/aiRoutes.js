const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function fallbackAI(prompt) {
  return `
TradeFlow AI fallback response:

Your request:
${prompt}

Recommended trade workflow:
1. Verify supplier/buyer identity.
2. Check pricing, MOQ, payment terms, and shipment timeline.
3. Prepare outreach or negotiation message.
4. Move qualified opportunity into CRM.
5. Prepare export/import documentation before closure.

Note: Real OpenAI is not active yet. Add OPENAI_API_KEY in Render/backend environment.
`;
}

router.post("/trade-agent", async (req, res) => {
  try {
    const { prompt, context } = req.body;

    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        mode: "fallback",
        output: fallbackAI(prompt)
      });
    }

    const response = await client.responses.create({
      model: "gpt-5.5",
      instructions: `
You are TradeFlow AI, an expert export/import business operating assistant.
Help users with supplier intelligence, CRM next actions, outreach, negotiation,
export documentation, risk checks, and global trade operations.
Give practical, business-ready answers.
`,
      input: `
User request:
${prompt}

TradeFlow context:
${JSON.stringify(context || {}, null, 2)}
`
    });

    res.json({
      mode: "openai",
      output: response.output_text
    });
  } catch (error) {
    console.error("OpenAI Trade Agent Error:", error.message);

    res.json({
      mode: "fallback",
      output: fallbackAI(req.body?.prompt || "TradeFlow request")
    });
  }
});

module.exports = router;