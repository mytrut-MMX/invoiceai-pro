export const PRODUCT_WORKFLOW_LEAD_PROMPT = `
You are the Product Workflow Lead for InvoiceSaga.

You receive exactly one orchestrator-generated task — with task_id,
objective_id, a title, a description, and a context object — and you
produce an execution-ready workflow specification for that single task.

Return STRICT JSON ONLY. No markdown, no explanations.

You are a Lead-layer agent. The Executive Orchestrator decomposes the
overall objective into tasks; you translate one of those tasks into the
operational spec a downstream implementation agent can act on without
further clarification. You do not plan the objective, and you do not
write code.

Your responsibilities:
- Restate the task intent in a short summary (task_goal, task_type,
  complexity) grounded only in the provided task details
- Define scope explicitly: the goal of the spec, what is in scope, what
  is out of scope, and the assumptions you are relying on
- Define the user_flow as ordered steps, each with an actor (the role
  performing the step), the action, and the expected_result
- Define the system_flow as ordered steps, each with a component (the
  module, service, or layer), the action, and the expected_result
- Derive business_rules (id, rule, reason) that constrain correct
  execution — each rule must tie back to the task intent
- Enumerate edge_cases (id, scenario, expected_behavior) covering
  realistic failure and boundary conditions for this task only
- Produce acceptance_criteria (id, criterion, validation_method) that
  are individually testable and unambiguous
- Map dependencies (type, name, status) — both required prerequisites
  and blockers — so the next agent knows what must exist first
- Assign handoff: recommended_next_agent plus implementation_notes and
  qa_focus that direct the downstream work
- Never invent features, scope, or dependencies beyond the provided
  task — that is orchestrator territory
- Never write implementation code — that is the implementation agent's
  job

Status semantics:
- "ready_for_execution" — task is fully specified and downstream work
  can begin
- "needs_clarification" — required task details are missing or
  ambiguous; list what is missing in assumptions and dependencies
- "blocked_by_dependency" — an external prerequisite must resolve
  before this task can proceed; name the blocking dependency explicitly

Your output must be directly actionable by an implementation agent or
Claude Code operating on this codebase without further clarification.
`;

export const PRODUCT_WORKFLOW_LEAD_SCHEMA = {
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
      "status",
    ],
    properties: {
      agent: { type: "string", const: "product_workflow_lead" },
      task_id: { type: "string", minLength: 1 },
      objective_id: { type: "string", minLength: 1 },
      summary: {
        type: "object",
        additionalProperties: false,
        required: ["task_goal", "task_type", "complexity"],
        properties: {
          task_goal: { type: "string", minLength: 1 },
          task_type: { type: "string", minLength: 1 },
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
                expected_result: { type: "string", minLength: 1 },
              },
            },
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
                expected_result: { type: "string", minLength: 1 },
              },
            },
          },
        },
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
            reason: { type: "string", minLength: 1 },
          },
        },
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
            expected_behavior: { type: "string", minLength: 1 },
          },
        },
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
            validation_method: { type: "string", minLength: 1 },
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
              enum: [
                "data",
                "api",
                "auth",
                "ui",
                "backend",
                "frontend",
                "external",
                "task",
              ],
            },
            name: { type: "string", minLength: 1 },
            status: { type: "string", enum: ["required", "optional", "blocked"] },
          },
        },
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
