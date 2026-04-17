export const DATA_INTEGRITY_AUDITOR_PROMPT = `
You are the Data Integrity Auditor for InvoiceSaga.

You receive an audit scope — a set of tables, a module area, or a specific
concern such as "check journal balance invariants" — and you produce a
structured audit plan with SQL queries, findings, severity map, remediation
plan, and a final verdict.

Return STRICT JSON ONLY. No markdown, no explanations.

You are a Control-layer agent. Lead and Specialist agents propose changes;
Control agents like you evaluate the state of the system. Where the Data &
Ledger Lead designs schema changes, you audit the resulting data for
correctness. Where the Release Gate Agent asks "is it safe to deploy?", you
ask "is the data internally consistent?". You are invoked on demand, after
migrations, or before a release when data trust matters.

Your responsibilities:
- Generate SQL queries to check double-entry balance invariants, confirming
  that every journal_entry has matching debit and credit totals across its
  journal_lines
- Detect orphaned records — invoice_line_items without a parent invoice,
  journal_lines without a parent journal_entry, payments without an invoice,
  and similar dangling rows
- Verify referential integrity across foreign keys, including soft
  references that are not enforced at the database level
- Check RLS policy coverage — enumerate tables without policies, policies
  with gaps that expose rows across users, and policies that block legitimate
  access
- Detect duplicates such as duplicate invoice numbers per user, duplicate
  bill numbers per vendor, and duplicate external IDs from integrations
- Verify data consistency — invoice totals must match the sum of their line
  items, payment amounts must not exceed invoice totals, and bill totals
  must reconcile with their line items
- Produce actionable remediation SQL for each finding, flagging when a
  backup is required before running it
- Never modify data — you only audit and recommend. Remediation SQL is for
  the developer to review and run manually
- Never propose feature changes — that is the Data & Ledger Lead's role

Verdict semantics:
- "clean" — no issues found, data is internally consistent
- "issues_found" — only non-blocking issues, system is usable but should be
  cleaned up
- "action_required" — blocking issues present, remediation must run before
  further work depends on this data
- "critical_failure" — data corruption detected, halt dependent work until
  resolved

Your output must be actionable by a solo developer running queries in the
Supabase SQL Editor without further clarification.
`;

export const DATA_INTEGRITY_AUDITOR_SCHEMA = {
  name: "data_integrity_auditor_output",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "agent",
      "task_id",
      "objective_id",
      "summary",
      "scope",
      "audit_queries",
      "findings",
      "severity_map",
      "remediation_plan",
      "audit_verdict",
      "affected_files",
      "dependencies",
      "risks",
      "handoff",
      "status",
    ],
    properties: {
      agent: { type: "string", const: "data_integrity_auditor" },
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
            enum: [
              "full_audit",
              "module_audit",
              "balance_verification",
              "orphan_scan",
              "rls_audit",
              "post_migration_check",
            ],
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
      audit_queries: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "query_id",
            "description",
            "sql",
            "expected_result",
            "category",
          ],
          properties: {
            query_id: { type: "string", minLength: 1 },
            description: { type: "string", minLength: 1 },
            sql: { type: "string", minLength: 1 },
            expected_result: { type: "string", minLength: 1 },
            category: {
              type: "string",
              enum: [
                "balance_check",
                "orphan_detection",
                "referential_integrity",
                "rls_verification",
                "data_consistency",
                "duplicate_detection",
              ],
            },
          },
        },
      },
      findings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "finding_id",
            "related_query",
            "description",
            "severity",
            "affected_records",
            "evidence",
          ],
          properties: {
            finding_id: { type: "string", minLength: 1 },
            related_query: { type: "string", minLength: 1 },
            description: { type: "string", minLength: 1 },
            severity: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
            },
            affected_records: { type: "string", minLength: 1 },
            evidence: { type: "string", minLength: 1 },
          },
        },
      },
      severity_map: {
        type: "object",
        additionalProperties: false,
        required: [
          "critical_count",
          "high_count",
          "medium_count",
          "low_count",
          "overall_health",
        ],
        properties: {
          critical_count: { type: "integer" },
          high_count: { type: "integer" },
          medium_count: { type: "integer" },
          low_count: { type: "integer" },
          overall_health: {
            type: "string",
            enum: ["healthy", "degraded", "at_risk", "critical"],
          },
        },
      },
      remediation_plan: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "finding_id",
            "action",
            "description",
            "sql",
            "risk_level",
            "requires_backup",
          ],
          properties: {
            finding_id: { type: "string", minLength: 1 },
            action: {
              type: "string",
              enum: [
                "fix_query",
                "migration",
                "manual_review",
                "rls_update",
                "backfill",
                "delete_orphans",
                "no_action",
              ],
            },
            description: { type: "string", minLength: 1 },
            sql: { type: "string" },
            risk_level: { type: "string", enum: ["low", "medium", "high"] },
            requires_backup: { type: "boolean" },
          },
        },
      },
      audit_verdict: {
        type: "object",
        additionalProperties: false,
        required: [
          "verdict",
          "blocking_issues",
          "non_blocking_issues",
          "confidence",
          "rationale",
        ],
        properties: {
          verdict: {
            type: "string",
            enum: [
              "clean",
              "issues_found",
              "action_required",
              "critical_failure",
            ],
          },
          blocking_issues: { type: "array", items: { type: "string" } },
          non_blocking_issues: { type: "array", items: { type: "string" } },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          rationale: { type: "string", minLength: 1 },
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
                "shared",
                "integration",
                "test_infra",
              ],
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
              "release_gate_agent",
              "data_ledger_lead",
              "backend_integrations_lead",
              "security_trust_lead",
              "qa_regression_agent",
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
