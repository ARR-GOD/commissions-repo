import { useState, useMemo } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────
const PASSWORD = "loyoly2026";
const SLACK_TEST_USER = "U0287PVJ3FF";
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const TEAM_CONFIG = [
  { id: "matthew",  name: "Matthew",  fullName: "Matthew Langewiesche",  role: "AE",           quota: 5000,  annualVariable: 40000, ownerId: "1818638834", slackId: "U06H3BW72G5" },
  { id: "alice",    name: "Alice",    fullName: "Alice Nageotte",         role: "AE",           quota: 5000,  annualVariable: 50000, ownerId: "2061466682", slackId: "U07EW7V3CPQ" },
  { id: "francois", name: "François", fullName: "François Malo Jamin",    role: "AE",           quota: 5000,  annualVariable: 25000, ownerId: "32042772",   slackId: "U0AB464R2RK" },
  { id: "raphael",  name: "Raphaël",  fullName: "Raphaël Angelitti",      role: "Head of Sales",quota: 15000, annualVariable: 40000, ownerId: "1002574007", slackId: "U07FFGM4TUZ", isTeamQuota: true },
  // BDRs
  { id: "sacha",    name: "Sacha",    fullName: "Sacha Fernez",           role: "BDR",          quotaSQLs: 20, annualVariable: 15000, genereParId: "1919375613", slackId: "U07F2P5N5QB" },
  { id: "emilio",   name: "Emilio",   fullName: "Emilio Sallier",         role: "BDR",          quotaSQLs: 10, annualVariable: 15000, genereParId: "30082998",   slackId: "U087CKD9VHU" },
  { id: "oscar",    name: "Oscar",    fullName: "Oscar Mcdonald",         role: "BDR",          quotaSQLs: 20, annualVariable: 18000, genereParId: "29457764",   slackId: "U08U6SV2P9N" },
  { id: "illan",    name: "Illan",    fullName: "Ilan Brillard",          role: "BDR",          quotaSQLs: 20, annualVariable: 12000, genereParId: "31730069",   slackId: "U0A7X8YD48Z" },
  // Partnership Managers
  { id: "antoine",  name: "Antoine",  fullName: "Antoine Rivaud",         role: "PM",           quota: 3333,  annualVariable: 20000, genereParId: "1949410186", slackId: "U079LTGP5LY" },
  { id: "giles",    name: "Giles",    fullName: "Giles Eida",             role: "PM",           quota: 11800, annualVariable: 40000, genereParId: "32259172",   slackId: "U0ADZ5AJ256", currency: "GBP" },
];

// ─── DONNÉES HUBSPOT (AE) ────────────────────────────────────────────────
const HUBSPOT_DATA = {
  "2025-12": {
    members: [
      { id: "matthew",  deals: [{ name: "Orvis UK", amount: 461.00, date: "01/12/2025" }, { name: "Vogana", amount: 400.00, date: "05/12/2025" }] },
      { id: "alice",    deals: [{ name: "Nourrir comme la nature", amount: 1866.75, date: "04/12/2025" }, { name: "Poderm", amount: 833.11, date: "15/12/2025" }, { name: "COMPRESSPORT", amount: 755.10, date: "15/12/2025" }, { name: "DIJO", amount: 666.00, date: "23/12/2025" }, { name: "aqeelab-nutrition.fr", amount: 551.00, date: "01/12/2025" }, { name: "COBRA", amount: 356.85, date: "12/12/2025" }, { name: "TOOFRUIT", amount: 356.80, date: "03/12/2025" }] },
      { id: "francois", deals: [] },
      { id: "raphael",  deals: [] },
    ]
  },
  "2026-01": {
    members: [
      { id: "matthew",  deals: [{ name: "Knoweats", amount: 723.00, date: "22/01/2026" }, { name: "Brambas", amount: 199.00, date: "12/01/2026" }] },
      { id: "alice",    deals: [{ name: "Obsidian Piercing", amount: 773.00, date: "27/01/2026" }, { name: "Love & Green", amount: 594.00, date: "07/01/2026" }] },
      { id: "francois", deals: [] },
      { id: "raphael",  deals: [] },
    ]
  },
};

// ─── DONNÉES HUBSPOT (BDR) ───────────────────────────────────────────────
const HUBSPOT_BDR_DATA = {};

// ─── DONNÉES HUBSPOT (PM) ────────────────────────────────────────────────
const HUBSPOT_PM_DATA = {};

// ─── HELPERS ──────────────────────────────────────────────────────────────
const fmtCurrency = (n, currency = "EUR") => new Intl.NumberFormat(currency === "GBP" ? "en-GB" : "fr-FR", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const fmtCurrencyR = (n, currency = "EUR") => new Intl.NumberFormat(currency === "GBP" ? "en-GB" : "fr-FR", { style: "currency", currency, maximumFractionDigits: 0 }).format(Math.round(n));
const eur2 = n => fmtCurrency(n, "EUR");
const eurR = n => fmtCurrencyR(n, "EUR");
const pct  = n => (n * 100).toFixed(1) + "%";

const PURPLE = "#7c3aed";
const PURPLE_LIGHT = "#ede9fe";
const PURPLE_BORDER = "#c4b5fd";

const attColor  = n => n >= 1 ? "#059669" : n >= 0.7 ? "#d97706" : "#ef4444";
const attBg     = n => n >= 1 ? "#ecfdf5" : n >= 0.7 ? "#fffbeb" : "#fef2f2";
const attBorder = n => n >= 1 ? "#a7f3d0" : n >= 0.7 ? "#fde68a" : "#fecaca";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

// Eye icons (SVG paths)
const EyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const EyeClosed = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

function paymentKey(salaryYear, salaryMonth) {
  let y = salaryYear, m = salaryMonth - 1;
  if (m === 0) { m = 12; y -= 1; }
  return `${y}-${String(m).padStart(2,"0")}`;
}

function paymentLabel(salaryYear, salaryMonth) {
  let y = salaryYear, m = salaryMonth - 1;
  if (m === 0) { m = 12; y -= 1; }
  return `${MONTHS_FR[m-1]} ${y}`;
}

function compute(salaryYear, salaryMonth, aeData = HUBSPOT_DATA, bdrData = HUBSPOT_BDR_DATA, pmData = HUBSPOT_PM_DATA) {
  const key = paymentKey(salaryYear, salaryMonth);
  const rawAE  = aeData[key];
  const rawBDR = bdrData[key];
  const rawPM  = pmData[key];

  return TEAM_CONFIG.map(cfg => {
    const monthlyMax = cfg.annualVariable / 12;
    const cur = cfg.currency || "EUR";

    if (cfg.role === "BDR") {
      const rawMember = rawBDR?.members?.find(m => m.id === cfg.id);
      const deals = rawMember?.deals || [];
      const sqlCount = deals.length;
      const att = sqlCount / cfg.quotaSQLs;
      return { ...cfg, deals, sqlCount, monthlyMax, att, commission: att * monthlyMax, hasData: !!rawBDR, cur };
    }

    if (cfg.role === "PM") {
      const rawMember = rawPM?.members?.find(m => m.id === cfg.id);
      const deals = rawMember?.deals || [];
      const mrr = deals.reduce((s, d) => s + d.amount, 0);
      const att = mrr / cfg.quota;
      return { ...cfg, deals, mrr, monthlyMax, att, commission: att * monthlyMax, hasData: !!rawPM, cur };
    }

    // AE or Head of Sales
    const rawMember = rawAE?.members?.find(m => m.id === cfg.id);
    const deals = rawMember?.deals || [];
    const mrr = deals.reduce((s, d) => s + d.amount, 0);
    return { ...cfg, deals, mrr, monthlyMax, att: 0, commission: 0, hasData: !!rawAE, cur };
  }).map((m, _, arr) => {
    if (m.role === "BDR" || m.role === "PM") return m; // already computed
    if (!m.isTeamQuota) {
      const att = m.mrr / m.quota;
      return { ...m, att, commission: att * m.monthlyMax };
    }
    // Head of Sales — team MRR = AE only (not BDR, not PM)
    const teamMRR = arr.filter(x => x.role === "AE").reduce((s, x) => s + x.mrr, 0);
    const att = teamMRR / m.quota;
    return { ...m, mrr: teamMRR, att, commission: att * m.monthlyMax };
  });
}

function slackMsg(member, salaryYear, salaryMonth, aeMembers) {
  const salLbl = `${MONTHS_FR[salaryMonth-1]} ${salaryYear}`;
  const payLbl = paymentLabel(salaryYear, salaryMonth);
  const cur = member.cur || "EUR";
  const fmt2 = n => fmtCurrency(n, cur);
  const fmtR = n => fmtCurrencyR(n, cur);

  if (member.role === "BDR") {
    const dealLines = member.deals.length === 0
      ? "  _Aucun deal qualifie ce mois-ci._"
      : member.deals.map(d => `  • ${d.name} (${d.dateQualified})`).join("\n");
    return `👋 Bonjour *${member.name}*,\n\nVoici le recapitulatif de tes commissions pour le salaire de *${salLbl}*, base sur les deals qualifies en *${payLbl}*.\n\n*Deals qualifies :*\n${dealLines}\n\n*Nombre de SQLs* : ${member.sqlCount}\n*Atteinte quota* : ${pct(member.att)} (quota ${member.quotaSQLs} SQLs/mois)\n*Commission* : *${fmtR(member.commission)}*\n\nMerci de confirmer que ces chiffres te semblent corrects. En cas d'erreur, contacte-moi directement. ✅`;
  }

  if (member.role === "PM") {
    const dealLines = member.deals.length === 0
      ? "  _Aucun paiement recu ce mois-ci._"
      : member.deals.map(d => `  • ${d.name} — ${fmt2(d.amount)} (${d.date})`).join("\n");
    return `👋 Bonjour *${member.name}*,\n\nVoici le recapitulatif de tes commissions pour le salaire de *${salLbl}*, base sur les paiements recus en *${payLbl}* pour les deals que tu as generes.\n\n*Deals comptabilises :*\n${dealLines}\n\n*Total MRR* : ${fmt2(member.mrr)}\n*Atteinte quota* : ${pct(member.att)} (quota ${fmtR(member.quota)}/mois)\n*Commission* : *${fmtR(member.commission)}*\n\nMerci de confirmer que ces chiffres te semblent corrects. En cas d'erreur, contacte-moi directement. ✅`;
  }

  if (!member.isTeamQuota) {
    const dealLines = member.deals.length === 0
      ? "  _Aucun paiement reçu ce mois-ci._"
      : member.deals.map(d => `  • ${d.name} — ${eur2(d.amount)} (${d.date})`).join("\n");
    return `👋 Bonjour *${member.name}*,\n\nVoici le récapitulatif de tes commissions pour le salaire de *${salLbl}*, basé sur les paiements reçus en *${payLbl}*.\n\n*Deals comptabilisés :*\n${dealLines}\n\n*Total MRR* : ${eur2(member.mrr)}\n*Atteinte quota* : ${pct(member.att)} (quota ${eurR(member.quota)}/mois)\n*Commission* : *${eurR(member.commission)}*\n\nMerci de confirmer que ces chiffres te semblent corrects. En cas d'erreur, contacte-moi directement. ✅`;
  } else {
    const teamLines = aeMembers.map(m => `  • ${m.name} — ${eur2(m.mrr)} MRR (${pct(m.att)} du quota)`).join("\n");
    return `👋 Bonjour *${member.name}*,\n\nVoici le récapitulatif de tes commissions pour le salaire de *${salLbl}*, basé sur la performance équipe en *${payLbl}*.\n\n*Performance de l'équipe :*\n${teamLines}\n\n*Total MRR équipe* : ${eur2(member.mrr)}\n*Atteinte quota équipe* : ${pct(member.att)} (quota ${eurR(member.quota)}/mois)\n*Commission* : *${eurR(member.commission)}*\n\nMerci de confirmer que ces chiffres te semblent corrects. En cas d'erreur, contacte-moi directement. ✅`;
  }
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [pass, setPass] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const tryLogin = () => {
    if (pass === PASSWORD) {
      onLogin();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f5f3ff 0%, #f0fdf4 50%, #faf5ff 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
      `}</style>
      <div style={{ textAlign: "center", width: 360 }}>
        <div style={{ width: 56, height: 56, background: PURPLE, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", fontSize: 24, color: "#fff", fontWeight: 700 }}>L</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 4, letterSpacing: -0.5 }}>Commissions</div>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 36 }}>Loyoly Sales Team</div>
        <div style={{ animation: shake ? "shake 0.5s ease" : "none" }}>
          <input
            type="password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === "Enter" && tryLogin()}
            placeholder="Mot de passe"
            style={{
              width: "100%", padding: "14px 18px", fontSize: 15,
              border: `2px solid ${error ? "#ef4444" : "#e5e7eb"}`,
              borderRadius: 12, outline: "none", fontFamily: FONT,
              background: "#fff", color: "#111827",
              transition: "border-color 0.2s, box-shadow 0.2s",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
            }}
            onFocus={e => { e.target.style.borderColor = PURPLE; e.target.style.boxShadow = `0 0 0 3px ${PURPLE}20`; }}
            onBlur={e => { e.target.style.borderColor = error ? "#ef4444" : "#e5e7eb"; e.target.style.boxShadow = "0 1px 2px rgba(0,0,0,0.05)"; }}
            autoFocus
          />
          <button
            onClick={tryLogin}
            style={{
              width: "100%", padding: "14px 0", marginTop: 12,
              background: PURPLE, border: "none",
              borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 600,
              cursor: "pointer", fontFamily: FONT,
              boxShadow: `0 4px 14px ${PURPLE}40`,
              transition: "transform 0.1s, box-shadow 0.1s",
            }}
            onMouseDown={e => { e.currentTarget.style.transform = "scale(0.98)"; }}
            onMouseUp={e => { e.currentTarget.style.transform = "scale(1)"; }}
          >
            Se connecter
          </button>
          {error && <div style={{ marginTop: 12, fontSize: 13, color: "#ef4444", fontWeight: 500 }}>Mot de passe incorrect</div>}
        </div>
      </div>
    </div>
  );
}

// ─── MEMBER CARD ──────────────────────────────────────────────────────────
function MemberCard({ member, hideNames }) {
  const color  = attColor(member.att);
  const bg     = attBg(member.att);
  const border = attBorder(member.att);
  const isBDR  = member.role === "BDR";
  const cur    = member.cur || "EUR";

  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16,
      padding: "22px 24px", transition: "box-shadow 0.2s, transform 0.2s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: PURPLE, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{member.role}</div>
            {cur === "GBP" && <div style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", background: "#f3f4f6", padding: "1px 6px", borderRadius: 4, marginBottom: 4 }}>GBP</div>}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#111827", letterSpacing: -0.3 }}>{hideNames ? "•••••" : member.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#111827", lineHeight: 1, letterSpacing: -0.5 }}>{fmtCurrencyR(member.commission, cur)}</div>
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4, fontWeight: 500 }}>commission</div>
        </div>
      </div>
      <div style={{ marginTop: 16, height: 6, background: "#f3f4f6", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ height: 6, background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 3, width: `${Math.min(member.att*100,100)}%`, transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: 12, background: bg, border: `1px solid ${border}`, color, padding: "4px 12px", borderRadius: 20, fontWeight: 600 }}>{pct(member.att)}</span>
        {isBDR ? (
          <>
            <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{member.sqlCount} SQL{member.sqlCount > 1 ? "s" : ""}</span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>/ {member.quotaSQLs} SQLs</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>{fmtCurrency(member.mrr, cur)} MRR{member.isTeamQuota ? " equipe" : ""}</span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>/ {fmtCurrencyR(member.quota, cur)}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── DEALS TABLE ──────────────────────────────────────────────────────────
const TH = { padding: "12px 18px", textAlign: "left", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#9ca3af", fontWeight: 600, borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap", background: "#fafafa" };
const TD = { padding: "12px 18px", fontSize: 14, color: "#374151", borderBottom: "1px solid #f9fafb", verticalAlign: "middle" };

function DealsTable({ members, hideNames }) {
  const aeMembers   = members.filter(m => m.role === "AE");
  const bdrMembers  = members.filter(m => m.role === "BDR");
  const pmMembers   = members.filter(m => m.role === "PM");
  const headOfSales = members.find(m => m.isTeamQuota);

  const mask = (name) => hideNames ? "•••••" : name;
  const tabs = [
    ...aeMembers.map(m => ({ id: m.id, label: mask(m.name), type: "ae", member: m })),
    { id: "raphael", label: mask("Raphaël"), type: "team", member: headOfSales, aeMembers },
    ...bdrMembers.map(m => ({ id: m.id, label: mask(m.name), type: "bdr", member: m })),
    ...pmMembers.map(m => ({ id: m.id, label: mask(m.name), type: "pm", member: m })),
  ];
  const [activeTab, setActiveTab] = useState(tabs[0]?.id);
  const active = tabs.find(t => t.id === activeTab) || tabs[0];

  const TabButton = ({ t }) => {
    const isActive = t.id === activeTab;
    const cur = t.member.cur || "EUR";
    const badge = t.type === "bdr"
      ? `${t.member.sqlCount} SQL${t.member.sqlCount !== 1 ? "s" : ""}`
      : fmtCurrency(t.member.mrr, cur);
    return (
      <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
        padding: "14px 18px", background: "none", border: "none",
        borderBottom: isActive ? `2px solid ${PURPLE}` : "2px solid transparent",
        color: isActive ? "#111827" : "#9ca3af", fontSize: 14,
        fontWeight: isActive ? 600 : 400, cursor: "pointer", fontFamily: FONT,
        display: "flex", alignItems: "center", gap: 8, marginBottom: -1,
        transition: "color 0.15s", whiteSpace: "nowrap",
      }}>
        {t.label}
        <span style={{
          fontSize: 12, padding: "2px 10px", borderRadius: 20, fontWeight: 600,
          background: isActive ? PURPLE_LIGHT : "#f3f4f6",
          color: isActive ? PURPLE : "#9ca3af",
        }}>
          {badge}
        </span>
      </button>
    );
  };

  const Separator = () => (
    <div style={{ display: "flex", alignItems: "center", padding: "0 8px" }}>
      <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />
    </div>
  );

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", marginTop: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", borderBottom: "1px solid #f3f4f6", padding: "0 12px", background: "#fafafa", overflowX: "auto" }}>
        {tabs.filter(t => t.type === "ae" || t.type === "team").map(t => <TabButton key={t.id} t={t} />)}
        {bdrMembers.length > 0 && <Separator />}
        {tabs.filter(t => t.type === "bdr").map(t => <TabButton key={t.id} t={t} />)}
        {pmMembers.length > 0 && <Separator />}
        {tabs.filter(t => t.type === "pm").map(t => <TabButton key={t.id} t={t} />)}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {active.type === "bdr"
              ? <><th style={TH}>Deal</th><th style={TH}>Date qualification</th><th style={{...TH,textAlign:"center"}}>SQL</th></>
              : active.type === "team"
              ? <><th style={TH}>AE</th><th style={TH}>Deals</th><th style={{...TH,textAlign:"right"}}>MRR genere</th><th style={{...TH,textAlign:"right"}}>Atteinte</th></>
              : <><th style={TH}>Deal</th><th style={TH}>Date paiement</th><th style={{...TH,textAlign:"right"}}>Montant MRR</th><th style={{...TH,textAlign:"right"}}>% quota</th></>
            }
          </tr>
        </thead>
        <tbody>
          {(active.type === "ae" || active.type === "pm") ? (
            active.member.deals.length === 0
              ? <tr><td colSpan={4} style={{...TD,color:"#d1d5db",fontStyle:"italic",textAlign:"center",padding:"40px",fontSize:14}}>Aucun deal ce mois-ci</td></tr>
              : <>
                  {active.member.deals.map((d,i) => {
                    const cur = active.member.cur || "EUR";
                    return (
                      <tr key={i} style={{ transition: "background 0.15s" }} onMouseEnter={e=>e.currentTarget.style.background="#fafafa"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <td style={{...TD,color:"#111827",fontWeight:500}}>{d.name}</td>
                        <td style={{...TD,color:"#6b7280"}}>{d.date}</td>
                        <td style={{...TD,textAlign:"right",color:"#059669",fontWeight:600}}>{fmtCurrency(d.amount, cur)}</td>
                        <td style={{...TD,textAlign:"right",color:"#9ca3af"}}>{pct(d.amount/active.member.quota)}</td>
                      </tr>
                    );
                  })}
                  <tr style={{background:"#fafafa"}}>
                    <td style={{...TD,color:"#111827",fontWeight:700,borderTop:"1px solid #e5e7eb",borderBottom:"none"}}>Total</td>
                    <td style={{...TD,borderTop:"1px solid #e5e7eb",borderBottom:"none"}}></td>
                    <td style={{...TD,textAlign:"right",color:"#111827",fontWeight:700,borderTop:"1px solid #e5e7eb",borderBottom:"none"}}>{fmtCurrency(active.member.mrr, active.member.cur || "EUR")}</td>
                    <td style={{...TD,textAlign:"right",color:attColor(active.member.att),fontWeight:700,borderTop:"1px solid #e5e7eb",borderBottom:"none"}}>{pct(active.member.att)}</td>
                  </tr>
                </>
          ) : active.type === "bdr" ? (
            active.member.deals.length === 0
              ? <tr><td colSpan={3} style={{...TD,color:"#d1d5db",fontStyle:"italic",textAlign:"center",padding:"40px",fontSize:14}}>Aucun deal qualifie ce mois-ci</td></tr>
              : <>
                  {active.member.deals.map((d,i) => (
                    <tr key={i} style={{ transition: "background 0.15s" }} onMouseEnter={e=>e.currentTarget.style.background="#fafafa"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{...TD,color:"#111827",fontWeight:500}}>{d.name}</td>
                      <td style={{...TD,color:"#6b7280"}}>{d.dateQualified}</td>
                      <td style={{...TD,textAlign:"center",color:"#059669",fontWeight:600}}>✓</td>
                    </tr>
                  ))}
                  <tr style={{background:"#fafafa"}}>
                    <td style={{...TD,color:"#111827",fontWeight:700,borderTop:"1px solid #e5e7eb",borderBottom:"none"}}>Total</td>
                    <td style={{...TD,borderTop:"1px solid #e5e7eb",borderBottom:"none"}}></td>
                    <td style={{...TD,textAlign:"center",color:attColor(active.member.att),fontWeight:700,borderTop:"1px solid #e5e7eb",borderBottom:"none"}}>{active.member.sqlCount} SQL{active.member.sqlCount !== 1 ? "s" : ""}</td>
                  </tr>
                </>
          ) : (
            <>
              {active.aeMembers.map((m,i) => (
                <tr key={i} onMouseEnter={e=>e.currentTarget.style.background="#fafafa"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{...TD,color:"#111827",fontWeight:500}}>{hideNames ? "•••••" : m.name}</td>
                  <td style={{...TD,color:"#6b7280"}}>{m.deals.length} deal{m.deals.length>1?"s":""}</td>
                  <td style={{...TD,textAlign:"right",color:"#059669",fontWeight:600}}>{eur2(m.mrr)}</td>
                  <td style={{...TD,textAlign:"right",color:attColor(m.att)}}>{pct(m.att)}</td>
                </tr>
              ))}
              <tr style={{background:"#fafafa"}}>
                <td style={{...TD,color:"#111827",fontWeight:700,borderTop:"1px solid #e5e7eb",borderBottom:"none"}}>Total equipe</td>
                <td style={{...TD,borderTop:"1px solid #e5e7eb",borderBottom:"none"}}></td>
                <td style={{...TD,textAlign:"right",color:"#111827",fontWeight:700,borderTop:"1px solid #e5e7eb",borderBottom:"none"}}>{eur2(active.member.mrr)}</td>
                <td style={{...TD,textAlign:"right",color:attColor(active.member.att),fontWeight:700,borderTop:"1px solid #e5e7eb",borderBottom:"none"}}>{pct(active.member.att)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── PAYFIT BLOCK ─────────────────────────────────────────────────────────
function PayfitBlock({ members, hideNames }) {
  const [copied, setCopied] = useState(false);
  const text = members.map(m => `${m.name} : ${fmtCurrencyR(m.commission, m.cur || "EUR")}`).join("\n");
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Payfit</div>
        <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{
          padding: "6px 14px", background: copied ? "#ecfdf5" : "#fff", border: `1px solid ${copied ? "#a7f3d0" : "#e5e7eb"}`,
          borderRadius: 8, color: copied ? "#059669" : "#6b7280", fontSize: 12, cursor: "pointer", fontFamily: FONT, fontWeight: 600,
          transition: "all 0.2s",
        }}>
          {copied ? "Copie !" : "Copier"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {members.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9fafb", border: "1px solid #f3f4f6", borderRadius: 10, padding: "14px 16px" }}>
            <span style={{ fontSize: 14, color: "#6b7280" }}>{hideNames ? "•••••" : m.name}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{fmtCurrencyR(m.commission, m.cur || "EUR")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SLACK SECTION (per-rep) ──────────────────────────────────────────────
function SlackSection({ members, salaryYear, salaryMonth, onSendOne, hideNames }) {
  const aeMembers = members.filter(m => m.role === "AE");
  const previews = members.map(m => ({
    ...m,
    msg: slackMsg(m, salaryYear, salaryMonth, aeMembers)
  }));

  const aePreviews  = previews.filter(m => m.role === "AE" || m.isTeamQuota);
  const bdrPreviews = previews.filter(m => m.role === "BDR");
  const pmPreviews  = previews.filter(m => m.role === "PM");

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", marginTop: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 }}>
        Messages Slack
      </div>
      {/* AE + Head of Sales */}
      <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Account Executives</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {aePreviews.map(m => (
          <SlackCard key={m.id} member={m} onSendOne={onSendOne} hideNames={hideNames} />
        ))}
      </div>
      {/* BDRs */}
      {bdrPreviews.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 20 }}>BDRs</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bdrPreviews.map(m => (
              <SlackCard key={m.id} member={m} onSendOne={onSendOne} hideNames={hideNames} />
            ))}
          </div>
        </>
      )}
      {/* PMs */}
      {pmPreviews.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 20 }}>Partnership Managers</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pmPreviews.map(m => (
              <SlackCard key={m.id} member={m} onSendOne={onSendOne} hideNames={hideNames} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SlackCard({ member, onSendOne, hideNames }) {
  const [expanded, setExpanded] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // null | "team" | "test"
  const [error, setError] = useState(null);

  const doSend = async (target) => {
    setSending(true);
    setError(null);
    try {
      await onSendOne(target, member);
      setSent(target);
    } catch (e) {
      setError(e.message || "Erreur");
    }
    setSending(false);
  };

  return (
    <div style={{
      border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden",
      transition: "box-shadow 0.2s",
      boxShadow: expanded ? "0 4px 12px rgba(0,0,0,0.06)" : "none",
    }}>
      {/* Header row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", cursor: "pointer", background: expanded ? "#fafafa" : "#fff",
          transition: "background 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: PURPLE_LIGHT,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, color: PURPLE,
          }}>
            {hideNames ? "?" : member.name.charAt(0)}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{hideNames ? "•••••" : member.name}</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>{member.role}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111827" }}>{fmtCurrencyR(member.commission, member.cur || "EUR")}</span>
          {sent && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "#059669", background: "#ecfdf5", padding: "3px 10px", borderRadius: 20 }}>
              {sent === "test" ? "Test envoye" : "Envoye"}
            </span>
          )}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", color: "#9ca3af" }}>
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Expandable content */}
      {expanded && (
        <div style={{ borderTop: "1px solid #f3f4f6" }}>
          {/* Message preview */}
          <div style={{ padding: "16px 18px", background: "#f9fafb" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Apercu du message</div>
            <div style={{
              fontSize: 13, color: "#4b5563", lineHeight: 1.7,
              fontFamily: "system-ui, sans-serif", whiteSpace: "pre-wrap",
              maxHeight: 200, overflow: "auto",
              background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
              padding: "14px 16px",
            }}>
              {member.msg}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ margin: "0 18px 12px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 13, color: "#ef4444" }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ padding: "12px 18px 16px", display: "flex", gap: 8 }}>
            <button
              onClick={(e) => { e.stopPropagation(); doSend("test"); }}
              disabled={sending}
              style={{
                padding: "10px 18px", borderRadius: 10, cursor: sending ? "not-allowed" : "pointer",
                fontFamily: FONT, fontSize: 13, fontWeight: 600, border: "1px solid #e5e7eb",
                background: "#fff", color: "#6b7280",
                opacity: sending ? 0.6 : 1, transition: "all 0.15s",
              }}
            >
              {sending ? "..." : "Tester (m'envoyer)"}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); doSend("team"); }}
              disabled={sending}
              style={{
                padding: "10px 18px", borderRadius: 10, cursor: sending ? "not-allowed" : "pointer",
                fontFamily: FONT, fontSize: 13, fontWeight: 600, border: "none",
                background: PURPLE, color: "#fff",
                opacity: sending ? 0.6 : 1, transition: "all 0.15s",
                boxShadow: `0 2px 8px ${PURPLE}30`,
              }}
            >
              {sending ? "Envoi..." : `Envoyer a ${hideNames ? "•••••" : member.name}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DRAWER ICONS ────────────────────────────────────────────────────────
const IconCommissions = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="18" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/>
  </svg>
);
const IconAnalytics = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
  </svg>
);
const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── SIDEBAR DRAWER ──────────────────────────────────────────────────────
function Drawer({ isOpen, onClose, currentPage, onNavigate }) {
  const items = [
    { id: "commissions", label: "Commissions", icon: <IconCommissions /> },
    { id: "analytics",   label: "Analytics",   icon: <IconAnalytics /> },
  ];

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)",
            zIndex: 90, backdropFilter: "blur(2px)",
            transition: "opacity 0.3s",
          }}
        />
      )}
      {/* Drawer panel */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: 260, background: "#fff",
        borderRight: "1px solid #e5e7eb",
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 100, display: "flex", flexDirection: "column",
        boxShadow: isOpen ? "4px 0 24px rgba(0,0,0,0.08)" : "none",
      }}>
        {/* Drawer header */}
        <div style={{
          padding: "20px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #f3f4f6",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: PURPLE, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", fontWeight: 700 }}>L</div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#111827", letterSpacing: -0.3 }}>Loyoly</span>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer", color: "#9ca3af",
            padding: 4, borderRadius: 6, display: "flex", alignItems: "center",
          }}>
            <IconClose />
          </button>
        </div>

        {/* Nav items */}
        <div style={{ padding: "12px 12px", flex: 1 }}>
          {items.map(item => {
            const active = currentPage === item.id;
            return (
              <button key={item.id} onClick={() => { onNavigate(item.id); onClose(); }} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", borderRadius: 10, border: "none",
                background: active ? PURPLE_LIGHT : "transparent",
                color: active ? PURPLE : "#6b7280",
                fontSize: 14, fontWeight: active ? 600 : 500,
                cursor: "pointer", fontFamily: FONT,
                transition: "all 0.15s", marginBottom: 4,
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f9fafb"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #f3f4f6", fontSize: 11, color: "#d1d5db" }}>
          Loyoly Commissions v2.0
        </div>
      </div>
    </>
  );
}

// ─── SVG BAR CHART ───────────────────────────────────────────────────────
function BarChart({ data, width = 500, height = 260, barColor = PURPLE, currency = "EUR" }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(36, (width - 60) / data.length - 8);
  const chartH = height - 50;
  const startX = 10;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <g key={i}>
          <line x1={startX} y1={chartH * (1 - pct) + 10} x2={width - 10} y2={chartH * (1 - pct) + 10} stroke="#f3f4f6" strokeWidth="1" />
          <text x={0} y={chartH * (1 - pct) + 14} fill="#d1d5db" fontSize="9" fontFamily={FONT}>
            {fmtCurrencyR(maxVal * pct, currency)}
          </text>
        </g>
      ))}
      {/* Bars */}
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * chartH;
        const x = startX + 50 + i * ((width - 60 - startX) / data.length) + ((width - 60 - startX) / data.length - barW) / 2;
        const y = chartH - barH + 10;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.color || barColor} opacity="0.85" />
            <text x={x + barW / 2} y={height - 6} textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily={FONT} fontWeight="500">
              {d.label}
            </text>
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily={FONT} fontWeight="600">
              {fmtCurrencyR(d.value, currency)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── DONUT CHART ─────────────────────────────────────────────────────────
function DonutChart({ segments, size = 160 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;
  const cx = size / 2, cy = size / 2, r = size / 2 - 12, strokeW = 24;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth={strokeW} />
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circumference;
        const gap = circumference - dash;
        const currentOffset = offset;
        offset += dash;
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={strokeW}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-currentOffset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#111827" fontSize="22" fontWeight="700" fontFamily={FONT}>
        {total}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#9ca3af" fontSize="10" fontFamily={FONT}>
        deals
      </text>
    </svg>
  );
}

// ─── HORIZONTAL BAR (ATTAINMENT) ─────────────────────────────────────────
function AttainmentBars({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 70, fontSize: 12, fontWeight: 500, color: "#6b7280", textAlign: "right", flexShrink: 0 }}>{d.label}</div>
          <div style={{ flex: 1, height: 20, background: "#f3f4f6", borderRadius: 10, overflow: "hidden", position: "relative" }}>
            <div style={{
              height: "100%", borderRadius: 10,
              width: `${Math.min(d.value * 100, 100)}%`,
              background: `linear-gradient(90deg, ${attColor(d.value)}, ${attColor(d.value)}cc)`,
              transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
            }} />
          </div>
          <div style={{ width: 52, fontSize: 12, fontWeight: 600, color: attColor(d.value), textAlign: "right", flexShrink: 0 }}>
            {pct(d.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── KPI CARD ────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, color = PURPLE }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16,
      padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      display: "flex", flexDirection: "column", gap: 4,
      transition: "box-shadow 0.2s, transform 0.2s",
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 8px 25px rgba(0,0,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: 16 }}>
          {icon}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "#111827", letterSpacing: -0.5, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── ANALYTICS PAGE ──────────────────────────────────────────────────────
function AnalyticsPage({ members, salaryYear, salaryMonth, mergedAeData, mergedBdrData, mergedPmData, hideNames }) {
  const salLbl = `${MONTHS_FR[salaryMonth-1]} ${salaryYear}`;
  const payLbl = paymentLabel(salaryYear, salaryMonth);

  const aeMembers  = members.filter(m => m.role === "AE" || m.isTeamQuota);
  const bdrMembers = members.filter(m => m.role === "BDR");
  const pmMembers  = members.filter(m => m.role === "PM");
  const allIndividual = members.filter(m => !m.isTeamQuota);

  // KPI values
  const totalCommissions = allIndividual.reduce((s, m) => s + m.commission, 0);
  const totalMRR         = members.filter(m => m.role === "AE").reduce((s, m) => s + m.mrr, 0);
  const avgAtt           = allIndividual.length > 0 ? allIndividual.reduce((s, m) => s + m.att, 0) / allIndividual.length : 0;
  const totalDeals       = allIndividual.reduce((s, m) => s + m.deals.length, 0);
  const aboveQuota       = allIndividual.filter(m => m.att >= 1).length;

  // Commission bar chart data
  const commissionBars = allIndividual.map(m => ({
    label: hideNames ? "•••" : (m.name.length > 6 ? m.name.slice(0,5) + "." : m.name),
    value: m.commission,
    color: m.role === "AE" ? PURPLE : m.role === "BDR" ? "#f59e0b" : "#06b6d4",
  }));

  // Attainment data
  const attainmentData = allIndividual.map(m => ({
    label: hideNames ? "•••••" : m.name,
    value: m.att,
  })).sort((a, b) => b.value - a.value);

  // Donut data — deals per role
  const donutSegments = [
    { label: "AE", value: aeMembers.filter(m => !m.isTeamQuota).reduce((s, m) => s + m.deals.length, 0), color: PURPLE },
    { label: "BDR", value: bdrMembers.reduce((s, m) => s + m.deals.length, 0), color: "#f59e0b" },
    { label: "PM", value: pmMembers.reduce((s, m) => s + m.deals.length, 0), color: "#06b6d4" },
  ];

  // Multi-month trend data
  const trendData = useMemo(() => {
    const allKeys = new Set([
      ...Object.keys(mergedAeData || {}),
      ...Object.keys(mergedBdrData || {}),
      ...Object.keys(mergedPmData || {}),
    ]);
    const sorted = [...allKeys].sort();
    return sorted.map(key => {
      const [tY, tM] = key.split("-").map(Number);
      // Compute salary month from payment key: payment key = salary month - 1
      const sM = tM + 1 > 12 ? 1 : tM + 1;
      const sY = tM + 1 > 12 ? tY + 1 : tY;
      const mems = compute(sY, sM, mergedAeData, mergedBdrData, mergedPmData);
      const indiv = mems.filter(m => !m.isTeamQuota);
      const totalComm = indiv.reduce((s, m) => s + m.commission, 0);
      return {
        label: `${MONTHS_FR[tM-1]?.slice(0,3) || "?"} ${String(tY).slice(2)}`,
        value: totalComm,
      };
    });
  }, [mergedAeData, mergedBdrData, mergedPmData]);

  // Top performers
  const topPerformers = [...allIndividual].sort((a, b) => b.att - a.att).slice(0, 3);

  const CARD = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1020, margin: "0 auto" }}>
      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#111827", letterSpacing: -0.5 }}>Analytics</div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 4 }}>
          Salaire de {salLbl} · Paiements {payLbl}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
        <KpiCard label="Total Commissions" value={eurR(totalCommissions)} sub={`${allIndividual.length} membres`} icon="💰" />
        <KpiCard label="MRR Equipe (AE)" value={eurR(totalMRR)} sub={`${members.filter(m => m.role === "AE").reduce((s,m) => s + m.deals.length, 0)} deals`} icon="📈" color="#059669" />
        <KpiCard label="Atteinte Moy." value={pct(avgAtt)} sub={`${aboveQuota}/${allIndividual.length} au-dessus du quota`} icon="🎯" color={attColor(avgAtt)} />
        <KpiCard label="Deals Total" value={String(totalDeals)} sub="Tous roles confondus" icon="📊" color="#6366f1" />
      </div>

      {/* Row 1: Commissions chart + Donut */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Commission by member */}
        <div style={CARD}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Commissions par membre</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9ca3af" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: PURPLE, display: "inline-block" }}/>AE</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9ca3af" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#f59e0b", display: "inline-block" }}/>BDR</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9ca3af" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: "#06b6d4", display: "inline-block" }}/>PM</span>
          </div>
          <BarChart data={commissionBars} width={600} height={240} />
        </div>

        {/* Deals donut */}
        <div style={{ ...CARD, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 16, alignSelf: "flex-start" }}>Deals par role</div>
          <DonutChart segments={donutSegments} size={150} />
          <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
            {donutSegments.map((seg, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color }} />
                <span style={{ fontSize: 12, color: "#6b7280" }}>{seg.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{seg.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Attainment + Top Performers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Attainment bars */}
        <div style={CARD}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 16 }}>Atteinte Quotas</div>
          <AttainmentBars data={attainmentData} />
        </div>

        {/* Top Performers */}
        <div style={CARD}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 16 }}>Top Performers</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {topPerformers.map((m, i) => {
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={m.id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  background: i === 0 ? "#fefce8" : "#f9fafb",
                  border: `1px solid ${i === 0 ? "#fde68a" : "#f3f4f6"}`,
                  borderRadius: 12, padding: "14px 16px",
                }}>
                  <span style={{ fontSize: 24 }}>{medals[i]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{hideNames ? "•••••" : m.name}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>{m.role}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: attColor(m.att) }}>{pct(m.att)}</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>{fmtCurrencyR(m.commission, m.cur || "EUR")}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quota distribution */}
          <div style={{ marginTop: 20, padding: "14px 0 0", borderTop: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#9ca3af", marginBottom: 10 }}>Distribution</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "≥ 100%", count: allIndividual.filter(m => m.att >= 1).length, bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
                { label: "70–99%", count: allIndividual.filter(m => m.att >= 0.7 && m.att < 1).length, bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
                { label: "< 70%", count: allIndividual.filter(m => m.att < 0.7).length, bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
              ].map((g, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: "center", padding: "10px 8px",
                  background: g.bg, border: `1px solid ${g.border}`, borderRadius: 10,
                }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: g.color }}>{g.count}</div>
                  <div style={{ fontSize: 11, color: g.color, fontWeight: 500 }}>{g.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Trend (if multi-month) */}
      {trendData.length > 1 && (
        <div style={{ ...CARD, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Evolution des commissions totales</div>
          <div style={{ fontSize: 11, color: "#d1d5db", marginBottom: 12 }}>Tous mois disponibles</div>
          <BarChart data={trendData} width={900} height={220} barColor="#6366f1" />
        </div>
      )}

      {/* Row 4: Role breakdown table */}
      <div style={CARD}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280", marginBottom: 16 }}>Detail par role</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={TH}>Role</th>
              <th style={{ ...TH, textAlign: "right" }}>Membres</th>
              <th style={{ ...TH, textAlign: "right" }}>Deals</th>
              <th style={{ ...TH, textAlign: "right" }}>Atteinte moy.</th>
              <th style={{ ...TH, textAlign: "right" }}>Total Commissions</th>
            </tr>
          </thead>
          <tbody>
            {[
              { role: "AE", color: PURPLE, mems: aeMembers.filter(m => !m.isTeamQuota) },
              { role: "Head of Sales", color: "#6366f1", mems: aeMembers.filter(m => m.isTeamQuota) },
              { role: "BDR", color: "#f59e0b", mems: bdrMembers },
              { role: "PM", color: "#06b6d4", mems: pmMembers },
            ].map((row, i) => {
              const count = row.mems.length;
              const deals = row.mems.reduce((s, m) => s + m.deals.length, 0);
              const avgA = count > 0 ? row.mems.reduce((s, m) => s + m.att, 0) / count : 0;
              const totalC = row.mems.reduce((s, m) => s + m.commission, 0);
              return (
                <tr key={i} onMouseEnter={e => e.currentTarget.style.background="#fafafa"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                  <td style={{ ...TD, fontWeight: 600 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: row.color, display: "inline-block" }} />
                      {row.role}
                    </span>
                  </td>
                  <td style={{ ...TD, textAlign: "right" }}>{count}</td>
                  <td style={{ ...TD, textAlign: "right" }}>{deals}</td>
                  <td style={{ ...TD, textAlign: "right", color: attColor(avgA), fontWeight: 600 }}>{pct(avgA)}</td>
                  <td style={{ ...TD, textAlign: "right", fontWeight: 700 }}>{eurR(totalC)}</td>
                </tr>
              );
            })}
            <tr style={{ background: "#fafafa" }}>
              <td style={{ ...TD, fontWeight: 700, borderTop: "1px solid #e5e7eb", borderBottom: "none" }}>Total</td>
              <td style={{ ...TD, textAlign: "right", fontWeight: 700, borderTop: "1px solid #e5e7eb", borderBottom: "none" }}>{allIndividual.length}</td>
              <td style={{ ...TD, textAlign: "right", fontWeight: 700, borderTop: "1px solid #e5e7eb", borderBottom: "none" }}>{totalDeals}</td>
              <td style={{ ...TD, textAlign: "right", fontWeight: 700, color: attColor(avgAtt), borderTop: "1px solid #e5e7eb", borderBottom: "none" }}>{pct(avgAtt)}</td>
              <td style={{ ...TD, textAlign: "right", fontWeight: 700, borderTop: "1px solid #e5e7eb", borderBottom: "none" }}>{eurR(totalCommissions)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────
const now = new Date();

export default function App() {
  const [loggedIn,    setLoggedIn]   = useState(false);
  const [liveData,    setLiveData]   = useState({});
  const [liveBdrData, setLiveBdrData]= useState({});
  const [livePmData,  setLivePmData] = useState({});
  const [salaryMonth, setSalaryMonth]= useState(now.getMonth() + 1);
  const [salaryYear,  setSalaryYear] = useState(now.getFullYear());
  const [slackLog,    setSlackLog]   = useState([]);
  const [refreshing,  setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh]= useState(null);
  const [flashMsg,    setFlashMsg]   = useState(null);
  const [hideNames,   setHideNames]  = useState(false);
  const [currentPage, setCurrentPage]= useState("commissions");
  const [drawerOpen,  setDrawerOpen] = useState(false);

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;

  const mergedAeData  = { ...HUBSPOT_DATA, ...liveData };
  const mergedBdrData = { ...HUBSPOT_BDR_DATA, ...liveBdrData };
  const mergedPmData  = { ...HUBSPOT_PM_DATA, ...livePmData };
  const members    = compute(salaryYear, salaryMonth, mergedAeData, mergedBdrData, mergedPmData);
  const aeMembers  = members.filter(m => m.role === "AE" || m.isTeamQuota);
  const bdrMembers = members.filter(m => m.role === "BDR");
  const pmMembers  = members.filter(m => m.role === "PM");
  const hasAeData  = !!(mergedAeData)[paymentKey(salaryYear, salaryMonth)];
  const hasBdrData = !!(mergedBdrData)[paymentKey(salaryYear, salaryMonth)];
  const hasPmData  = !!(mergedPmData)[paymentKey(salaryYear, salaryMonth)];
  const hasData    = hasAeData || hasBdrData || hasPmData;
  const payLbl     = paymentLabel(salaryYear, salaryMonth);
  const salLbl     = `${MONTHS_FR[salaryMonth-1]} ${salaryYear}`;

  const handleRefresh = async () => {
    setRefreshing(true);
    setFlashMsg(null);
    try {
      const key = paymentKey(salaryYear, salaryMonth);
      const [payYear, payMonth] = key.split("-").map(Number);

      const [aeRes, bdrRes, pmRes] = await Promise.all([
        fetch(`/api/hubspot-deals?year=${payYear}&month=${payMonth}`),
        fetch(`/api/hubspot-bdr?year=${payYear}&month=${payMonth}`),
        fetch(`/api/hubspot-pm?year=${payYear}&month=${payMonth}`),
      ]);
      const [aeJson, bdrJson, pmJson] = await Promise.all([aeRes.json(), bdrRes.json(), pmRes.json()]);

      if (!aeJson.ok) throw new Error(aeJson.error || "Erreur HubSpot (AE)");
      if (!bdrJson.ok) throw new Error(bdrJson.error || "Erreur HubSpot (BDR)");
      if (!pmJson.ok) throw new Error(pmJson.error || "Erreur HubSpot (PM)");

      setLiveData(prev => ({ ...prev, [key]: { members: Object.entries(aeJson.members).map(([id, deals]) => ({ id, deals })) } }));
      setLiveBdrData(prev => ({ ...prev, [key]: { members: Object.entries(bdrJson.members).map(([id, deals]) => ({ id, deals })) } }));
      setLivePmData(prev => ({ ...prev, [key]: { members: Object.entries(pmJson.members).map(([id, deals]) => ({ id, deals })) } }));
      setLastRefresh(new Date());
      setFlashMsg(`Donnees a jour · ${payLbl}`);
    } catch(e) {
      setFlashMsg(`${e.message}`);
    }
    setRefreshing(false);
    setTimeout(() => setFlashMsg(null), 5000);
  };

  const handleSendOne = async (target, member) => {
    const slackId = target === "test" ? SLACK_TEST_USER : member.slackId;
    const res = await fetch("/api/slack-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ slackId, text: member.msg }] }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Erreur envoi Slack");
    setSlackLog(prev => [...prev, { target, name: member.name, salLbl, sentAt: new Date().toLocaleTimeString("fr-FR") }]);
  };

  const years = [2025, 2026, 2027];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", color: "#111827", fontFamily: FONT }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Drawer */}
      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} currentPage={currentPage} onNavigate={setCurrentPage} />

      {/* Header */}
      <div style={{
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(10px)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => setDrawerOpen(true)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, background: "#fff", border: "1px solid #e5e7eb",
              borderRadius: 10, cursor: "pointer", color: "#6b7280",
              transition: "all 0.15s", boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = PURPLE; e.currentTarget.style.color = PURPLE; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#6b7280"; }}
          >
            <IconMenu />
          </button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#111827", letterSpacing: -0.3 }}>
              {currentPage === "commissions" ? "Commissions" : "Analytics"}
            </div>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>Loyoly Sales</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {flashMsg && (
            <div style={{
              fontSize: 13, fontWeight: 500, padding: "8px 16px", borderRadius: 10,
              color: flashMsg.includes("jour") ? "#059669" : "#d97706",
              background: flashMsg.includes("jour") ? "#ecfdf5" : "#fffbeb",
              border: `1px solid ${flashMsg.includes("jour") ? "#a7f3d0" : "#fde68a"}`,
            }}>
              {flashMsg}
            </div>
          )}
          {slackLog.length > 0 && (
            <div style={{ fontSize: 12, color: "#059669", textAlign: "right", maxWidth: 300 }}>
              {slackLog.slice(-3).map((l,i) => <div key={i}>Slack {l.target === "test" ? "test" : l.name} · {l.sentAt}</div>)}
            </div>
          )}
          <button
            onClick={() => setHideNames(!hideNames)}
            title={hideNames ? "Afficher les noms" : "Masquer les noms"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 38, height: 38, background: hideNames ? PURPLE_LIGHT : "#fff",
              border: `1px solid ${hideNames ? PURPLE_BORDER : "#e5e7eb"}`, borderRadius: 10,
              color: hideNames ? PURPLE : "#9ca3af", cursor: "pointer",
              transition: "all 0.15s",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            {hideNames ? <EyeClosed /> : <EyeOpen />}
          </button>
          <button onClick={handleRefresh} disabled={refreshing} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "9px 18px", background: "#fff",
            border: "1px solid #e5e7eb", borderRadius: 10,
            color: refreshing ? "#d1d5db" : "#374151", fontSize: 14,
            cursor: refreshing ? "not-allowed" : "pointer",
            fontFamily: FONT, fontWeight: 500,
            transition: "all 0.15s",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
          onMouseEnter={e => { if (!refreshing) e.currentTarget.style.borderColor = PURPLE; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#e5e7eb"; }}
          >
            <span style={{ display: "inline-block", animation: refreshing ? "spin 1s linear infinite" : "none", fontSize: 16 }}>&#x21bb;</span>
            {refreshing ? "Actualisation..." : lastRefresh ? `${lastRefresh.toLocaleTimeString("fr-FR", {hour:"2-digit",minute:"2-digit"})}` : "Actualiser"}
          </button>
        </div>
      </div>

      {currentPage === "analytics" ? (
        <AnalyticsPage
          members={members}
          salaryYear={salaryYear}
          salaryMonth={salaryMonth}
          mergedAeData={mergedAeData}
          mergedBdrData={mergedBdrData}
          mergedPmData={mergedPmData}
          hideNames={hideNames}
        />
      ) : (
      <div style={{ padding: "28px 32px", maxWidth: 1020, margin: "0 auto" }}>

        {/* Period selector */}
        <div style={{
          background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16,
          padding: "18px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>Salaire de</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {MONTHS_FR.map((m, i) => {
              const month = i + 1;
              const isActive = month === salaryMonth;
              const key = paymentKey(salaryYear, month);
              const hasD = !!HUBSPOT_DATA[key];
              return (
                <button key={month} onClick={() => setSalaryMonth(month)} style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer", fontFamily: FONT,
                  background: isActive ? PURPLE : hasD ? PURPLE_LIGHT : "transparent",
                  border: isActive ? "none" : `1px solid ${hasD ? PURPLE_BORDER : "#e5e7eb"}`,
                  color: isActive ? "#fff" : hasD ? PURPLE : "#9ca3af",
                  fontWeight: isActive ? 600 : 400, transition: "all 0.15s",
                  boxShadow: isActive ? `0 2px 8px ${PURPLE}30` : "none",
                }}>
                  {m.slice(0,3)}
                </button>
              );
            })}
          </div>
          <select value={salaryYear} onChange={e => setSalaryYear(+e.target.value)} style={{
            background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
            color: "#111827", padding: "7px 14px", fontSize: 14, fontFamily: FONT, cursor: "pointer",
          }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "#9ca3af" }}>Paiements {payLbl}</span>
            {!hasData && (
              <span style={{ fontSize: 12, background: "#fffbeb", border: "1px solid #fde68a", color: "#d97706", padding: "4px 12px", borderRadius: 20, fontWeight: 500 }}>
                Non charge
              </span>
            )}
          </div>
        </div>

        {/* AE Cards */}
        <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Account Executives</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {aeMembers.map(m => <MemberCard key={m.id} member={m} hideNames={hideNames} />)}
        </div>

        {/* BDR Cards */}
        <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, marginTop: 24 }}>BDRs</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {bdrMembers.map(m => <MemberCard key={m.id} member={m} hideNames={hideNames} />)}
        </div>

        {/* PM Cards */}
        <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10, marginTop: 24 }}>Partnership Managers</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {pmMembers.map(m => <MemberCard key={m.id} member={m} hideNames={hideNames} />)}
        </div>

        {/* Deals Table */}
        <DealsTable members={members} hideNames={hideNames} />

        {/* Payfit */}
        <div style={{ marginTop: 20 }}>
          <PayfitBlock members={members} hideNames={hideNames} />
        </div>

        {/* Slack - per rep */}
        {hasData && (
          <SlackSection
            members={members}
            salaryYear={salaryYear}
            salaryMonth={salaryMonth}
            onSendOne={handleSendOne}
            hideNames={hideNames}
          />
        )}
      </div>
      )}
    </div>
  );
}
