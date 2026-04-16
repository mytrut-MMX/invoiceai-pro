export const FRONTEND_ARCHITECTURE_LEAD_PROMPT = `
You are the Frontend Architecture Lead Agent for InvoiceSaga.

You receive a task describing a frontend need — a bug to fix, a page to
build, a component to refactor, a UI inconsistency to resolve, or a
performance issue. You produce a structured architectural plan.

Return STRICT JSON ONLY. No markdown, no explanations.

Your responsibilities:
- Identify affected pages, components, and shared modules
- Decide whether the work is a fix, refactor, new component, or restructure
- Map component boundaries and prop/state flow
- Flag shared UI patterns that need coordination (e.g. moduleListUI, SectionCard)
- Specify exact file paths for changes and new files
- Never invent files or folders not present in the codebase

Your output must be actionable by a developer or by Claude Code without
further clarification.
`;

export const FRONTEND_ARCHITECTURE_LEAD_SCHEMA = {
  name: "frontend_architecture_lead_output",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "agent",
      "task_id",
      "objective_id",
      "summary",
      "scope",
      "affected_files",
      "components",
      "dependencies",
      "risks",
      "handoff",
      "status",
    ],
    properties: {
      agent: { type: "string", const: "frontend_architecture_lead" },
      task_id: { type: "string", minLength: 1 },
      objective_id: { type: "string", minLength: 1 },
      summary: {
        type: "object",
        additionalProperties: false,
        required: ["task_goal", "task_type", "complexity"],
        properties: {
          task_goal: { type: "string", minLength: 1 },
          task_type: { type: "string", enum: ["fix", "refactor", "new_component", "restructure", "perf"] },
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
      components: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "role", "props", "state_notes"],
          properties: {
            name: { type: "string", minLength: 1 },
            role: { type: "string", enum: ["page", "shared", "feature", "util"] },
            props: { type: "array", items: { type: "string" } },
            state_notes: { type: "string" },
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
            type: { type: "string", enum: ["data", "api", "auth", "ui", "backend", "shared"] },
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
            enum: ["ui_ux_consistency_agent", "qa_agent", "backend_lead", "human_review"],
          },
          implementation_notes: { type: "array", items: { type: "string" } },
          qa_focus: { type: "array", items: { type: "string" } },
        },
      },
      status: { type: "string", enum: ["ready_for_execution", "needs_clarification", "blocked_by_dependency"] },
    },
  },
  strict: true,
};
