export const BACKEND_INTEGRATIONS_LEAD_PROMPT = `
You are the Backend & Integrations Lead Agent for InvoiceSaga.

You receive a task describing a backend need — a new endpoint, integration
work, a webhook handler, an API refactor, error handling, or rate limiting.
You produce a structured backend and integration plan.

Return STRICT JSON ONLY. No markdown, no explanations.

Your responsibilities:
- Identify affected API routes (/api/*) and server-side files
- Map endpoints with method, path, auth, request/response shapes, status codes
- Enumerate third-party integrations (Paddle, HMRC, Companies House, Supabase
  admin, email providers) with auth mechanism and failure modes
- Specify webhooks separately with signature verification and idempotency
  approach
- Declare env vars required (names + purpose, not values)
- Design error handling strategy (retry policy, user-facing messages, logging)
- Flag rate limits (inbound throttling or outbound provider limits)
- Never invent files, routes, or env vars not grounded in the codebase

Your output must be actionable by a developer or Claude Code without further
clarification.
`;

export const BACKEND_INTEGRATIONS_LEAD_SCHEMA = {
  name: "backend_integrations_lead_output",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "agent",
      "task_id",
      "objective_id",
      "summary",
      "scope",
      "endpoints",
      "integrations",
      "webhooks",
      "affected_files",
      "error_handling",
      "rate_limits",
      "env_vars_needed",
      "dependencies",
      "risks",
      "handoff",
      "status",
    ],
    properties: {
      agent: { type: "string", const: "backend_integrations_lead" },
      task_id: { type: "string", minLength: 1 },
      objective_id: { type: "string", minLength: 1 },
      summary: {
        type: "object",
        additionalProperties: false,
        required: ["task_goal", "task_type", "complexity"],
        properties: {
          task_goal: { type: "string", minLength: 1 },
          task_type: {
            type: "string",
            enum: ["new_endpoint", "refactor", "integration", "webhook", "error_handling", "perf"],
          },
          complexity: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
      scope: {
        type: "object",
        additionalProperties: false,
        required: ["goal", "in_scope", "out_of_scope", "assumptions"],
        properties: {
          goal: { type: "string", minLength: 1 },
          in_scope: { type: "array", items: { type: "string" } },
          out_of_scope: { type: "array", items: { type: "string" } },
          assumptions: { type: "array", items: { type: "string" } },
        },
      },
      endpoints: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "path",
            "method",
            "purpose",
            "auth_required",
            "request_shape",
            "response_shape",
            "status_codes",
          ],
          properties: {
            path: { type: "string", minLength: 1 },
            method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
            purpose: { type: "string", minLength: 1 },
            auth_required: { type: "boolean" },
            request_shape: { type: "string" },
            response_shape: { type: "string" },
            status_codes: { type: "array", items: { type: "string" } },
          },
        },
      },
      integrations: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "direction", "auth_mechanism", "failure_modes"],
          properties: {
            name: { type: "string", minLength: 1 },
            direction: { type: "string", enum: ["inbound", "outbound", "bidirectional"] },
            auth_mechanism: { type: "string", minLength: 1 },
            failure_modes: { type: "array", items: { type: "string" } },
          },
        },
      },
      webhooks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["provider", "endpoint", "signature_verification", "idempotency_approach"],
          properties: {
            provider: { type: "string", minLength: 1 },
            endpoint: { type: "string", minLength: 1 },
            signature_verification: { type: "string", minLength: 1 },
            idempotency_approach: { type: "string", minLength: 1 },
          },
        },
      },
      affected_files: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["path", "change_type", "reason"],
          properties: {
            path: { type: "string", minLength: 1 },
            change_type: { type: "string", enum: ["create", "modify", "delete"] },
            reason: { type: "string", minLength: 1 },
          },
        },
      },
      error_handling: {
        type: "object",
        additionalProperties: false,
        required: ["strategy", "retry_policy", "user_facing_messages", "logging_approach"],
        properties: {
          strategy: { type: "string", minLength: 1 },
          retry_policy: { type: "string", minLength: 1 },
          user_facing_messages: { type: "array", items: { type: "string" } },
          logging_approach: { type: "string", minLength: 1 },
        },
      },
      rate_limits: {
        type: "object",
        additionalProperties: false,
        required: ["inbound_limits", "outbound_limits", "backoff_strategy"],
        properties: {
          inbound_limits: { type: "array", items: { type: "string" } },
          outbound_limits: { type: "array", items: { type: "string" } },
          backoff_strategy: { type: "string" },
        },
      },
      env_vars_needed: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "purpose", "required"],
          properties: {
            name: { type: "string", minLength: 1 },
            purpose: { type: "string", minLength: 1 },
            required: { type: "boolean" },
          },
        },
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
              enum: ["data", "api", "auth", "ui", "backend", "shared", "integration"],
            },
            name: { type: "string", minLength: 1 },
            status: { type: "string", enum: ["required", "optional", "blocked"] },
          },
        },
      },
      risks: { type: "array", items: { type: "string" } },
      handoff: {
        type: "object",
        additionalProperties: false,
        required: ["recommended_next_agent", "implementation_notes", "qa_focus"],
        properties: {
          recommended_next_agent: {
            type: "string",
            enum: [
              "security_trust_lead",
              "api_validation_agent",
              "qa_agent",
              "data_ledger_lead",
              "human_review",
            ],
          },
          implementation_notes: { type: "array", items: { type: "string" } },
          qa_focus: { type: "array", items: { type: "string" } },
        },
      },
      status: {
        type: "string",
        enum: ["ready_for_execution", "needs_clarification", "blocked_by_dependency"],
      },
    },
  },
  strict: true,
};
