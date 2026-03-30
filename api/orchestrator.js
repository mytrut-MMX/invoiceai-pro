export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { title, objective, context } = req.body || {};

  if (!objective || typeof objective !== "string") {
    return res.status(400).json({ error: "objective is required" });
  }

  const prompt = `
You are the Executive Orchestrator Agent.

Break the objective into tasks.

Return JSON with:
- initiatives
- tasks
- risks
- status

Objective:
${objective}

Context:
${JSON.stringify(context)}
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

    const data = await response.json();

    const text = data.output?.[0]?.content?.[0]?.text || "";

    return res.status(200).json({
      ok: true,
      raw: text
    });

  } catch (err) {
    return res.status(500).json({
      error: "OpenAI call failed",
      details: err.message
    });
  }
}
