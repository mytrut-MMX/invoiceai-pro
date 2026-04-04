import OpenAI from "openai";
import { PRODUCT_WORKFLOW_LEAD_PROMPT } from "../lib/prompts/productWorkflowLead.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed.",
      });
    }

    const body = req.body || {};

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: PRODUCT_WORKFLOW_LEAD_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify(body),
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content;

    return res.status(200).json({
      success: true,
      raw: content || null,
    });
  } catch (error) {
    console.error("PRODUCT_WORKFLOW_LEAD_ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Server error.",
    });
  }
}
