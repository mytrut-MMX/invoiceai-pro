export const SECURITY_TRUST_LEAD_PROMPT = `
You are the Security & Trust Lead Agent for InvoiceSaga.

You receive a task describing a security or trust concern — an auth change,
a data exposure review, the security impact of a new integration, an HTTP
header or CSP change, an RLS policy review, or a compliance question. You
produce a structured security plan.

Return STRICT JSON ONLY. No markdown, no explanations.

Your responsibilities:
- Build a threat model for the change (STRIDE-style: spoofing, tampering,
  repudiation, information disclosure, denial of service, elevation of
  privilege)
- Analyze auth impact (sessions, tokens, Supabase RLS policies, affected
  flows)
- Enumerate exposure changes (env vars, endpoints, tables, columns, files,
  secrets) with current vs desired exposure
- Propose HTTP header / CSP changes grounded in the existing vercel.json
- Describe data handling (PII involvement, encryption at rest and in
  transit, retention policy)
- Flag UK GDPR, HMRC data protection, and PCI-DSS compliance implications
- Specify exact file paths for changes and new files
- Never invent files, env vars, tables, or policies not grounded in the
  codebase

Your output must be actionable by a developer or Claude Code without
further clarification.
`;

export const SECURITY_TRUST_LEAD_SCHEMA = {
  name: "security_trust_lead_output",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "agent",
      "task_id",
      "objective_id",
      "summary",
      "scope",
      "threat_model",
      "auth_impact",
      "exposure_analysis",
      "headers_changes",
      "data_handling",
      "compliance_notes",
      "affected_files",
      "dependencies",
      "risks",
      "handoff",
      "status",
    ],
    properties: {
      agent: { type: "string", const: "security_trust_lead" },
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
              "auth_change",
              "exposure_review",
              "header_change",
              "rls_review",
              "threat_analysis",
              "compliance_review",
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
      threat_model: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["threat", "attack_vector", "likelihood", "impact", "mitigation"],
          properties: {
            threat: { type: "string", minLength: 1 },
            attack_vector: { type: "string", minLength: 1 },
            likelihood: { type: "string", enum: ["low", "medium", "high"] },
            impact: { type: "string", enum: ["low", "medium", "high", "critical"] },
            mitigation: { type: "string", minLength: 1 },
          },
        },
      },
      auth_impact: {
        type: "object",
        additionalProperties: false,
        required: ["affected_flows", "session_changes", "rls_changes", "token_handling"],
        properties: {
          affected_flows: { type: "array", items: { type: "string" } },
          session_changes: { type: "string" },
          rls_changes: { type: "string" },
          token_handling: { type: "string" },
        },
      },
      exposure_analysis: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["asset", "asset_type", "current_exposure", "desired_exposure", "remediation"],
          properties: {
            asset: { type: "string", minLength: 1 },
            asset_type: {
              type: "string",
              enum: ["env_var", "endpoint", "table", "column", "file", "secret"],
            },
            current_exposure: { type: "string", minLength: 1 },
            desired_exposure: { type: "string", minLength: 1 },
            remediation: { type: "string", minLength: 1 },
          },
        },
      },
      headers_changes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["header", "current_value", "proposed_value", "reason"],
          properties: {
            header: { type: "string", minLength: 1 },
            current_value: { type: "string" },
            proposed_value: { type: "string", minLength: 1 },
            reason: { type: "string", minLength: 1 },
          },
        },
      },
      data_handling: {
        type: "object",
        additionalProperties: false,
        required: ["pii_involved", "encryption_at_rest", "encryption_in_transit", "retention_policy"],
        properties: {
          pii_involved: { type: "boolean" },
          encryption_at_rest: { type: "string" },
          encryption_in_transit: { type: "string" },
          retention_policy: { type: "string" },
        },
      },
      compliance_notes: { type: "array", items: { type: "string" } },
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
              "backend_integrations_lead",
              "data_ledger_lead",
              "qa_agent",
              "api_validation_agent",
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
