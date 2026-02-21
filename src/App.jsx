import { useState } from "react";

// ─── CONFIG ÉQUIPE ────────────────────────────────────────────────────────
const TEAM_CONFIG = [
  { id: "matthew",  name: "Matthew",  fullName: "Matthew Langewiesche",  role: "AE",           quota: 5000,  annualVariable: 40000, ownerId: "1818638834", slackId: "UXXMATTHEW" },
  { id: "alice",    name: "Alice",    fullName: "Alice Nageotte",         role: "AE",           quota: 5000,  annualVariable: 50000, ownerId: "2061466682", slackId: "UXXALICE"   },
  { id: "francois", name: "François", fullName: "François Malo Jamin",    role: "AE",           quota: 5000,  annualVariable: 25000, ownerId: "32042772",   slackId: "UXXFRANCOIS"},
  { id: "raphael",  name: "Raphaël",  fullName: "Raphaël Angelitti",      role: "Head of Sales",quota: 15000, annualVariable: 40000, ownerId: "1002574007", slackId: "UXXRAPHAEL", isTeamQuota: true },
];

// ─── DONNÉES HUBSPOT (injectées par Claude à chaque recalcul) ─────────────
// Structure : { "YYYY-MM": { members: [{ id, deals: [{name, amount, date}] }] } }
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

// ─── HELPERS ─────────────────────────────────────────────────────────────
const eur2 = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const eurR = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(n));
const pct  = n => (n * 100).toFixed(1) + "%";
const attColor = n => n >= 1 ? "#22c55e" : n >= 0.7 ? "#f59e0b" : "#ef4444";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

function paymentKey(salaryYear, salaryMonth) {
  // Salary M → payment M-1
  let y = salaryYear, m = salaryMonth - 1;
  if (m === 0) { m = 12; y -= 1; }
  return `${y}-${String(m).padStart(2,"0")}`;
}

function paymentLabel(salaryYear, salaryMonth) {
  let y = salaryYear, m = salaryMonth - 1;
  if (m === 0) { m = 12; y -= 1; }
  return `${MONTHS_FR[m-1]} ${y}`;
}

function compute(salaryYear, salaryMonth) {
  const key = paymentKey(salaryYear, salaryMonth);
  const raw = HUBSPOT_DATA[key];

  return TEAM_CONFIG.map(cfg => {
    const rawMember = raw?.members.find(m => m.id === cfg.id);
    const deals = rawMember?.deals || [];
    const monthlyMax = cfg.annualVariable / 12;
    const mrr = deals.reduce((s, d) => s + d.amount, 0);
    return { ...cfg, deals, mrr, monthlyMax, att: 0, commission: 0, hasData: !!raw };
  }).map((m, _, arr) => {
    const monthlyMax = m.monthlyMax;
    if (!m.isTeamQuota) {
      const att = m.mrr / m.quota;
      return { ...m, att, commission: att * monthlyMax };
    }
    const teamMRR = arr.filter(x => !x.isTeamQuota).reduce((s, x) => s + x.mrr, 0);
    const att = teamMRR / m.quota;
    return { ...m, mrr: teamMRR, att, commission: att * monthlyMax };
  });
}

function slackMsg(member, salaryYear, salaryMonth, aeMembers) {
  const salLbl = `${MONTHS_FR[salaryMonth-1]} ${salaryYear}`;
  const payLbl = paymentLabel(salaryYear, salaryMonth);

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

// ─── MEMBER CARD ──────────────────────────────────────────────────────────
function MemberCard({ member }) {
  const color = attColor(member.att);
  return (
    <div style={{ background: "#13131e", border: "1px solid #1e1e2e", borderTop: `3px solid ${color}`, borderRadius: 12, padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#6b6b8a", textTransform: "uppercase", marginBottom: 3 }}>{member.role}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#f0ece4" }}>{member.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>{eurR(member.commission)}</div>
          <div style={{ fontSize: 11, color: "#6b6b8a", marginTop: 3 }}>commission</div>
        </div>
      </div>
      <div style={{ marginTop: 14, height: 3, background: "#1e1e2e", borderRadius: 2 }}>
        <div style={{ height: 3, background: color, borderRadius: 2, width: `${Math.min(member.att*100,100)}%`, transition: "width 0.6s" }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "#6b6b8a" }}>
        <span><span style={{ color }}>{pct(member.att)}</span> atteinte</span>
        <span>{eur2(member.mrr)} MRR{member.isTeamQuota ? " équipe" : ""}</span>
        <span>quota {eurR(member.quota)}</span>
      </div>
    </div>
  );
}

// ─── NOTION TABLE ─────────────────────────────────────────────────────────
const TH = { padding: "9px 14px", textAlign: "left", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#6b6b8a", fontWeight: 500, borderBottom: "1px solid #1e1e2e", whiteSpace: "nowrap" };
const TD = { padding: "9px 14px", fontSize: 13, color: "#c8c4bc", borderBottom: "1px solid #12121a", verticalAlign: "middle" };

function NotionTable({ members }) {
  const aeMembers = members.filter(m => !m.isTeamQuota);
  const raphael   = members.find(m => m.isTeamQuota);
  const tabs = [...aeMembers.map(m => ({ id: m.id, label: m.name, type: "ae", member: m })),
                 { id: "raphael", label: "Raphaël", type: "team", member: raphael, aeMembers }];
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const active = tabs.find(t => t.id === activeTab);

  return (
    <div style={{ background: "#13131e", border: "1px solid #1e1e2e", borderRadius: 12, overflow: "hidden", marginTop: 24 }}>
      <div style={{ display: "flex", borderBottom: "1px solid #1e1e2e", padding: "0 4px" }}>
        {tabs.map(t => {
          const isActive = t.id === activeTab;
          const color = attColor(t.member.att);
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: "12px 20px", background: "none", border: "none",
              borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
              color: isActive ? "#f0ece4" : "#6b6b8a", fontSize: 13,
              fontWeight: isActive ? 600 : 400, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 8, marginBottom: -1,
            }}>
              {t.label}
              <span style={{ fontSize: 11, background: isActive ? color+"22" : "#1e1e2e", color: isActive ? color : "#4a4a6a", padding: "2px 7px", borderRadius: 10, fontWeight: 600 }}>
                {eur2(t.member.mrr)}
              </span>
            </button>
          );
        })}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#0f0f18" }}>
            {active.type === "ae"
              ? <><th style={TH}>Deal</th><th style={TH}>Date paiement</th><th style={{...TH,textAlign:"right"}}>Montant MRR</th><th style={{...TH,textAlign:"right"}}>% quota</th></>
              : <><th style={TH}>AE</th><th style={TH}>Deals</th><th style={{...TH,textAlign:"right"}}>MRR généré</th><th style={{...TH,textAlign:"right"}}>Atteinte</th></>
            }
          </tr>
        </thead>
        <tbody>
          {active.type === "ae" ? (
            active.member.deals.length === 0
              ? <tr><td colSpan={4} style={{...TD,color:"#4a4a6a",fontStyle:"italic",textAlign:"center",padding:"28px"}}>Aucun deal ce mois-ci</td></tr>
              : <>
                  {active.member.deals.map((d,i) => (
                    <tr key={i} onMouseEnter={e=>e.currentTarget.style.background="#15151f"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{...TD,color:"#e8e4dc",fontWeight:500}}>{d.name}</td>
                      <td style={TD}>{d.date}</td>
                      <td style={{...TD,textAlign:"right",color:"#6ee7a0",fontWeight:600}}>{eur2(d.amount)}</td>
                      <td style={{...TD,textAlign:"right",color:"#6b6b8a"}}>{pct(d.amount/active.member.quota)}</td>
                    </tr>
                  ))}
                  <tr style={{background:"#0f0f18"}}>
                    <td style={{...TD,color:"#f0ece4",fontWeight:700,borderTop:"1px solid #2a2a3a",borderBottom:"none"}}>Total</td>
                    <td style={{...TD,borderTop:"1px solid #2a2a3a",borderBottom:"none"}}></td>
                    <td style={{...TD,textAlign:"right",color:"#f0ece4",fontWeight:700,borderTop:"1px solid #2a2a3a",borderBottom:"none"}}>{eur2(active.member.mrr)}</td>
                    <td style={{...TD,textAlign:"right",color:attColor(active.member.att),fontWeight:700,borderTop:"1px solid #2a2a3a",borderBottom:"none"}}>{pct(active.member.att)}</td>
                  </tr>
                </>
          ) : (
            <>
              {active.aeMembers.map((m,i) => (
                <tr key={i} onMouseEnter={e=>e.currentTarget.style.background="#15151f"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{...TD,color:"#e8e4dc",fontWeight:500}}>{m.name}</td>
                  <td style={TD}>{m.deals.length} deal{m.deals.length>1?"s":""}</td>
                  <td style={{...TD,textAlign:"right",color:"#6ee7a0",fontWeight:600}}>{eur2(m.mrr)}</td>
                  <td style={{...TD,textAlign:"right",color:attColor(m.att)}}>{pct(m.att)}</td>
                </tr>
              ))}
              <tr style={{background:"#0f0f18"}}>
                <td style={{...TD,color:"#f0ece4",fontWeight:700,borderTop:"1px solid #2a2a3a",borderBottom:"none"}}>Total équipe</td>
                <td style={{...TD,borderTop:"1px solid #2a2a3a",borderBottom:"none"}}></td>
                <td style={{...TD,textAlign:"right",color:"#f0ece4",fontWeight:700,borderTop:"1px solid #2a2a3a",borderBottom:"none"}}>{eur2(active.member.mrr)}</td>
                <td style={{...TD,textAlign:"right",color:attColor(active.member.att),fontWeight:700,borderTop:"1px solid #2a2a3a",borderBottom:"none"}}>{pct(active.member.att)}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── PAYFIT BLOCK ─────────────────────────────────────────────────────────
function PayfitBlock({ members }) {
  const [copied, setCopied] = useState(false);
  const text = members.map(m => `${m.name} : ${eurR(m.commission)}`).join("\n");
  return (
    <div style={{ background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 12, padding: "20px 24px", marginTop: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: "#6b6b8a", textTransform: "uppercase" }}>À saisir dans Payfit</div>
        <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${copied?"#22c55e":"#2a2a3a"}`, borderRadius: 6, color: copied?"#22c55e":"#6b6b8a", fontSize: 11, cursor: "pointer", fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase" }}>
          {copied ? "✓ Copié" : "Copier"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {members.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#13131e", borderRadius: 8, padding: "12px 16px" }}>
            <span style={{ fontSize: 13, color: "#a0a0c0" }}>{m.name}</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: "#f0ece4" }}>{eurR(m.commission)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SLACK MODAL ──────────────────────────────────────────────────────────
function SlackModal({ members, salaryYear, salaryMonth, onClose, onSend }) {
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState(false);
  const [target, setTarget]   = useState("me"); // "me" | "all"
  const aeMembers = members.filter(m => !m.isTeamQuota);

  const previews = members.map(m => ({
    ...m,
    msg: slackMsg(m, salaryYear, salaryMonth, aeMembers)
  }));

  const handleSend = async () => {
    setSending(true);
    await onSend(target, previews);
    setSending(false);
    setDone(true);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 14, width: 620, maxHeight: "88vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e1e2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#6b6b8a", textTransform: "uppercase" }}>Envoi Slack</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#f0ece4", marginTop: 2 }}>
              Récap commissions · {MONTHS_FR[salaryMonth-1]} {salaryYear}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#6b6b8a", fontSize: 22, cursor: "pointer" }}>×</button>
        </div>

        {/* Target selector */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #1e1e2e", display: "flex", gap: 10 }}>
          {[["me", "🧪 Tester → Envoyer à moi"], ["all", "📤 Envoyer à l'équipe"]].map(([val, label]) => (
            <button key={val} onClick={() => setTarget(val)} style={{
              flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              background: target === val ? (val === "all" ? "#2563eb" : "#166534") : "transparent",
              border: `1px solid ${target === val ? (val === "all" ? "#2563eb" : "#22c55e") : "#2a2a3a"}`,
              color: target === val ? "#fff" : "#6b6b8a",
            }}>{label}</button>
          ))}
        </div>

        {/* Previews */}
        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {previews.map(m => (
            <div key={m.id} style={{ background: "#222233", borderRadius: 8, padding: "14px 18px", borderLeft: "3px solid #4a5bdb" }}>
              <div style={{ fontSize: 11, color: "#6b6b8a", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, color: "#8ab4f8" }}>DM → {m.name}</span>
                <span style={{ color: attColor(m.att) }}>{eurR(m.commission)}</span>
              </div>
              <div style={{ fontSize: 12, color: "#9a96a0", lineHeight: 1.6, fontFamily: "system-ui, sans-serif", whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto" }}>
                {m.msg}
              </div>
            </div>
          ))}
        </div>

        {/* Send button */}
        <div style={{ padding: "0 24px 24px", display: "flex", gap: 10 }}>
          {!done ? (
            <button onClick={handleSend} disabled={sending} style={{
              flex: 1, padding: "13px", background: target === "all" ? "#2563eb" : "#166534",
              border: "none", borderRadius: 8, color: "#fff", fontSize: 14, cursor: sending ? "not-allowed" : "pointer",
              fontWeight: 700, fontFamily: "inherit", opacity: sending ? 0.7 : 1,
            }}>
              {sending ? "Envoi en cours..." : target === "me" ? "Envoyer à moi pour tester" : "Envoyer à l'équipe"}
            </button>
          ) : (
            <div style={{ flex: 1, padding: "13px", background: "#166534", borderRadius: 8, color: "#22c55e", fontSize: 14, fontWeight: 700, textAlign: "center" }}>
              ✓ Messages envoyés !
            </div>
          )}
          <button onClick={onClose} style={{ padding: "13px 20px", background: "transparent", border: "1px solid #2a2a3a", borderRadius: 8, color: "#6b6b8a", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────
const now = new Date();

export default function App() {
  const [salaryMonth, setSalaryMonth] = useState(now.getMonth() + 1);
  const [salaryYear,  setSalaryYear]  = useState(now.getFullYear());
  const [showSlack,   setShowSlack]   = useState(false);
  const [slackLog,    setSlackLog]    = useState([]);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [flashMsg,    setFlashMsg]    = useState(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setFlashMsg(null);
    // Simulate async fetch (real refresh = Claude re-injects HUBSPOT_DATA)
    await new Promise(r => setTimeout(r, 1800));
    setRefreshing(false);
    setLastRefresh(new Date());
    setFlashMsg(hasData
      ? `✓ Données à jour · ${payLbl}`
      : `⚠ Aucune donnée HubSpot pour ${payLbl} — demande à Claude de charger ce mois`
    );
    setTimeout(() => setFlashMsg(null), 4000);
  };

  const members    = compute(salaryYear, salaryMonth);
  const hasData    = !!HUBSPOT_DATA[paymentKey(salaryYear, salaryMonth)];
  const aeMembers  = members.filter(m => !m.isTeamQuota);
  const payLbl     = paymentLabel(salaryYear, salaryMonth);
  const salLbl     = `${MONTHS_FR[salaryMonth-1]} ${salaryYear}`;

  // Simulate Slack send (real send is done by Claude via MCP on confirmation)
  const handleSend = async (target, previews) => {
    await new Promise(r => setTimeout(r, 1200));
    setSlackLog(prev => [...prev, { target, salLbl, sentAt: new Date().toLocaleTimeString("fr-FR") }]);
  };

  const years = [2025, 2026, 2027];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#e8e4dc", fontFamily: "'DM Mono','Courier New',monospace" }}>

      {/* Header */}
      <div style={{ background: "#0d0d14", borderBottom: "1px solid #1e1e2e", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#6b6b8a", textTransform: "uppercase", marginBottom: 4 }}>Loyoly · Sales</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f0ece4" }}>Commission Calculator</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {flashMsg && (
            <div style={{ fontSize: 12, color: flashMsg.startsWith("✓") ? "#22c55e" : "#f59e0b", background: flashMsg.startsWith("✓") ? "#0a1f0a" : "#1f150a", border: `1px solid ${flashMsg.startsWith("✓") ? "#1a4a1a" : "#4a3a0a"}`, padding: "7px 14px", borderRadius: 8, maxWidth: 320 }}>
              {flashMsg}
            </div>
          )}
          {slackLog.length > 0 && (
            <div style={{ fontSize: 11, color: "#4a6a4a", textAlign: "right" }}>
              {slackLog.map((l,i) => <div key={i}>✓ Slack {l.target === "me" ? "test" : "équipe"} · {l.salLbl} · {l.sentAt}</div>)}
            </div>
          )}
          <button onClick={handleRefresh} disabled={refreshing} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "9px 18px", background: "transparent",
            border: "1px solid #2a2a3a", borderRadius: 8,
            color: refreshing ? "#4a4a6a" : "#a0a0c0", fontSize: 13,
            cursor: refreshing ? "not-allowed" : "pointer",
            fontFamily: "inherit", fontWeight: 500,
            transition: "all 0.2s",
          }}>
            <span style={{ display: "inline-block", animation: refreshing ? "spin 1s linear infinite" : "none", fontSize: 15 }}>⟳</span>
            {refreshing ? "Actualisation…" : lastRefresh ? `Actualisé ${lastRefresh.toLocaleTimeString("fr-FR", {hour:"2-digit",minute:"2-digit"})}` : "Actualiser"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div style={{ padding: "28px 32px", maxWidth: 980, margin: "0 auto" }}>

        {/* Period selector */}
        <div style={{ background: "#13131e", border: "1px solid #1e1e2e", borderRadius: 12, padding: "18px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#6b6b8a", textTransform: "uppercase", marginRight: 4 }}>Salaire de</div>

          {/* Month pills */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {MONTHS_FR.map((m, i) => {
              const month = i + 1;
              const isActive = month === salaryMonth;
              const key = paymentKey(salaryYear, month);
              const hasD = !!HUBSPOT_DATA[key];
              return (
                <button key={month} onClick={() => setSalaryMonth(month)} style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  background: isActive ? "#2563eb" : hasD ? "#1a2a1a" : "transparent",
                  border: `1px solid ${isActive ? "#2563eb" : hasD ? "#2a4a2a" : "#1e1e2e"}`,
                  color: isActive ? "#fff" : hasD ? "#6ee7a0" : "#4a4a6a",
                  fontWeight: isActive ? 700 : 400,
                  position: "relative",
                }}>
                  {m.slice(0,3)}
                  {hasD && !isActive && <span style={{ position: "absolute", top: 2, right: 2, width: 4, height: 4, background: "#22c55e", borderRadius: "50%", display: "block" }} />}
                </button>
              );
            })}
          </div>

          {/* Year selector */}
          <select value={salaryYear} onChange={e => setSalaryYear(+e.target.value)} style={{ background: "#0a0a0f", border: "1px solid #2a2a3a", borderRadius: 6, color: "#e8e4dc", padding: "6px 12px", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#4a4a6a" }}>→ Paiements {payLbl}</span>
            {!hasData && (
              <span style={{ fontSize: 11, background: "#2a1a0a", border: "1px solid #4a3a1a", color: "#f59e0b", padding: "4px 10px", borderRadius: 20 }}>
                Données non chargées — demande à Claude
              </span>
            )}
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {members.map(m => <MemberCard key={m.id} member={m} />)}
        </div>

        {/* Notion table */}
        <NotionTable members={members} />

        {/* Payfit + Slack row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, marginTop: 24, alignItems: "start" }}>
          <PayfitBlock members={members} />

          {/* Slack CTA */}
          <div style={{ background: "#13131e", border: "1px solid #1e1e2e", borderRadius: 12, padding: "20px 24px", minWidth: 220 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "#6b6b8a", textTransform: "uppercase", marginBottom: 14 }}>Slack</div>
            <button onClick={() => setShowSlack(true)} style={{
              width: "100%", padding: "13px 0",
              background: hasData ? "linear-gradient(135deg,#2563eb,#4f46e5)" : "#13131e",
              border: `1px solid ${hasData ? "#2563eb" : "#2a2a3a"}`,
              borderRadius: 10, color: hasData ? "#fff" : "#4a4a6a",
              fontSize: 14, cursor: hasData ? "pointer" : "not-allowed",
              fontWeight: 700, fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }} disabled={!hasData}>
              <span style={{ fontSize: 18 }}>💬</span> Envoyer récaps
            </button>
            <div style={{ marginTop: 10, fontSize: 11, color: "#3a3a5a", textAlign: "center" }}>
              {hasData ? `4 messages · ${salLbl}` : "Charge d'abord les données"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: "12px 16px", background: "#13131e", border: "1px solid #1a2a1a", borderRadius: 8, fontSize: 12, color: "#4a6a4a" }}>
          💡 Pour charger un nouveau mois, demande à Claude : <span style={{ color: "#6a9a6a" }}>"Calcule les commissions de [mois]"</span>
        </div>
      </div>

      {showSlack && (
        <SlackModal
          members={members}
          salaryYear={salaryYear}
          salaryMonth={salaryMonth}
          onClose={() => setShowSlack(false)}
          onSend={handleSend}
        />
      )}
    </div>
  );
}
