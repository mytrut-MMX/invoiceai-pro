import OpenAI from "openai";
import { PRODUCT_WORKFLOW_LEAD_PROMPT } from "../lib/prompts/productWorkflowLead.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function validateInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Invalid request body.";
  }

  if (!body.objective_id || typeof body.objective_id !== "string") {
    return "Missing or invalid objective_id.";
  }

  if (!body.task_id || typeof body.task_id !== "string") {
    return "Missing or invalid task_id.";
  }

  if (!body.task_title || typeof body.task_title !== "string") {
    return "Missing or invalid task_title.";
  }

  if (!body.task_description || typeof body.task_description !== "string") {
    return "Missing or invalid task_description.";
  }

  if (!body.context || typeof body.context !== "object" || Array.isArray(body.context)) {
    return "Missing or invalid context object.";
  }

  return null;
}

function extractTextFromResponse(response) {
  if (response.output_text && typeof response.output_text === "string") {
    return response.output_text;
  }

  const parts = response.output || [];
  for (const item of parts) {
    if (!item || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}

function tryParseJson(content) {
  if (typeof content !== "string") return null;

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function validateAgentOutput(data, input) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "Model did not return a valid JSON object.";
  }

  if (data.agent !== "product_workflow_lead") {
    return "Invalid agent value.";
  }

  if (data.task_id !== input.task_id) {
    return "Returned task_id does not match input.";
  }

  if (data.objective_id !== input.objective_id) {
    return "Returned objective_id does not match input.";
  }

  const allowedStatus = [
    "ready_for_execution",
    "needs_clarification",
    "blocked_by_dependency",
  ];

  if (!allowedStatus.includes(data.status)) {
    return "Invalid status value.";
  }

  const allowedNextAgents = [
    "frontend_lead",
    "backend_lead",
    "qa_agent",
    "security_agent",
    "fullstack_lead",
    "human_review",
  ];

  if (
    !data.handoff ||
    typeof data.handoff !== "object" ||
    !allowedNextAgents.includes(data.handoff.recommended_next_agent)
  ) {
    return "Invalid handoff.recommended_next_agent value.";
  }

  if (!Array.isArray(data.business_rules) || data.business_rules.length < 1) {
    return "At least one business rule is required.";
  }

  if (!Array.isArray(data.edge_cases) || data.edge_cases.length < 1) {
    return "At least one edge case is required.";
  }

  if (!Array.isArray(data.acceptance_criteria) || data.acceptance_criteria.length < 1) {
    return "At least one acceptance criterion is required.";
  }

  if (
    !data.workflow ||
    !Array.isArray(data.workflow.user_flow) ||
    data.workflow.user_flow.length < 1
  ) {
    return "At least one user_flow step is required.";
  }

  if (
    !data.workflow ||
    !Array.isArray(data.workflow.system_flow) ||
    data.workflow.system_flow.length < 1
  ) {
    return "At least one system_flow step is required.";
  }

  return null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed.",
      });
    }

    const body = req.body;
    const inputError = validateInput(body);

    if (inputError) {
      return res.status(400).json({
        success: false,
        error: inputError,
      });
    }

    const userPayload = {
      objective_id: body.objective_id,
      task_id: body.task_id,
      task_title: body.task_title,
      task_description: body.task_description,
      context: body.context,
    };

    const response = await openai.responses.create({
      model: "gpt-5",
      input: [
        {
          role: "system",
          content: PRODUCT_WORKFLOW_LEAD_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify(userPayload),
        },
      ],
    });

    const text = extractTextFromResponse(response);

    if (!text) {
      return res.status(502).json({
        success: false,
        error: "Empty response from AI.",
      });
    }

    const parsed = tryParseJson(text);

    if (!parsed) {
      return res.status(502).json({
        success: false,
        error: "AI returned non-JSON content.",
        raw: text,
      });
    }

    const outputError = validateAgentOutput(parsed, userPayload);

    if (outputError) {
      return res.status(422).json({
        success: false,
        error: outputError,
        data: parsed,
      });
    }

    return res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error("PRODUCT_WORKFLOW_LEAD_ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Server error.",
    });
  }
}
