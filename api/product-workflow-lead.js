import { PRODUCT_WORKFLOW_LEAD_PROMPT } from "../lib/prompts/productWorkflowLead.js";

export default async function handler(req, res) {
  try {
    return res.status(200).json({
      success: true,
      promptLoaded: typeof PRODUCT_WORKFLOW_LEAD_PROMPT === "string",
      message: "product-workflow-lead endpoint is alive"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error?.message || "Server error"
    });
  }
}
