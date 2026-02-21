export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return res.status(500).json({ error: "HUBSPOT_TOKEN not configured" });

  const { year, month } = req.query; // ex: ?year=2026&month=2
  if (!year || !month) return res.status(400).json({ error: "year and month required" });

  // Calcul de la plage de dates : 1er au dernier jour du mois
  const y = parseInt(year), m = parseInt(month);
  const start = new Date(y, m - 1, 1).getTime();
  const end   = new Date(y, m, 0, 23, 59, 59).getTime();

  // Owner IDs de l'équipe
  const OWNER_IDS = ["1818638834", "2061466682", "32042772", "1002574007"];

  const TEAM_MAP = {
    "1818638834": "matthew",
    "2061466682": "alice",
    "32042772":   "francois",
    "1002574007": "raphael",
  };

  try {
    // Recherche des deals avec paiement reçu dans la période
    const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [
            { propertyName: "payment_received_date", operator: "GTE", value: String(start) },
            { propertyName: "payment_received_date", operator: "LTE", value: String(end) },
            { propertyName: "hubspot_owner_id",      operator: "IN",  values: OWNER_IDS },
          ]
        }],
        properties: ["dealname", "mrr", "payment_received_date", "hubspot_owner_id"],
        limit: 100,
      }),
    });

    const data = await searchRes.json();
    if (!searchRes.ok) return res.status(500).json({ error: data.message || "HubSpot error" });

    // Grouper par membre
    const members = Object.fromEntries(Object.values(TEAM_MAP).map(id => [id, []]));

    for (const deal of (data.results || [])) {
      const ownerId = deal.properties.hubspot_owner_id;
      const memberId = TEAM_MAP[ownerId];
      if (!memberId) continue;

      const dateMs = parseInt(deal.properties.payment_received_date);
      const date = new Date(dateMs);
      const dateStr = `${String(date.getDate()).padStart(2,"0")}/${String(date.getMonth()+1).padStart(2,"0")}/${date.getFullYear()}`;

      members[memberId].push({
        name:   deal.properties.dealname,
        amount: parseFloat(deal.properties.mrr) || 0,
        date:   dateStr,
      });
    }

    res.status(200).json({ ok: true, members });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
