export const DATA_LEDGER_LEAD_PROMPT = `
You are the Data & Ledger Lead Agent for InvoiceSaga.

You receive tasks concerning the accounting data model, Supabase schema,
double-entry ledger rules, financial integrity, and posting logic. You
produce structured data-architecture decisions.

Return STRICT JSON ONLY. No markdown, no explanations.

Your responsibilities:
- Decide schema changes (migrations, columns, CHECKs, indexes, RLS)
- Map ledger entries to source documents (invoices, bills, payments, expenses)
- Enforce double-entry correctness and audit trail integrity
- Flag reconciliation and period-lock implications
- Specify exact file paths for migrations and code changes
- Never propose schema changes without stating RLS impact
- Never invent tables or columns not present in the codebase

Your output must be actionable by a developer or Claude Code without
further clarification.
`;

export const DATA_LEDGER_LEAD_SCHEMA = {
  name: "data_ledger_lead_output",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "agent",
      "task_id",
      "objective_id",
      "summary",
      "scope",
      "schema_changes",
      "ledger_rules",
      "integrity_checks",
      "affected_files",
      "rls_impact",
      "risks",
      "handoff",
      "status",
    ],
    properties: {
      agent: { type: "string", const: "data_ledger_lead" },
      task_id: { type: "string", minLength: 1 },
      objective_id: { type: "string", minLength: 1 },
      summary: {
        type: "object",
        additionalProperties: false,
        required: ["task_goal", "task_type", "complexity"],
        properties: {
          task_goal: { type: "string", minLength: 1 },
          task_type: { type: "string", enum: ["schema", "ledger_rule", "integrity_fix", "reconciliation", "audit"] },
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
      schema_changes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["table", "change_type", "sql_sketch", "rationale"],
          properties: {
            table: { type: "string", minLength: 1 },
            change_type: {
              type: "string",
              enum: ["create_table", "add_column", "alter_column", "add_index", "add_check", "add_rls", "drop"],
            },
            sql_sketch: { type: "string", minLength: 1 },
            rationale: { type: "string", minLength: 1 },
          },
        },
      },
      ledger_rules: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["rule_id", "description", "debit_account", "credit_account", "trigger_event"],
          properties: {
            rule_id: { type: "string", minLength: 1 },
            description: { type: "string", minLength: 1 },
            debit_account: { type: "string", minLength: 1 },
            credit_account: { type: "string", minLength: 1 },
            trigger_event: { type: "string", minLength: 1 },
          },
        },
      },
      integrity_checks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["check_id", "description", "sql_probe"],
          properties: {
            check_id: { type: "string", minLength: 1 },
            description: { type: "string", minLength: 1 },
            sql_probe: { type: "string", minLength: 1 },
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
      rls_impact: {
        type: "object",
        additionalProperties: false,
        required: ["affected_tables", "notes"],
        properties: {
          affected_tables: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
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
            enum: ["backend_lead", "qa_agent", "security_agent", "human_review"],
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
