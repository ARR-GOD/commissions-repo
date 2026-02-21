export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages } = req.body; // [{ slackId, text }]
  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) return res.status(500).json({ error: "SLACK_BOT_TOKEN not configured" });

  const results = [];
  for (const msg of messages) {
    const r = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ channel: msg.slackId, text: msg.text }),
    });
    const json = await r.json();
    if (!json.ok) return res.status(400).json({ error: json.error });
    results.push(json);
  }

  res.status(200).json({ ok: true, count: results.length });
}
