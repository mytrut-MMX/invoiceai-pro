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
    const response = await fetch("https://api.openai.com/v1/responses", {
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

    return res.status(200).json({
  ok: true,
  openai_raw: data
});
    const text = data.output?.[0]?.content?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "Model did not return valid JSON",
        raw: text
      });
    }

    return res.status(200).json({
      ok: true,
      result: parsed
    });

  } catch (err) {
    return res.status(500).json({
  error: "OpenAI call failed",
  details: err?.message || String(err)
});
  }
}
