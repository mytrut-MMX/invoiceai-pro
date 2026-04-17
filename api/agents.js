/**
 * Unified AI agent endpoint — orchestrator + product workflow lead.
 *
 * Replaces:  orchestrator.js          (POST /api/orchestrator)
 *            product-workflow-lead.js  (POST /api/product-workflow-lead)
 *
 * Dispatch:  by URL path via vercel.json rewrites.
 *            Falls back to body.agent ('orchestrator' | 'product-workflow-lead').
 */
import { createHmac, timingSafeEqual } from "crypto";
import OpenAI from "openai";
import { PRODUCT_WORKFLOW_LEAD_PROMPT } from "../lib/prompts/productWorkflowLead.js";
import { FRONTEND_ARCHITECTURE_LEAD_PROMPT, FRONTEND_ARCHITECTURE_LEAD_SCHEMA } from "../lib/prompts/frontendArchitectureLead.js";
import { DATA_LEDGER_LEAD_PROMPT, DATA_LEDGER_LEAD_SCHEMA } from "../lib/prompts/dataLedgerLead.js";
import { BACKEND_INTEGRATIONS_LEAD_PROMPT, BACKEND_INTEGRATIONS_LEAD_SCHEMA } from "../lib/prompts/backendIntegrationsLead.js";
import { SECURITY_TRUST_LEAD_PROMPT, SECURITY_TRUST_LEAD_SCHEMA } from "../lib/prompts/securityTrustLead.js";
import { QA_REGRESSION_AGENT_PROMPT, QA_REGRESSION_AGENT_SCHEMA } from "../lib/prompts/qaRegressionAgent.js";
import { RELEASE_GATE_AGENT_PROMPT, RELEASE_GATE_AGENT_SCHEMA } from "../lib/prompts/releaseGateAgent.js";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { withRateLimit } from './_lib/with-rate-limit.js';

// ─── Shared auth ────────────────────────────────────────────────────────────

function verifyAdminToken(token, secret) {
  if (!token || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot === -1) return false;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(sig);
  if (expectedBuf.length !== sigBuf.length) return false;
  if (!timingSafeEqual(expectedBuf, sigBuf)) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    return payload.admin === true && payload.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

function detectAgent(req) {
  const url = req.url || '';
  if (url.includes('product-workflow-lead')) return 'product-workflow-lead';
  if (url.includes('frontend-architecture-lead')) return 'frontend-architecture-lead';
  if (url.includes('data-ledger-lead')) return 'data-ledger-lead';
  if (url.includes('backend-integrations-lead')) return 'backend-integrations-lead';
  if (url.includes('security-trust-lead')) return 'security-trust-lead';
  if (url.includes('qa-regression-agent')) return 'qa-regression-agent';
  if (url.includes('release-gate-agent')) return 'release-gate-agent';
  if (url.includes('orchestrator')) return 'orchestrator';
  return req.body?.agent || 'orchestrator';
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

async function handleOrchestrator(req, res) {
  const { title, objective, context } = req.body || {};
  if (!objective || typeof objective !== "string") return res.status(400).json({ error: "objective is required" });
  if (title && typeof title !== "string") return res.status(400).json({ error: "title must be a string" });
  if (context && (typeof context !== "object" || Array.isArray(context))) return res.status(400).json({ error: "context must be an object" });

  const safeTitle = (title || "").trim().slice(0, 200);
  const safeObjective = objective.trim().slice(0, 4000);
  const safeContext = context || {};

  const prompt = `
You are the Executive Orchestrator Agent for InvoiceSaga.

Return STRICT JSON ONLY.
Do not include markdown.
Do not include explanations.

Use exactly this shape:
{
  "initiatives": [
    { "id": "INIT-1", "title": "..." }
  ],
  "tasks": [
    {
      "id": "TASK-1",
      "title": "...",
      "agent": "...",
      "priority": "high",
      "depends_on": []
    }
  ],
  "risks": ["..."],
  "status": {
    "overall_status": "pending",
    "blockers": [],
    "next_focus": "TASK-1"
  }
}

Allowed agents:
- Product Workflow Lead
- Frontend Architecture Lead
- Backend & Integrations Lead
- Data & Ledger Lead
- Security & Trust Lead
- QA Regression Agent
- Release Gate Agent

Title:
${safeTitle}

Objective:
${safeObjective}

Context:
${JSON.stringify(safeContext)}
`;

  try {
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-5", input: prompt }),
    });
    const aiData = await aiResponse.json();
    if (!aiResponse.ok) return res.status(500).json({ error: "OpenAI HTTP error", status: aiResponse.status });

    const text = aiData?.output?.find(x => x.type === "message")?.content?.[0]?.text || "";
    let parsed;
    try { parsed = JSON.parse(text); } catch { return res.status(500).json({ error: "Model did not return valid JSON" }); }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return res.status(500).json({ error: "Supabase env vars missing" });

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/agent_objectives`, {
      method: "POST",
      headers: { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify([{ title: safeTitle || "Untitled objective", objective: safeObjective, context: safeContext, status: parsed?.status?.overall_status || "pending" }]),
    });
    const inserted = await insertResponse.json();
    if (!insertResponse.ok) return res.status(500).json({ error: "Failed to save objective" });

    const objectiveId = inserted[0]?.id;
    const tasksToInsert = (parsed.tasks || []).map(task => ({
      objective_id: objectiveId, title: String(task.title || "").slice(0, 500),
      agent: String(task.agent || "").slice(0, 200), priority: String(task.priority || "medium").slice(0, 20),
      depends_on: Array.isArray(task.depends_on) ? task.depends_on : [], status: "pending",
    }));

    let insertedTasks = [];
    if (tasksToInsert.length > 0) {
      const taskInsertResponse = await fetch(`${supabaseUrl}/rest/v1/agent_tasks`, {
        method: "POST",
        headers: { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", "Prefer": "return=representation" },
        body: JSON.stringify(tasksToInsert),
      });
      insertedTasks = await taskInsertResponse.json();
      if (!taskInsertResponse.ok) return res.status(500).json({ error: "Objective saved but failed to save tasks" });
    }

    const logResponse = await fetch(`${supabaseUrl}/rest/v1/agent_logs`, {
      method: "POST",
      headers: { "apikey": serviceRoleKey, "Authorization": `Bearer ${serviceRoleKey}`, "Content-Type": "application/json", "Prefer": "return=representation" },
      body: JSON.stringify([{ agent_name: "Executive Orchestrator Agent", objective_id: objectiveId, input_payload: { title: safeTitle || null, objective: safeObjective, context: safeContext }, output_payload: parsed }]),
    });
    const insertedLogs = await logResponse.json();
    if (!logResponse.ok) return res.status(500).json({ error: "Objective and tasks saved, but failed to save logs" });

    return res.status(200).json({ ok: true, objective_saved: inserted[0], tasks_saved_count: insertedTasks.length, log_saved: insertedLogs[0]?.id || null, result: parsed });
  } catch (err) {
    console.error('[orchestrator] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ─── Product Workflow Lead ──────────────────────────────────────────────────

const PRODUCT_WORKFLOW_LEAD_SCHEMA = {
  name: "product_workflow_lead_output",
  schema: {
    type: "object", additionalProperties: false,
    required: ["agent","task_id","objective_id","summary","scope","workflow","business_rules","edge_cases","acceptance_criteria","dependencies","handoff","status"],
    properties: {
      agent: { type: "string", const: "product_workflow_lead" },
      task_id: { type: "string", minLength: 1 },
      objective_id: { type: "string", minLength: 1 },
      summary: { type: "object", additionalProperties: false, required: ["task_goal","task_type","complexity"], properties: { task_goal: { type: "string", minLength: 1 }, task_type: { type: "string", minLength: 1 }, complexity: { type: "string", enum: ["low","medium","high"] } } },
      scope: { type: "object", additionalProperties: false, required: ["goal","in_scope","out_of_scope","assumptions"], properties: { goal: { type: "string", minLength: 1 }, in_scope: { type: "array", items: { type: "string" } }, out_of_scope: { type: "array", items: { type: "string" } }, assumptions: { type: "array", items: { type: "string" } } } },
      workflow: { type: "object", additionalProperties: false, required: ["user_flow","system_flow"], properties: { user_flow: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["step","actor","action","expected_result"], properties: { step: { type: "integer", minimum: 1 }, actor: { type: "string", minLength: 1 }, action: { type: "string", minLength: 1 }, expected_result: { type: "string", minLength: 1 } } } }, system_flow: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["step","component","action","expected_result"], properties: { step: { type: "integer", minimum: 1 }, component: { type: "string", minLength: 1 }, action: { type: "string", minLength: 1 }, expected_result: { type: "string", minLength: 1 } } } } } },
      business_rules: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["id","rule","reason"], properties: { id: { type: "string", minLength: 1 }, rule: { type: "string", minLength: 1 }, reason: { type: "string", minLength: 1 } } } },
      edge_cases: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["id","scenario","expected_behavior"], properties: { id: { type: "string", minLength: 1 }, scenario: { type: "string", minLength: 1 }, expected_behavior: { type: "string", minLength: 1 } } } },
      acceptance_criteria: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["id","criterion","validation_method"], properties: { id: { type: "string", minLength: 1 }, criterion: { type: "string", minLength: 1 }, validation_method: { type: "string", minLength: 1 } } } },
      dependencies: { type: "array", items: { type: "object", additionalProperties: false, required: ["type","name","status"], properties: { type: { type: "string", enum: ["data","api","auth","ui","backend","frontend","external","task"] }, name: { type: "string", minLength: 1 }, status: { type: "string", enum: ["required","optional","blocked"] } } } },
      handoff: { type: "object", additionalProperties: false, required: ["recommended_next_agent","implementation_notes","qa_focus"], properties: { recommended_next_agent: { type: "string", enum: ["frontend_lead","backend_lead","qa_agent","security_agent","fullstack_lead","human_review"] }, implementation_notes: { type: "array", items: { type: "string" } }, qa_focus: { type: "array", items: { type: "string" } } } },
      status: { type: "string", enum: ["ready_for_execution","needs_clarification","blocked_by_dependency"] },
    },
  },
  strict: true,
};

function validatePwlInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Invalid request body.";
  if (!body.objective_id || typeof body.objective_id !== "string") return "Missing or invalid objective_id.";
  if (!body.task_id || typeof body.task_id !== "string") return "Missing or invalid task_id.";
  if (!body.task_title || typeof body.task_title !== "string") return "Missing or invalid task_title.";
  if (!body.task_description || typeof body.task_description !== "string") return "Missing or invalid task_description.";
  if (!body.context || typeof body.context !== "object" || Array.isArray(body.context)) return "Missing or invalid context object.";
  return null;
}

async function handleProductWorkflowLead(req, res) {
  const inputError = validatePwlInput(req.body);
  if (inputError) return res.status(400).json({ success: false, error: inputError });

  const userPayload = {
    objective_id: req.body.objective_id, task_id: req.body.task_id,
    task_title: req.body.task_title, task_description: req.body.task_description,
    context: req.body.context,
  };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "developer", content: PRODUCT_WORKFLOW_LEAD_PROMPT },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      response_format: { type: "json_schema", json_schema: PRODUCT_WORKFLOW_LEAD_SCHEMA },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ success: false, error: "Empty response from AI." });

    let parsed;
    try { parsed = JSON.parse(content); } catch { return res.status(502).json({ success: false, error: "AI returned non-JSON content.", raw: content }); }

    if (parsed.agent !== "product_workflow_lead") return res.status(422).json({ success: false, error: "Invalid agent value.", data: parsed });
    if (parsed.task_id !== userPayload.task_id) return res.status(422).json({ success: false, error: "Returned task_id does not match input.", data: parsed });
    if (parsed.objective_id !== userPayload.objective_id) return res.status(422).json({ success: false, error: "Returned objective_id does not match input.", data: parsed });

    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from("agent_task_specs")
      .insert([{ objective_id: parsed.objective_id, task_id: parsed.task_id, agent_name: parsed.agent, spec_payload: parsed, status: parsed.status }])
      .select();

    if (insertError) return res.status(500).json({ success: false, error: insertError.message });
    return res.status(200).json({ success: true, data: parsed, saved: insertedRows?.[0] || null });
  } catch (error) {
    console.error('[product-workflow-lead] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── Frontend Architecture Lead ─────────────────────────────────────────────

function validateFalInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Invalid request body.";
  if (!body.objective_id || typeof body.objective_id !== "string") return "Missing or invalid objective_id.";
  if (!body.task_id || typeof body.task_id !== "string") return "Missing or invalid task_id.";
  if (!body.task_title || typeof body.task_title !== "string") return "Missing or invalid task_title.";
  if (!body.task_description || typeof body.task_description !== "string") return "Missing or invalid task_description.";
  if (!body.context || typeof body.context !== "object" || Array.isArray(body.context)) return "Missing or invalid context object.";
  return null;
}

async function handleFrontendArchitectureLead(req, res) {
  const inputError = validateFalInput(req.body);
  if (inputError) return res.status(400).json({ success: false, error: inputError });

  const userPayload = {
    objective_id: req.body.objective_id, task_id: req.body.task_id,
    task_title: req.body.task_title, task_description: req.body.task_description,
    context: req.body.context,
  };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "developer", content: FRONTEND_ARCHITECTURE_LEAD_PROMPT },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      response_format: { type: "json_schema", json_schema: FRONTEND_ARCHITECTURE_LEAD_SCHEMA },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ success: false, error: "Empty response from AI." });

    let parsed;
    try { parsed = JSON.parse(content); } catch { return res.status(502).json({ success: false, error: "AI returned non-JSON content.", raw: content }); }

    if (parsed.agent !== "frontend_architecture_lead") return res.status(422).json({ success: false, error: "Invalid agent value.", data: parsed });
    if (parsed.task_id !== userPayload.task_id) return res.status(422).json({ success: false, error: "Returned task_id does not match input.", data: parsed });
    if (parsed.objective_id !== userPayload.objective_id) return res.status(422).json({ success: false, error: "Returned objective_id does not match input.", data: parsed });

    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from("agent_task_specs")
      .insert([{ objective_id: parsed.objective_id, task_id: parsed.task_id, agent_name: parsed.agent, spec_payload: parsed, status: parsed.status }])
      .select();

    if (insertError) return res.status(500).json({ success: false, error: insertError.message });
    return res.status(200).json({ success: true, data: parsed, saved: insertedRows?.[0] || null });
  } catch (error) {
    console.error('[frontend-architecture-lead] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── Data & Ledger Lead ─────────────────────────────────────────────────────

function validateDllInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Invalid request body.";
  if (!body.objective_id || typeof body.objective_id !== "string") return "Missing or invalid objective_id.";
  if (!body.task_id || typeof body.task_id !== "string") return "Missing or invalid task_id.";
  if (!body.task_title || typeof body.task_title !== "string") return "Missing or invalid task_title.";
  if (!body.task_description || typeof body.task_description !== "string") return "Missing or invalid task_description.";
  if (!body.context || typeof body.context !== "object" || Array.isArray(body.context)) return "Missing or invalid context object.";
  return null;
}

async function handleDataLedgerLead(req, res) {
  const inputError = validateDllInput(req.body);
  if (inputError) return res.status(400).json({ success: false, error: inputError });

  const userPayload = {
    objective_id: req.body.objective_id, task_id: req.body.task_id,
    task_title: req.body.task_title, task_description: req.body.task_description,
    context: req.body.context,
  };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "developer", content: DATA_LEDGER_LEAD_PROMPT },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      response_format: { type: "json_schema", json_schema: DATA_LEDGER_LEAD_SCHEMA },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ success: false, error: "Empty response from AI." });

    let parsed;
    try { parsed = JSON.parse(content); } catch { return res.status(502).json({ success: false, error: "AI returned non-JSON content.", raw: content }); }

    if (parsed.agent !== "data_ledger_lead") return res.status(422).json({ success: false, error: "Invalid agent value.", data: parsed });
    if (parsed.task_id !== userPayload.task_id) return res.status(422).json({ success: false, error: "Returned task_id does not match input.", data: parsed });
    if (parsed.objective_id !== userPayload.objective_id) return res.status(422).json({ success: false, error: "Returned objective_id does not match input.", data: parsed });

    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from("agent_task_specs")
      .insert([{ objective_id: parsed.objective_id, task_id: parsed.task_id, agent_name: parsed.agent, spec_payload: parsed, status: parsed.status }])
      .select();

    if (insertError) return res.status(500).json({ success: false, error: insertError.message });
    return res.status(200).json({ success: true, data: parsed, saved: insertedRows?.[0] || null });
  } catch (error) {
    console.error('[data-ledger-lead] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── Backend & Integrations Lead ───────────────────────────────────────────

function validateBilInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Invalid request body.";
  if (!body.objective_id || typeof body.objective_id !== "string") return "Missing or invalid objective_id.";
  if (!body.task_id || typeof body.task_id !== "string") return "Missing or invalid task_id.";
  if (!body.task_title || typeof body.task_title !== "string") return "Missing or invalid task_title.";
  if (!body.task_description || typeof body.task_description !== "string") return "Missing or invalid task_description.";
  if (!body.context || typeof body.context !== "object" || Array.isArray(body.context)) return "Missing or invalid context object.";
  return null;
}

async function handleBackendIntegrationsLead(req, res) {
  const inputError = validateBilInput(req.body);
  if (inputError) return res.status(400).json({ success: false, error: inputError });

  const userPayload = {
    objective_id: req.body.objective_id, task_id: req.body.task_id,
    task_title: req.body.task_title, task_description: req.body.task_description,
    context: req.body.context,
  };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "developer", content: BACKEND_INTEGRATIONS_LEAD_PROMPT },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      response_format: { type: "json_schema", json_schema: BACKEND_INTEGRATIONS_LEAD_SCHEMA },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ success: false, error: "Empty response from AI." });

    let parsed;
    try { parsed = JSON.parse(content); } catch { return res.status(502).json({ success: false, error: "AI returned non-JSON content.", raw: content }); }

    if (parsed.agent !== "backend_integrations_lead") return res.status(422).json({ success: false, error: "Invalid agent value.", data: parsed });
    if (parsed.task_id !== userPayload.task_id) return res.status(422).json({ success: false, error: "Returned task_id does not match input.", data: parsed });
    if (parsed.objective_id !== userPayload.objective_id) return res.status(422).json({ success: false, error: "Returned objective_id does not match input.", data: parsed });

    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from("agent_task_specs")
      .insert([{ objective_id: parsed.objective_id, task_id: parsed.task_id, agent_name: parsed.agent, spec_payload: parsed, status: parsed.status }])
      .select();

    if (insertError) return res.status(500).json({ success: false, error: insertError.message });
    return res.status(200).json({ success: true, data: parsed, saved: insertedRows?.[0] || null });
  } catch (error) {
    console.error('[backend-integrations-lead] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── Security & Trust Lead ──────────────────────────────────────────────────

function validateStlInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Invalid request body.";
  if (!body.objective_id || typeof body.objective_id !== "string") return "Missing or invalid objective_id.";
  if (!body.task_id || typeof body.task_id !== "string") return "Missing or invalid task_id.";
  if (!body.task_title || typeof body.task_title !== "string") return "Missing or invalid task_title.";
  if (!body.task_description || typeof body.task_description !== "string") return "Missing or invalid task_description.";
  if (!body.context || typeof body.context !== "object" || Array.isArray(body.context)) return "Missing or invalid context object.";
  return null;
}

async function handleSecurityTrustLead(req, res) {
  const inputError = validateStlInput(req.body);
  if (inputError) return res.status(400).json({ success: false, error: inputError });

  const userPayload = {
    objective_id: req.body.objective_id, task_id: req.body.task_id,
    task_title: req.body.task_title, task_description: req.body.task_description,
    context: req.body.context,
  };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "developer", content: SECURITY_TRUST_LEAD_PROMPT },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      response_format: { type: "json_schema", json_schema: SECURITY_TRUST_LEAD_SCHEMA },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ success: false, error: "Empty response from AI." });

    let parsed;
    try { parsed = JSON.parse(content); } catch { return res.status(502).json({ success: false, error: "AI returned non-JSON content.", raw: content }); }

    if (parsed.agent !== "security_trust_lead") return res.status(422).json({ success: false, error: "Invalid agent value.", data: parsed });
    if (parsed.task_id !== userPayload.task_id) return res.status(422).json({ success: false, error: "Returned task_id does not match input.", data: parsed });
    if (parsed.objective_id !== userPayload.objective_id) return res.status(422).json({ success: false, error: "Returned objective_id does not match input.", data: parsed });

    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from("agent_task_specs")
      .insert([{ objective_id: parsed.objective_id, task_id: parsed.task_id, agent_name: parsed.agent, spec_payload: parsed, status: parsed.status }])
      .select();

    if (insertError) return res.status(500).json({ success: false, error: insertError.message });
    return res.status(200).json({ success: true, data: parsed, saved: insertedRows?.[0] || null });
  } catch (error) {
    console.error('[security-trust-lead] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── QA Regression Agent ────────────────────────────────────────────────────

function validateQraInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Invalid request body.";
  if (!body.objective_id || typeof body.objective_id !== "string") return "Missing or invalid objective_id.";
  if (!body.task_id || typeof body.task_id !== "string") return "Missing or invalid task_id.";
  if (!body.task_title || typeof body.task_title !== "string") return "Missing or invalid task_title.";
  if (!body.task_description || typeof body.task_description !== "string") return "Missing or invalid task_description.";
  if (!body.context || typeof body.context !== "object" || Array.isArray(body.context)) return "Missing or invalid context object.";
  return null;
}

async function handleQaRegressionAgent(req, res) {
  const inputError = validateQraInput(req.body);
  if (inputError) return res.status(400).json({ success: false, error: inputError });

  const userPayload = {
    objective_id: req.body.objective_id, task_id: req.body.task_id,
    task_title: req.body.task_title, task_description: req.body.task_description,
    context: req.body.context,
  };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "developer", content: QA_REGRESSION_AGENT_PROMPT },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      response_format: { type: "json_schema", json_schema: QA_REGRESSION_AGENT_SCHEMA },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ success: false, error: "Empty response from AI." });

    let parsed;
    try { parsed = JSON.parse(content); } catch { return res.status(502).json({ success: false, error: "AI returned non-JSON content.", raw: content }); }

    if (parsed.agent !== "qa_regression_agent") return res.status(422).json({ success: false, error: "Invalid agent value.", data: parsed });
    if (parsed.task_id !== userPayload.task_id) return res.status(422).json({ success: false, error: "Returned task_id does not match input.", data: parsed });
    if (parsed.objective_id !== userPayload.objective_id) return res.status(422).json({ success: false, error: "Returned objective_id does not match input.", data: parsed });

    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from("agent_task_specs")
      .insert([{ objective_id: parsed.objective_id, task_id: parsed.task_id, agent_name: parsed.agent, spec_payload: parsed, status: parsed.status }])
      .select();

    if (insertError) return res.status(500).json({ success: false, error: insertError.message });
    return res.status(200).json({ success: true, data: parsed, saved: insertedRows?.[0] || null });
  } catch (error) {
    console.error('[qa-regression-agent] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── Release Gate Agent ─────────────────────────────────────────────────────

function validateRgaInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Invalid request body.";
  if (!body.objective_id || typeof body.objective_id !== "string") return "Missing or invalid objective_id.";
  if (!body.task_id || typeof body.task_id !== "string") return "Missing or invalid task_id.";
  if (!body.task_title || typeof body.task_title !== "string") return "Missing or invalid task_title.";
  if (!body.task_description || typeof body.task_description !== "string") return "Missing or invalid task_description.";
  if (!body.context || typeof body.context !== "object" || Array.isArray(body.context)) return "Missing or invalid context object.";
  return null;
}

async function handleReleaseGateAgent(req, res) {
  const inputError = validateRgaInput(req.body);
  if (inputError) return res.status(400).json({ success: false, error: inputError });

  const userPayload = {
    objective_id: req.body.objective_id, task_id: req.body.task_id,
    task_title: req.body.task_title, task_description: req.body.task_description,
    context: req.body.context,
  };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "developer", content: RELEASE_GATE_AGENT_PROMPT },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
      response_format: { type: "json_schema", json_schema: RELEASE_GATE_AGENT_SCHEMA },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) return res.status(502).json({ success: false, error: "Empty response from AI." });

    let parsed;
    try { parsed = JSON.parse(content); } catch { return res.status(502).json({ success: false, error: "AI returned non-JSON content.", raw: content }); }

    if (parsed.agent !== "release_gate_agent") return res.status(422).json({ success: false, error: "Invalid agent value.", data: parsed });
    if (parsed.task_id !== userPayload.task_id) return res.status(422).json({ success: false, error: "Returned task_id does not match input.", data: parsed });
    if (parsed.objective_id !== userPayload.objective_id) return res.status(422).json({ success: false, error: "Returned objective_id does not match input.", data: parsed });

    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from("agent_task_specs")
      .insert([{ objective_id: parsed.objective_id, task_id: parsed.task_id, agent_name: parsed.agent, spec_payload: parsed, status: parsed.status }])
      .select();

    if (insertError) return res.status(500).json({ success: false, error: insertError.message });
    return res.status(200).json({ success: true, data: parsed, saved: insertedRows?.[0] || null });
  } catch (error) {
    console.error('[release-gate-agent] Error:', error.message);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

// ─── Main handler ───────────────────────────────────────────────────────────

async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const agentType = detectAgent(req);

  // product-workflow-lead has no admin auth in the original
  if (agentType === 'product-workflow-lead') {
    return handleProductWorkflowLead(req, res);
  }

  if (agentType === 'frontend-architecture-lead') {
    return handleFrontendArchitectureLead(req, res);
  }

  if (agentType === 'data-ledger-lead') {
    return handleDataLedgerLead(req, res);
  }

  if (agentType === 'backend-integrations-lead') {
    return handleBackendIntegrationsLead(req, res);
  }

  if (agentType === 'security-trust-lead') {
    return handleSecurityTrustLead(req, res);
  }

  if (agentType === 'qa-regression-agent') {
    return handleQaRegressionAgent(req, res);
  }

  if (agentType === 'release-gate-agent') {
    return handleReleaseGateAgent(req, res);
  }

  // orchestrator requires admin auth
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminPassword) return res.status(503).json({ error: "Admin auth not configured" });
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!verifyAdminToken(token, adminPassword)) return res.status(401).json({ error: "Unauthorized" });

  return handleOrchestrator(req, res);
}

export default withRateLimit(handler, { limit: 10, prefix: 'agents' });
