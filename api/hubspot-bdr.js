export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return res.status(500).json({ error: "HUBSPOT_TOKEN not configured" });

  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: "year and month required" });

  // Plage de dates : 1er au dernier jour du mois
  const y = parseInt(year), m = parseInt(month);
  const start = new Date(y, m - 1, 1).getTime();
  const end   = new Date(y, m, 0, 23, 59, 59).getTime();

  // BDR IDs (valeurs de la propriété genere_par__)
  const BDR_IDS = ["1919375613", "30082998", "29457764", "31730069"];

  const BDR_MAP = {
    "1919375613": "sacha",
    "30082998":   "emilio",
    "29457764":   "oscar",
    "31730069":   "illan",
  };

  try {
    // Recherche des deals passés en "Qualified (30%)" dans la période
    const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [
            { propertyName: "hs_v2_date_entered_presentationscheduled", operator: "GTE", value: String(start) },
            { propertyName: "hs_v2_date_entered_presentationscheduled", operator: "LTE", value: String(end) },
            { propertyName: "genere_par__", operator: "IN", values: BDR_IDS },
          ]
        }],
        properties: ["dealname", "genere_par__", "hs_v2_date_entered_presentationscheduled"],
        limit: 100,
      }),
    });

    const data = await searchRes.json();
    if (!searchRes.ok) return res.status(500).json({ error: data.message || "HubSpot error" });

    // Grouper par BDR
    const members = Object.fromEntries(Object.values(BDR_MAP).map(id => [id, []]));

    for (const deal of (data.results || [])) {
      const genPar = deal.properties.genere_par__;
      const memberId = BDR_MAP[genPar];
      if (!memberId) continue;

      // hs_v2_date_entered_presentationscheduled est un timestamp ms ou ISO string
      const rawDate = deal.properties.hs_v2_date_entered_presentationscheduled || "";
      const dateObj = new Date(isNaN(rawDate) ? rawDate : parseInt(rawDate));
      const dateStr = !isNaN(dateObj.getTime())
        ? `${String(dateObj.getDate()).padStart(2,"0")}/${String(dateObj.getMonth()+1).padStart(2,"0")}/${dateObj.getFullYear()}`
        : "—";

      members[memberId].push({
        name: deal.properties.dealname,
        dateQualified: dateStr,
      });
    }

    res.status(200).json({ ok: true, members });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
