export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return res.status(500).json({ error: "HUBSPOT_TOKEN not configured" });

  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: "year and month required" });

  // PM IDs (valeurs de la propriété genere_par__)
  const PM_IDS = ["1949410186", "32259172"];

  const PM_MAP = {
    "1949410186": "antoine",
    "32259172":   "giles",
  };

  try {
    // Recherche des deals avec paiement reçu dans la période, filtrés par genere_par__
    const y = parseInt(year), m = parseInt(month);
    const startDate = `${y}-${String(m).padStart(2,"0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${y}-${String(m).padStart(2,"0")}-${lastDay}`;

    const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [
            { propertyName: "date_de_paiement", operator: "GTE", value: startDate },
            { propertyName: "date_de_paiement", operator: "LTE", value: endDate },
            { propertyName: "genere_par__", operator: "IN", values: PM_IDS },
          ]
        }],
        properties: ["dealname", "amount", "date_de_paiement", "genere_par__"],
        limit: 100,
      }),
    });

    const data = await searchRes.json();
    if (!searchRes.ok) return res.status(500).json({ error: data.message || "HubSpot error" });

    // Grouper par PM
    const members = Object.fromEntries(Object.values(PM_MAP).map(id => [id, []]));

    for (const deal of (data.results || [])) {
      const genPar = deal.properties.genere_par__;
      const memberId = PM_MAP[genPar];
      if (!memberId) continue;

      const rawDate = deal.properties.date_de_paiement || "";
      const [y2, m2, d2] = rawDate.split("-");
      const dateStr = d2 && m2 && y2 ? `${d2}/${m2}/${y2}` : "—";

      members[memberId].push({
        name: deal.properties.dealname,
        amount: parseFloat(deal.properties.amount) || 0,
        date: dateStr,
      });
    }

    res.status(200).json({ ok: true, members });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
