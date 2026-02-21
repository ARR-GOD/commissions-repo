export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const token = process.env.HUBSPOT_TOKEN;
  if (!token) return res.status(500).json({ error: "HUBSPOT_TOKEN not configured" });

  const { year, month } = req.query;
  if (!year || !month) return res.status(400).json({ error: "year and month required" });

  // Range: deals whose closedate falls in the given month AND are closed won
  const y = parseInt(year), m = parseInt(month);
  const start = new Date(y, m - 1, 1).getTime();
  const end   = new Date(y, m, 0, 23, 59, 59).getTime();

  // AE Owner IDs
  const OWNER_IDS = ["1818638834", "2061466682", "32042772", "1002574007"];
  const TEAM_MAP = {
    "1818638834": "matthew",
    "2061466682": "alice",
    "32042772":   "francois",
    "1002574007": "raphael",
  };

  try {
    let allDeals = [];
    let after = 0;
    let hasMore = true;

    while (hasMore) {
      const searchRes = await fetch("https://api.hubapi.com/crm/v3/objects/deals/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [
              { propertyName: "closedate", operator: "GTE", value: String(start) },
              { propertyName: "closedate", operator: "LTE", value: String(end) },
              { propertyName: "hs_is_closed_won", operator: "EQ", value: "true" },
              { propertyName: "hubspot_owner_id", operator: "IN", values: OWNER_IDS },
            ]
          }],
          properties: ["dealname", "amount", "closedate", "hubspot_owner_id", "hs_is_closed_won"],
          limit: 100,
          after,
        }),
      });

      const data = await searchRes.json();
      if (!searchRes.ok) return res.status(500).json({ error: data.message || "HubSpot error" });

      allDeals = allDeals.concat(data.results || []);

      if (data.paging?.next?.after) {
        after = data.paging.next.after;
      } else {
        hasMore = false;
      }
    }

    // Group by member
    const members = Object.fromEntries(Object.values(TEAM_MAP).map(id => [id, []]));

    for (const deal of allDeals) {
      const ownerId = deal.properties.hubspot_owner_id;
      const memberId = TEAM_MAP[ownerId];
      if (!memberId) continue;

      const rawDate = deal.properties.closedate || "";
      const dt = new Date(rawDate);
      const dateStr = !isNaN(dt.getTime())
        ? `${String(dt.getDate()).padStart(2,"0")}/${String(dt.getMonth()+1).padStart(2,"0")}/${dt.getFullYear()}`
        : "—";

      members[memberId].push({
        name:   deal.properties.dealname,
        amount: parseFloat(deal.properties.amount) || 0,
        date:   dateStr,
      });
    }

    res.status(200).json({ ok: true, members });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
