const fs = require('fs');
const fetch = require('node-fetch');

// ─── CONFIGURATION ÉQUIPE (AE) ─────────────────────────────────────────
const TEAM = [
  { id: 'matthew',  ownerId: '1818638834' },
  { id: 'alice',    ownerId: '2061466682' },
  { id: 'francois', ownerId: '32042772'   },
  { id: 'raphael',  ownerId: '1002574007' },
];

// ─── CONFIGURATION BDR ──────────────────────────────────────────────────
const BDR_TEAM = [
  { id: 'sacha',  genereParId: '1919375613' },
  { id: 'emilio', genereParId: '30082998'   },
  { id: 'oscar',  genereParId: '29457764'   },
  { id: 'illan',  genereParId: '31730069'   },
];

const BDR_MAP = {
  '1919375613': 'sacha',
  '30082998':   'emilio',
  '29457764':   'oscar',
  '31730069':   'illan',
};

// ─── CONFIGURATION PM ───────────────────────────────────────────────────
const PM_TEAM = [
  { id: 'antoine', genereParId: '1949410186' },
  { id: 'giles',   genereParId: '32259172'   },
];

const PM_MAP = {
  '1949410186': 'antoine',
  '32259172':   'giles',
};

// ─── HELPERS DATE ────────────────────────────────────────────────────────

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function getWorkingDays(year, month) {
  // Jours ouvrés du mois (lun-ven, hors week-end)
  // Pour une vraie app on pourrait ajouter les jours fériés FR
  const days = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    if (!isWeekend(d)) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function isAvantDernierJourOuvre() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const workingDays = getWorkingDays(year, month);

  if (workingDays.length < 2) return false;

  const avantDernier = workingDays[workingDays.length - 2];
  return (
    now.getDate() === avantDernier.getDate() &&
    now.getMonth() === avantDernier.getMonth()
  );
}

function padMonth(m) {
  return String(m).padStart(2, '0');
}

function getPaymentMonth(salaryYear, salaryMonth) {
  let y = salaryYear, m = salaryMonth - 1;
  if (m === 0) { m = 12; y -= 1; }
  return { year: y, month: m };
}

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// ─── HUBSPOT FETCH (AE) ─────────────────────────────────────────────────

async function fetchDealsForOwner(ownerId, payYear, payMonth) {
  const start = `${payYear}-${padMonth(payMonth)}-01`;
  const lastDay = new Date(payYear, payMonth, 0).getDate();
  const end = `${payYear}-${padMonth(payMonth)}-${lastDay}`;

  const body = {
    filterGroups: [{
      filters: [
        { propertyName: 'date_de_paiement', operator: 'GTE', value: start },
        { propertyName: 'date_de_paiement', operator: 'LTE', value: end },
        { propertyName: 'amount', operator: 'GT', value: '0' },
        { propertyName: 'hubspot_owner_id', operator: 'EQ', value: ownerId },
      ]
    }],
    properties: ['dealname', 'amount', 'date_de_paiement'],
    limit: 100,
  };

  const res = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HUBSPOT_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HubSpot error for owner ${ownerId}: ${res.status} — ${err}`);
  }

  const data = await res.json();

  return (data.results || []).map(deal => {
    const rawDate = deal.properties.date_de_paiement; // YYYY-MM-DD
    const [y, m, d] = rawDate.split('-');
    return {
      name: deal.properties.dealname.trim(),
      amount: parseFloat(deal.properties.amount),
      date: `${d}/${m}/${y}`,
    };
  });
}

// ─── HUBSPOT FETCH (BDR) ────────────────────────────────────────────────

async function fetchBdrDeals(payYear, payMonth) {
  const start = new Date(payYear, payMonth - 1, 1).getTime();
  const end   = new Date(payYear, payMonth, 0, 23, 59, 59).getTime();

  const body = {
    filterGroups: [{
      filters: [
        { propertyName: 'hs_v2_date_entered_presentationscheduled', operator: 'GTE', value: String(start) },
        { propertyName: 'hs_v2_date_entered_presentationscheduled', operator: 'LTE', value: String(end) },
        { propertyName: 'genere_par__', operator: 'IN', values: Object.keys(BDR_MAP) },
      ]
    }],
    properties: ['dealname', 'genere_par__', 'hs_v2_date_entered_presentationscheduled'],
    limit: 100,
  };

  const res = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HUBSPOT_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HubSpot BDR error: ${res.status} — ${err}`);
  }

  const data = await res.json();

  // Group by BDR member
  const members = Object.fromEntries(BDR_TEAM.map(b => [b.id, []]));

  for (const deal of (data.results || [])) {
    const genPar = deal.properties.genere_par__;
    const memberId = BDR_MAP[genPar];
    if (!memberId) continue;

    const rawDate = deal.properties.hs_v2_date_entered_presentationscheduled || '';
    const dateObj = new Date(isNaN(rawDate) ? rawDate : parseInt(rawDate));
    const dateStr = !isNaN(dateObj.getTime())
      ? `${String(dateObj.getDate()).padStart(2,'0')}/${String(dateObj.getMonth()+1).padStart(2,'0')}/${dateObj.getFullYear()}`
      : '—';

    members[memberId].push({
      name: deal.properties.dealname.trim(),
      dateQualified: dateStr,
    });
  }

  return BDR_TEAM.map(b => ({
    id: b.id,
    deals: members[b.id],
  }));
}

// ─── HUBSPOT FETCH (PM) ─────────────────────────────────────────────────

async function fetchPmDeals(payYear, payMonth) {
  const start = new Date(payYear, payMonth - 1, 1).getTime();
  const end   = new Date(payYear, payMonth, 0, 23, 59, 59).getTime();

  const body = {
    filterGroups: Object.keys(PM_MAP).map(id => ({
      filters: [
        { propertyName: 'date_de_paiement', operator: 'GTE', value: String(start) },
        { propertyName: 'date_de_paiement', operator: 'LTE', value: String(end) },
        { propertyName: 'genere_par__', operator: 'EQ', value: id },
      ]
    })),
    properties: ['dealname', 'amount', 'date_de_paiement', 'genere_par__'],
    limit: 100,
  };

  const res = await fetch('https://api.hubapi.com/crm/v3/objects/deals/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HUBSPOT_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HubSpot PM error: ${res.status} — ${err}`);
  }

  const data = await res.json();

  // Group by PM member
  const members = Object.fromEntries(PM_TEAM.map(p => [p.id, []]));

  for (const deal of (data.results || [])) {
    const genPar = deal.properties.genere_par__;
    const memberId = PM_MAP[genPar];
    if (!memberId) continue;

    const rawDate = deal.properties.date_de_paiement || '';
    const [y, m, d] = rawDate.split('-');
    const dateStr = d && m && y ? `${d}/${m}/${y}` : '—';

    members[memberId].push({
      name: deal.properties.dealname.trim(),
      amount: parseFloat(deal.properties.amount) || 0,
      date: dateStr,
    });
  }

  return PM_TEAM.map(p => ({
    id: p.id,
    deals: members[p.id],
  }));
}

// ─── UPDATE App.jsx ───────────────────────────────────────────────────────

function buildAeDataEntry(members, key) {
  const lines = members.map(m => {
    const dealsStr = m.deals.length === 0
      ? '[]'
      : `[${m.deals.map(d => `{ name: "${d.name}", amount: ${d.amount.toFixed(2)}, date: "${d.date}" }`).join(', ')}]`;
    return `      { id: "${m.id}", deals: ${dealsStr} }`;
  });
  return `  "${key}": {\n    members: [\n${lines.join(',\n')},\n    ]\n  }`;
}

function buildBdrDataEntry(members, key) {
  const lines = members.map(m => {
    const dealsStr = m.deals.length === 0
      ? '[]'
      : `[${m.deals.map(d => `{ name: "${d.name}", dateQualified: "${d.dateQualified}" }`).join(', ')}]`;
    return `      { id: "${m.id}", deals: ${dealsStr} }`;
  });
  return `  "${key}": {\n    members: [\n${lines.join(',\n')},\n    ]\n  }`;
}

function buildPmDataEntry(members, key) {
  const lines = members.map(m => {
    const dealsStr = m.deals.length === 0
      ? '[]'
      : `[${m.deals.map(d => `{ name: "${d.name}", amount: ${d.amount.toFixed(2)}, date: "${d.date}" }`).join(', ')}]`;
    return `      { id: "${m.id}", deals: ${dealsStr} }`;
  });
  return `  "${key}": {\n    members: [\n${lines.join(',\n')},\n    ]\n  }`;
}

function updateAppJsx(newKey, aeMembersData, bdrMembersData, pmMembersData) {
  const appPath = 'src/App.jsx';
  let content = fs.readFileSync(appPath, 'utf8');

  // ─── Update HUBSPOT_DATA (AE) ───
  const aeEntry = buildAeDataEntry(aeMembersData, newKey);
  const aeKeyPattern = new RegExp(`  "${newKey}": \\{[\\s\\S]*?\\n  \\}`, 'm');

  if (aeKeyPattern.test(content)) {
    content = content.replace(aeKeyPattern, aeEntry);
  } else {
    // Add before the closing }; of HUBSPOT_DATA
    content = content.replace(
      /(\n};)\n\n\/\/ ─── DONNÉES HUBSPOT \(BDR\)/,
      `\n${aeEntry},\n};\n\n// ─── DONNÉES HUBSPOT (BDR)`
    );
  }

  // ─── Update HUBSPOT_BDR_DATA ───
  const bdrEntry = buildBdrDataEntry(bdrMembersData, newKey);
  const bdrKeyPattern = new RegExp(`  "${newKey}": \\{[\\s\\S]*?\\n  \\}`, 'm');

  // Check if HUBSPOT_BDR_DATA is empty ({}) or has existing data
  if (content.includes('const HUBSPOT_BDR_DATA = {};')) {
    // Replace empty object with populated one
    content = content.replace(
      'const HUBSPOT_BDR_DATA = {};',
      `const HUBSPOT_BDR_DATA = {\n${bdrEntry},\n};`
    );
  } else if (bdrKeyPattern.test(content)) {
    // Key exists in BDR data — replace it
    // We need a more specific pattern to target HUBSPOT_BDR_DATA section
    // Find position of HUBSPOT_BDR_DATA and replace within it
    const bdrStart = content.indexOf('const HUBSPOT_BDR_DATA = {');
    if (bdrStart !== -1) {
      const bdrEnd = content.indexOf('};', bdrStart) + 2;
      let bdrSection = content.substring(bdrStart, bdrEnd);
      bdrSection = bdrSection.replace(bdrKeyPattern, bdrEntry);
      content = content.substring(0, bdrStart) + bdrSection + content.substring(bdrEnd);
    }
  } else {
    // Add new key to HUBSPOT_BDR_DATA
    content = content.replace(
      /(const HUBSPOT_BDR_DATA = \{[\s\S]*?)(};)\n\n\/\/ ─── HELPERS/,
      `$1${bdrEntry},\n};\n\n// ─── HELPERS`
    );
  }

  // ─── Update HUBSPOT_PM_DATA ───
  const pmEntry = buildPmDataEntry(pmMembersData, newKey);
  const pmKeyPattern = new RegExp(`  "${newKey}": \\{[\\s\\S]*?\\n  \\}`, 'm');

  if (content.includes('const HUBSPOT_PM_DATA = {};')) {
    content = content.replace(
      'const HUBSPOT_PM_DATA = {};',
      `const HUBSPOT_PM_DATA = {\n${pmEntry},\n};`
    );
  } else if (pmKeyPattern.test(content)) {
    const pmStart = content.indexOf('const HUBSPOT_PM_DATA = {');
    if (pmStart !== -1) {
      const pmEnd = content.indexOf('};', pmStart) + 2;
      let pmSection = content.substring(pmStart, pmEnd);
      pmSection = pmSection.replace(pmKeyPattern, pmEntry);
      content = content.substring(0, pmStart) + pmSection + content.substring(pmEnd);
    }
  } else {
    content = content.replace(
      /(const HUBSPOT_PM_DATA = \{[\s\S]*?)(};)\n\n\/\/ ─── HELPERS/,
      `$1${pmEntry},\n};\n\n// ─── HELPERS`
    );
  }

  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`✅ App.jsx mis à jour avec la clé ${newKey} (AE + BDR + PM)`);
}

// ─── GITHUB OUTPUTS ──────────────────────────────────────────────────────

function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `${name}=${value}\n`);
  } else {
    console.log(`OUTPUT ${name}=${value}`);
  }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────

async function main() {
  // Déterminer le mois de salaire cible
  let salaryYear, salaryMonth;

  if (process.env.SALARY_YEAR_OVERRIDE && process.env.SALARY_MONTH_OVERRIDE) {
    // Déclenchement manuel avec paramètres
    salaryYear  = parseInt(process.env.SALARY_YEAR_OVERRIDE);
    salaryMonth = parseInt(process.env.SALARY_MONTH_OVERRIDE);
    console.log(`🖐 Mode manuel : salaire ${MONTHS_FR[salaryMonth-1]} ${salaryYear}`);
  } else {
    // Déclenchement automatique : on calcule pour le mois SUIVANT
    // (on tourne avant la fin du mois M-1, pour préparer le salaire M)
    const now = new Date();

    if (!isAvantDernierJourOuvre()) {
      console.log(`ℹ️  Aujourd'hui (${now.toLocaleDateString('fr-FR')}) n'est pas l'avant-dernier jour ouvré du mois. Rien à faire.`);
      setOutput('should_update', 'false');
      return;
    }

    // Le mois en cours est le mois de PAIEMENT (M-1)
    // Le mois de SALAIRE est donc M = mois suivant
    salaryMonth = now.getMonth() + 2; // +1 pour base-1, +1 pour mois suivant
    salaryYear  = now.getFullYear();
    if (salaryMonth > 12) { salaryMonth = 1; salaryYear += 1; }

    console.log(`📅 Avant-dernier jour ouvré détecté — calcul pour salaire ${MONTHS_FR[salaryMonth-1]} ${salaryYear}`);
  }

  const { year: payYear, month: payMonth } = getPaymentMonth(salaryYear, salaryMonth);
  const payKey = `${payYear}-${padMonth(payMonth)}`;
  const salaryLabel = `${MONTHS_FR[salaryMonth-1]} ${salaryYear}`;
  const paymentLabel = `${MONTHS_FR[payMonth-1]} ${payYear}`;

  console.log(`💰 Salaire : ${salaryLabel} | Paiements : ${paymentLabel} (clé HubSpot: ${payKey})`);

  // ─── Fetch AE deals ───
  console.log('\n📊 AE Deals :');
  const aeMembersData = [];
  for (const member of TEAM) {
    console.log(`  → Fetching deals pour ${member.id} (owner ${member.ownerId})...`);
    const deals = await fetchDealsForOwner(member.ownerId, payYear, payMonth);
    const total = deals.reduce((s, d) => s + d.amount, 0);
    console.log(`     ${deals.length} deal(s) — ${total.toFixed(2)} €`);
    aeMembersData.push({ id: member.id, deals });
  }

  // ─── Fetch BDR deals ───
  console.log('\n📊 BDR Deals (SQLs) :');
  const bdrMembersData = await fetchBdrDeals(payYear, payMonth);
  for (const m of bdrMembersData) {
    console.log(`  → ${m.id}: ${m.deals.length} SQL(s)`);
  }

  // ─── Fetch PM deals ───
  console.log('\n📊 PM Deals :');
  const pmMembersData = await fetchPmDeals(payYear, payMonth);
  for (const m of pmMembersData) {
    const total = m.deals.reduce((s, d) => s + d.amount, 0);
    console.log(`  → ${m.id}: ${m.deals.length} deal(s) — ${total.toFixed(2)} €`);
  }

  // Mise à jour App.jsx
  updateAppJsx(payKey, aeMembersData, bdrMembersData, pmMembersData);

  // Outputs pour GitHub Actions
  setOutput('should_update', 'true');
  setOutput('salary_label', salaryLabel);
  setOutput('payment_label', paymentLabel);

  console.log('\n✅ Terminé — Vercel va redéployer automatiquement.');
}

main().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
