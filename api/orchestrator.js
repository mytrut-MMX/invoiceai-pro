import { createHmac, timingSafeEqual } from "crypto";
import { withRateLimit } from './_lib/with-rate-limit.js';

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
  } catch {
    return false;
  }
}

async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  
const adminPassword = process.env.ADMIN_PASSWORD?.trim();
if (!adminPassword) {
  return res.status(503).json({ error: "Admin auth not configured" });
}

const authHeader = req.headers["authorization"] || "";
const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

if (!verifyAdminToken(token, adminPassword)) {
  return res.status(401).json({ error: "Unauthorized" });
}
  
  const { title, objective, context } = req.body || {};

  if (!objective || typeof objective !== "string") {
    return res.status(400).json({ error: "objective is required" });
  }

  if (title && typeof title !== "string") {
    return res.status(400).json({ error: "title must be a string" });
  }

  if (context && (typeof context !== "object" || Array.isArray(context))) {
    return res.status(400).json({ error: "context must be an object" });
  }

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
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5",
        input: prompt
      })
    });

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      return res.status(500).json({
        error: "OpenAI HTTP error",
        status: aiResponse.status
      });
    }

    const text = aiData?.output?.find(x => x.type === "message")?.content?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "Model did not return valid JSON"
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: "Supabase env vars missing"
      });
    }

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/agent_objectives`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify([{
        title: safeTitle || "Untitled objective",
        objective: safeObjective,
        context: safeContext,
        status: parsed?.status?.overall_status || "pending"
      }])
    });

    const inserted = await insertResponse.json();

    if (!insertResponse.ok) {
      return res.status(500).json({
        error: "Failed to save objective"
      });
    }

    const objectiveId = inserted[0]?.id;

    const tasksToInsert = (parsed.tasks || []).map(task => ({
      objective_id: objectiveId,
      title: String(task.title || "").slice(0, 500),
      agent: String(task.agent || "").slice(0, 200),
      priority: String(task.priority || "medium").slice(0, 20),
      depends_on: Array.isArray(task.depends_on) ? task.depends_on : [],
      status: "pending"
    }));

    let insertedTasks = [];

    if (tasksToInsert.length > 0) {
      const taskInsertResponse = await fetch(`${supabaseUrl}/rest/v1/agent_tasks`, {
        method: "POST",
        headers: {
          "apikey": serviceRoleKey,
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify(tasksToInsert)
      });

      insertedTasks = await taskInsertResponse.json();

      if (!taskInsertResponse.ok) {
        return res.status(500).json({
          error: "Objective saved but failed to save tasks"
        });
      }
    }

    const logResponse = await fetch(`${supabaseUrl}/rest/v1/agent_logs`, {
      method: "POST",
      headers: {
        "apikey": serviceRoleKey,
        "Authorization": `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify([{
        agent_name: "Executive Orchestrator Agent",
        objective_id: objectiveId,
        input_payload: {
          title: safeTitle || null,
          objective: safeObjective,
          context: safeContext
        },
        output_payload: parsed
      }])
    });

    const insertedLogs = await logResponse.json();

    if (!logResponse.ok) {
      return res.status(500).json({
        error: "Objective and tasks saved, but failed to save logs"
      });
    }

    return res.status(200).json({
      ok: true,
      objective_saved: inserted[0],
      tasks_saved_count: insertedTasks.length,
      log_saved: insertedLogs[0]?.id || null,
      result: parsed
    });

  } catch (err) {
    console.error('[orchestrator] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withRateLimit(handler, { limit: 10, prefix: 'orchestrator' });
