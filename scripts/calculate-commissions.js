const fs = require('fs');
const fetch = require('node-fetch');

// ─── CONFIGURATION ÉQUIPE ────────────────────────────────────────────────
const TEAM = [
  { id: 'matthew',  ownerId: '1818638834' },
  { id: 'alice',    ownerId: '2061466682' },
  { id: 'francois', ownerId: '32042772'   },
  { id: 'raphael',  ownerId: '1002574007' },
];

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

// ─── HUBSPOT FETCH ───────────────────────────────────────────────────────

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

// ─── UPDATE App.jsx ───────────────────────────────────────────────────────

function buildDataEntry(members, key) {
  const lines = members.map(m => {
    const dealsStr = m.deals.length === 0
      ? '[]'
      : `[${m.deals.map(d => `{ name: "${d.name}", amount: ${d.amount.toFixed(2)}, date: "${d.date}" }`).join(', ')}]`;
    return `      { id: "${m.id}", deals: ${dealsStr} }`;
  });
  return `  "${key}": {\n    members: [\n${lines.join(',\n')},\n    ]\n  }`;
}

function updateAppJsx(newKey, membersData) {
  const appPath = 'src/App.jsx';
  let content = fs.readFileSync(appPath, 'utf8');

  // Si la clé existe déjà, on la remplace; sinon on l'ajoute avant la fermeture
  const newEntry = buildDataEntry(membersData, newKey);

  const keyPattern = new RegExp(`  "${newKey}": \\{[\\s\\S]*?\\n  \\}`, 'm');

  if (keyPattern.test(content)) {
    // Remplace l'entrée existante
    content = content.replace(keyPattern, newEntry);
  } else {
    // Ajoute avant le };  final du HUBSPOT_DATA
    content = content.replace(/(\n};)\n\n\/\/ ─── HELPERS/, `\n${newEntry},\n};\n\n// ─── HELPERS`);
  }

  fs.writeFileSync(appPath, content, 'utf8');
  console.log(`✅ App.jsx mis à jour avec la clé ${newKey}`);
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

  // Fetch HubSpot pour chaque membre
  const membersData = [];
  for (const member of TEAM) {
    console.log(`  → Fetching deals pour ${member.id} (owner ${member.ownerId})...`);
    const deals = await fetchDealsForOwner(member.ownerId, payYear, payMonth);
    const total = deals.reduce((s, d) => s + d.amount, 0);
    console.log(`     ${deals.length} deal(s) — ${total.toFixed(2)} €`);
    membersData.push({ id: member.id, deals });
  }

  // Mise à jour App.jsx
  updateAppJsx(payKey, membersData);

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
