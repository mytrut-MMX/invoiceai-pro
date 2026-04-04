import OpenAI from "openai";
import { PRODUCT_WORKFLOW_LEAD_PROMPT } from "../lib/prompts/productWorkflowLead.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PRODUCT_WORKFLOW_LEAD_SCHEMA = {
  name: "product_workflow_lead_output",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "agent",
      "task_id",
      "objective_id",
      "summary",
      "scope",
      "workflow",
      "business_rules",
      "edge_cases",
      "acceptance_criteria",
      "dependencies",
      "handoff",
      "status"
    ],
    properties: {
      agent: {
        type: "string",
        const: "product_workflow_lead"
      },
      task_id: {
        type: "string",
        minLength: 1
      },
      objective_id: {
        type: "string",
        minLength: 1
      },
      summary: {
        type: "object",
        additionalProperties: false,
        required: ["task_goal", "task_type", "complexity"],
        properties: {
          task_goal: { type: "string", minLength: 1 },
          task_type: { type: "string", minLength: 1 },
          complexity: {
            type: "string",
            enum: ["low", "medium", "high"]
          }
        }
      },
      scope: {
        type: "object",
        additionalProperties: false,
        required: ["goal", "in_scope", "out_of_scope", "assumptions"],
        properties: {
          goal: { type: "string", minLength: 1 },
          in_scope: { type: "array", items: { type: "string" } },
          out_of_scope: { type: "array", items: { type: "string" } },
          assumptions: { type: "array", items: { type: "string" } }
        }
      },
      workflow: {
        type: "object",
        additionalProperties: false,
        required: ["user_flow", "system_flow"],
        properties: {
          user_flow: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["step", "actor", "action", "expected_result"],
              properties: {
                step: { type: "integer", minimum: 1 },
                actor: { type: "string", minLength: 1 },
                action: { type: "string", minLength: 1 },
                expected_result: { type: "string", minLength: 1 }
              }
            }
          },
          system_flow: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["step", "component", "action", "expected_result"],
              properties: {
                step: { type: "integer", minimum: 1 },
                component: { type: "string", minLength: 1 },
                action: { type: "string", minLength: 1 },
                expected_result: { type: "string", minLength: 1 }
              }
            }
          }
        }
      },
      business_rules: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "rule", "reason"],
          properties: {
            id: { type: "string", minLength: 1 },
            rule: { type: "string", minLength: 1 },
            reason: { type: "string", minLength: 1 }
          }
        }
      },
      edge_cases: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "scenario", "expected_behavior"],
          properties: {
            id: { type: "string", minLength: 1 },
            scenario: { type: "string", minLength: 1 },
            expected_behavior: { type: "string", minLength: 1 }
          }
        }
      },
      acceptance_criteria: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "criterion", "validation_method"],
          properties: {
            id: { type: "string", minLength: 1 },
            criterion: { type: "string", minLength: 1 },
            validation_method: { type: "string", minLength: 1 }
          }
        }
      },
      dependencies: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["type", "name", "status"],
          properties: {
            type: {
              type: "string",
              enum: ["data", "api", "auth", "ui", "backend", "frontend", "external", "task"]
            },
            name: { type: "string", minLength: 1 },
            status: {
              type: "string",
              enum: ["required", "optional", "blocked"]
            }
          }
        }
      },
      handoff: {
        type: "object",
        additionalProperties: false,
        required: ["recommended_next_agent", "implementation_notes", "qa_focus"],
        properties: {
          recommended_next_agent: {
            type: "string",
            enum: [
              "frontend_lead",
              "backend_lead",
              "qa_agent",
              "security_agent",
              "fullstack_lead",
              "human_review"
            ]
          },
          implementation_notes: {
            type: "array",
            items: { type: "string" }
          },
          qa_focus: {
            type: "array",
            items: { type: "string" }
          }
        }
      },
      status: {
        type: "string",
        enum: ["ready_for_execution", "needs_clarification", "blocked_by_dependency"]
      }
    }
  },
  strict: true
};

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

function validateAgentOutput(data, input) {
  if (data.agent !== "product_workflow_lead") {
    return "Invalid agent value.";
  }
  if (data.task_id !== input.task_id) {
    return "Returned task_id does not match input.";
  }
  if (data.objective_id !== input.objective_id) {
    return "Returned objective_id does not match input.";
  }
  return null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Method not allowed."
      });
    }

    const inputError = validateInput(req.body);
    if (inputError) {
      return res.status(400).json({
        success: false,
        error: inputError
      });
    }

    const userPayload = {
      objective_id: req.body.objective_id,
      task_id: req.body.task_id,
      task_title: req.body.task_title,
      task_description: req.body.task_description,
      context: req.body.context
    };

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "developer",
          content: PRODUCT_WORKFLOW_LEAD_PROMPT
        },
        {
          role: "user",
          content: JSON.stringify(userPayload)
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: PRODUCT_WORKFLOW_LEAD_SCHEMA
      }
    });

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(502).json({
        success: false,
        error: "Empty response from AI."
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(502).json({
        success: false,
        error: "AI returned non-JSON content.",
        raw: content
      });
    }

    const outputError = validateAgentOutput(parsed, userPayload);
    if (outputError) {
      return res.status(422).json({
        success: false,
        error: outputError,
        data: parsed
      });
    }

    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from("agent_task_specs")
      .insert([
        {
          objective_id: parsed.objective_id,
          task_id: parsed.task_id,
          agent_name: parsed.agent,
          spec_payload: parsed,
          status: parsed.status
        }
      ])
      .select();

    if (insertError) {
      return res.status(500).json({
        success: false,
        error: insertError.message
      });
    }

    return res.status(200).json({
      success: true,
      data: parsed,
      saved: insertedRows?.[0] || null
    });
  } catch (error) {
    console.error("PRODUCT_WORKFLOW_LEAD_ERROR:", error);

    return res.status(500).json({
      success: false,
      error: error?.message || "Server error."
    });
  }
}
