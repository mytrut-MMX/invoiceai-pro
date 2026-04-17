export const QA_REGRESSION_AGENT_PROMPT = `
You are the QA Regression Agent for InvoiceSaga.

You receive a task describing a change to be verified — a PR diff summary, a
feature spec, a module touched, or a release candidate. You produce a
structured QA plan and verdict.

Return STRICT JSON ONLY. No markdown, no explanations.

You are a Control-layer agent. Lead and Specialist agents propose changes;
Control agents like you evaluate them. You are invoked before release gating.

Your responsibilities:
- Build a test matrix covering affected areas (unit, integration, e2e,
  manual), including test cases per area, new test files to add, and
  existing test files already covering the area
- Enumerate regression scenarios — what could break from this change, how
  to reproduce, expected behavior, and priority
- Flag coverage gaps in the existing test suite that this change exposes,
  with proactive recommendations
- Produce a pass/fail verdict with blocking and non-blocking issues
  distinguished, a confidence level, and a clear rationale
- Specify exact file paths for any new or modified test files
- Never invent test files, scenarios, or issues unrelated to the change

Distinguish blocking issues (regressions, broken invariants) from
non-blocking issues (coverage gaps, minor lint). Blocking issues force
a fail or blocked verdict; non-blocking issues permit conditional_pass.

Your output must be actionable by a developer or Claude Code without
further clarification.
`;

export const QA_REGRESSION_AGENT_SCHEMA = {
  name: "qa_regression_agent_output",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "agent",
      "task_id",
      "objective_id",
      "summary",
      "scope",
      "test_matrix",
      "regression_scenarios",
      "coverage_gaps",
      "pass_fail_verdict",
      "affected_files",
      "dependencies",
      "risks",
      "handoff",
      "status",
    ],
    properties: {
      agent: { type: "string", const: "qa_regression_agent" },
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
              "pr_review",
              "release_check",
              "feature_verification",
              "regression_hunt",
              "coverage_audit",
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
      test_matrix: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "area",
            "test_type",
            "test_cases",
            "test_files_to_add",
            "existing_test_files",
          ],
          properties: {
            area: { type: "string", minLength: 1 },
            test_type: {
              type: "string",
              enum: ["unit", "integration", "e2e", "manual"],
            },
            test_cases: { type: "array", items: { type: "string" } },
            test_files_to_add: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["path", "purpose", "covers_cases"],
                properties: {
                  path: { type: "string", minLength: 1 },
                  purpose: { type: "string", minLength: 1 },
                  covers_cases: { type: "array", items: { type: "string" } },
                },
              },
            },
            existing_test_files: { type: "array", items: { type: "string" } },
          },
        },
      },
      regression_scenarios: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "scenario",
            "affected_by",
            "expected_behavior",
            "reproduction_steps",
            "priority",
          ],
          properties: {
            scenario: { type: "string", minLength: 1 },
            affected_by: { type: "string", minLength: 1 },
            expected_behavior: { type: "string", minLength: 1 },
            reproduction_steps: { type: "array", items: { type: "string" } },
            priority: {
              type: "string",
              enum: ["low", "medium", "high", "critical"],
            },
          },
        },
      },
      coverage_gaps: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["area", "gap_description", "severity", "recommendation"],
          properties: {
            area: { type: "string", minLength: 1 },
            gap_description: { type: "string", minLength: 1 },
            severity: { type: "string", enum: ["low", "medium", "high"] },
            recommendation: { type: "string", minLength: 1 },
          },
        },
      },
      pass_fail_verdict: {
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
            enum: ["pass", "conditional_pass", "fail", "blocked"],
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
              "backend_integrations_lead",
              "frontend_architecture_lead",
              "data_ledger_lead",
              "security_trust_lead",
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
