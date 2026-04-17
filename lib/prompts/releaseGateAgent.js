export const RELEASE_GATE_AGENT_PROMPT = `
You are the Release Gate Agent for InvoiceSaga.

You receive a release candidate description — a PR list, migration list, env
var changes, and an upstream QA verdict. You produce a structured
deploy-readiness assessment and a go/no-go verdict.

Return STRICT JSON ONLY. No markdown, no explanations.

You are a Control-layer agent. Lead and Specialist agents propose changes;
Control agents like you evaluate them. Where the QA Regression Agent asks
"is the code correct?", you ask "is it safe to deploy?". You are invoked
after QA and before a production deploy.

Your responsibilities:
- Verify every required env var and config key exists and is correctly
  scoped across Vercel, Supabase, third-party services, and CI
- Check migration state — enumerate pending migrations with risk level,
  confirm applied migrations match repo state, and detect drift
- Produce a concrete rollback plan with strategy, ordered steps, downtime
  estimate in minutes, data implications for writes between deploy and
  rollback, and whether a down migration is required
- Enumerate required sign-offs from other agents or human roles, each with
  status and the condition that must be true to approve
- Produce a go/no-go verdict distinguishing blocking from non-blocking
  issues, a confidence level, and a clear rationale
- Never approve a deploy with unresolved blocking issues
- Never propose code changes — you evaluate, you do not implement

Verdict semantics:
- "go" — all clear, safe to deploy
- "conditional_go" — non-blocking issues only, deploy may proceed with noted caveats
- "no_go" — blocking issues present, deploy must not proceed
- "blocked" — cannot evaluate due to missing inputs (PR list, QA verdict, migration list, env diff)

Your output must be actionable by a solo developer deploying via Vercel
and Supabase without further clarification.
`;

export const RELEASE_GATE_AGENT_SCHEMA = {
  name: "release_gate_agent_output",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "agent",
      "task_id",
      "objective_id",
      "summary",
      "scope",
      "env_verification",
      "migration_state",
      "rollback_plan",
      "sign_offs",
      "go_no_go_verdict",
      "affected_files",
      "dependencies",
      "risks",
      "handoff",
      "status",
    ],
    properties: {
      agent: { type: "string", const: "release_gate_agent" },
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
              "release_candidate",
              "hotfix_deploy",
              "migration_only",
              "rollback_assessment",
              "env_change",
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
      env_verification: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["variable", "context", "status", "notes"],
          properties: {
            variable: { type: "string", minLength: 1 },
            context: {
              type: "string",
              enum: ["vercel", "supabase", "third_party", "ci"],
            },
            status: {
              type: "string",
              enum: ["verified", "missing", "changed", "unused"],
            },
            notes: { type: "string", minLength: 1 },
          },
        },
      },
      migration_state: {
        type: "object",
        additionalProperties: false,
        required: [
          "pending_migrations",
          "applied_migrations_verified",
          "drift_detected",
          "drift_details",
        ],
        properties: {
          pending_migrations: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["file", "description", "risk_level"],
              properties: {
                file: { type: "string", minLength: 1 },
                description: { type: "string", minLength: 1 },
                risk_level: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                },
              },
            },
          },
          applied_migrations_verified: { type: "boolean" },
          drift_detected: { type: "boolean" },
          drift_details: { type: "string" },
        },
      },
      rollback_plan: {
        type: "object",
        additionalProperties: false,
        required: [
          "strategy",
          "steps",
          "estimated_downtime_minutes",
          "data_implications",
          "requires_migration_down",
        ],
        properties: {
          strategy: {
            type: "string",
            enum: [
              "revert_commit",
              "feature_flag",
              "migration_rollback",
              "manual_intervention",
              "no_rollback_needed",
            ],
          },
          steps: { type: "array", items: { type: "string" } },
          estimated_downtime_minutes: { type: "integer" },
          data_implications: { type: "string", minLength: 1 },
          requires_migration_down: { type: "boolean" },
        },
      },
      sign_offs: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["agent_or_role", "status", "condition"],
          properties: {
            agent_or_role: { type: "string", minLength: 1 },
            status: {
              type: "string",
              enum: ["approved", "pending", "rejected", "not_required"],
            },
            condition: { type: "string" },
          },
        },
      },
      go_no_go_verdict: {
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
            enum: ["go", "conditional_go", "no_go", "blocked"],
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
              "qa_regression_agent",
              "backend_integrations_lead",
              "security_trust_lead",
              "data_ledger_lead",
              "data_integrity_auditor",
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
