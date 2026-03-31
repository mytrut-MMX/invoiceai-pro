export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title, objective, context } = req.body || {};

  if (!objective || typeof objective !== "string") {
    return res.status(400).json({ error: "objective is required" });
  }

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
${title || ""}

Objective:
${objective}

Context:
${JSON.stringify(context || {})}
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
        status: aiResponse.status,
        openai_raw: aiData
      });
    }

    const text = aiData?.output?.find(x => x.type === "message")?.content?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "Model did not return valid JSON",
        raw: text
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
        title: title || "Untitled objective",
        objective,
        context: context || {},
        status: parsed?.status?.overall_status || "pending"
      }])
    });

    const inserted = await insertResponse.json();

    if (!insertResponse.ok) {
      return res.status(500).json({
        error: "Failed to save objective",
        supabase_raw: inserted
      });
    }
    const objectiveId = inserted[0]?.id;

const tasksToInsert = (parsed.tasks || []).map(task => ({
  objective_id: objectiveId,
  title: task.title,
  agent: task.agent,
  priority: task.priority,
  depends_on: task.depends_on || [],
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
      error: "Objective saved but failed to save tasks",
      supabase_raw: insertedTasks
    });
  }
}

    return res.status(200).json({
  ok: true,
  objective_saved: inserted[0],
  tasks_saved: insertedTasks,
  result: parsed
});

  } catch (err) {
    return res.status(500).json({
      error: "Orchestrator failed",
      details: err?.message || String(err)
    });
  }
}
