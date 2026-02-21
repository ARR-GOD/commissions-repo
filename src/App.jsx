import { useState } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────
const PASSWORD = "loyoly2026";

const SLACK_TEST_USER = "U0287PVJ3FF"; // Joseph (pour les tests)

const TEAM_CONFIG = [
  { id: "matthew",  name: "Matthew",  fullName: "Matthew Langewiesche",  role: "AE",           quota: 5000,  annualVariable: 40000, ownerId: "1818638834", slackId: "U06H3BW72G5" },
  { id: "alice",    name: "Alice",    fullName: "Alice Nageotte",         role: "AE",           quota: 5000,  annualVariable: 50000, ownerId: "2061466682", slackId: "U07EW7V3CPQ" },
  { id: "francois", name: "François", fullName: "François Malo Jamin",    role: "AE",           quota: 5000,  annualVariable: 25000, ownerId: "32042772",   slackId: "U0AB464R2RK" },
  { id: "raphael",  name: "Raphaël",  fullName: "Raphaël Angelitti",      role: "Head of Sales",quota: 15000, annualVariable: 40000, ownerId: "1002574007", slackId: "U07FFGM4TUZ", isTeamQuota: true },
];

// ─── DONNÉES HUBSPOT ──────────────────────────────────────────────────────
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

// ─── HELPERS ──────────────────────────────────────────────────────────────
const eur2 = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const eurR = n => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Math.round(n));
const pct  = n => (n * 100).toFixed(1) + "%";
const attColor = n => n >= 1 ? "#16a34a" : n >= 0.7 ? "#d97706" : "#dc2626";
const attBg    = n => n >= 1 ? "#f0fdf4" : n >= 0.7 ? "#fffbeb" : "#fef2f2";
const attBorder= n => n >= 1 ? "#bbf7d0" : n >= 0.7 ? "#fde68a" : "#fecaca";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

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

function compute(salaryYear, salaryMonth, data = HUBSPOT_DATA) {
  const key = paymentKey(salaryYear, salaryMonth);
  const raw = data[key];
  return TEAM_CONFIG.map(cfg => {
    const rawMember = raw?.members.find(m => m.id === cfg.id);
    const deals = rawMember?.deals || [];
    const monthlyMax = cfg.annualVariable / 12;
    const mrr = deals.reduce((s, d) => s + d.amount, 0);
    return { ...cfg, deals, mrr, monthlyMax, att: 0, commission: 0, hasData: !!raw };
  }).map((m, _, arr) => {
    if (!m.isTeamQuota) {
      const att = m.mrr / m.quota;
      return { ...m, att, commission: att * m.monthlyMax };
    }
    const teamMRR = arr.filter(x => !x.isTeamQuota).reduce((s, x) => s + x.mrr, 0);
    const att = teamMRR / m.quota;
    return { ...m, mrr: teamMRR, att, commission: att * m.monthlyMax };
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
    <div style={{ minHeight: "100vh", background: "#f8f7f4", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono','Courier New',monospace" }}>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
      `}</style>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#9a9a9a", textTransform: "uppercase", marginBottom: 8 }}>Loyoly · Sales</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>Commission Calculator</div>
        <div style={{ fontSize: 13, color: "#9a9a9a", marginBottom: 40 }}>Accès réservé à l'équipe</div>
        <div style={{ animation: shake ? "shake 0.5s ease" : "none" }}>
          <input
            type="password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key === "Enter" && tryLogin()}
            placeholder="Mot de passe"
            style={{
              width: 240, padding: "12px 16px", fontSize: 14,
              border: `1.5px solid ${error ? "#dc2626" : "#e2e2e2"}`,
              borderRadius: 8, outline: "none", fontFamily: "inherit",
              background: "#fff", color: "#1a1a1a", textAlign: "center",
              display: "block", marginBottom: 12,
              transition: "border-color 0.2s",
            }}
            autoFocus
          />
          <button
            onClick={tryLogin}
            style={{
              width: 272, padding: "12px 0", background: "#1a1a1a", border: "none",
              borderRadius: 8, color: "#fff", fontSize: 14, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5,
            }}
          >
            Accéder →
          </button>
          {error && <div style={{ marginTop: 10, fontSize: 12, color: "#dc2626" }}>Mot de passe incorrect</div>}
        </div>
      </div>
    </div>
  );
}

// ─── MEMBER CARD ──────────────────────────────────────────────────────────
function MemberCard({ member }) {
  const color  = attColor(member.att);
  const bg     = attBg(member.att);
  const border = attBorder(member.att);
  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderTop: `3px solid ${color}`, borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#9a9a9a", textTransform: "uppercase", marginBottom: 3 }}>{member.role}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>{member.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#1a1a1a", lineHeight: 1 }}>{eurR(member.commission)}</div>
          <div style={{ fontSize: 11, color: "#9a9a9a", marginTop: 3 }}>commission</div>
        </div>
      </div>
      <div style={{ marginTop: 14, height: 4, background: "#f0f0f0", borderRadius: 2 }}>
        <div style={{ height: 4, background: color, borderRadius: 2, width: `${Math.min(member.att*100,100)}%`, transition: "width 0.6s" }} />
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, background: bg, border: `1px solid ${border}`, color, padding: "3px 10px", borderRadius: 20, fontWeight: 600 }}>{pct(member.att)} atteinte</span>
        <span style={{ fontSize: 12, color: "#6a6a6a" }}>{eur2(member.mrr)} MRR{member.isTeamQuota ? " équipe" : ""}</span>
        <span style={{ fontSize: 12, color: "#9a9a9a" }}>quota {eurR(member.quota)}</span>
      </div>
    </div>
  );
}

// ─── DEALS TABLE ──────────────────────────────────────────────────────────
const TH = { padding: "10px 16px", textAlign: "left", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: "#9a9a9a", fontWeight: 500, borderBottom: "1.5px solid #f0f0f0", whiteSpace: "nowrap", background: "#fafafa" };
const TD = { padding: "10px 16px", fontSize: 13, color: "#3a3a3a", borderBottom: "1px solid #f4f4f4", verticalAlign: "middle" };

function DealsTable({ members }) {
  const aeMembers = members.filter(m => !m.isTeamQuota);
  const raphael   = members.find(m => m.isTeamQuota);
  const tabs = [...aeMembers.map(m => ({ id: m.id, label: m.name, type: "ae", member: m })),
                 { id: "raphael", label: "Raphaël", type: "team", member: raphael, aeMembers }];
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const active = tabs.find(t => t.id === activeTab);

  return (
    <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, overflow: "hidden", marginTop: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", borderBottom: "1.5px solid #f0f0f0", padding: "0 8px", background: "#fafafa" }}>
        {tabs.map(t => {
          const isActive = t.id === activeTab;
          const color = attColor(t.member.att);
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: "12px 18px", background: "none", border: "none",
              borderBottom: isActive ? `2px solid ${color}` : "2px solid transparent",
              color: isActive ? "#1a1a1a" : "#9a9a9a", fontSize: 13,
              fontWeight: isActive ? 600 : 400, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 8, marginBottom: -1.5,
            }}>
              {t.label}
              <span style={{ fontSize: 11, background: isActive ? color+"18" : "#f0f0f0", color: isActive ? color : "#9a9a9a", padding: "2px 7px", borderRadius: 10, fontWeight: 600 }}>
                {eur2(t.member.mrr)}
              </span>
            </button>
          );
        })}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {active.type === "ae"
              ? <><th style={TH}>Deal</th><th style={TH}>Date paiement</th><th style={{...TH,textAlign:"right"}}>Montant MRR</th><th style={{...TH,textAlign:"right"}}>% quota</th></>
              : <><th style={TH}>AE</th><th style={TH}>Deals</th><th style={{...TH,textAlign:"right"}}>MRR généré</th><th style={{...TH,textAlign:"right"}}>Atteinte</th></>
            }
          </tr>
        </thead>
        <tbody>
          {active.type === "ae" ? (
            active.member.deals.length === 0
              ? <tr><td colSpan={4} style={{...TD,color:"#c0c0c0",fontStyle:"italic",textAlign:"center",padding:"32px"}}>Aucun deal ce mois-ci</td></tr>
              : <>
                  {active.member.deals.map((d,i) => (
                    <tr key={i} style={{ transition: "background 0.15s" }} onMouseEnter={e=>e.currentTarget.style.background="#fafafa"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{...TD,color:"#1a1a1a",fontWeight:500}}>{d.name}</td>
                      <td style={{...TD,color:"#6a6a6a"}}>{d.date}</td>
                      <td style={{...TD,textAlign:"right",color:"#16a34a",fontWeight:600}}>{eur2(d.amount)}</td>
                      <td style={{...TD,textAlign:"right",color:"#9a9a9a"}}>{pct(d.amount/active.member.quota)}</td>
                    </tr>
                  ))}
                  <tr style={{background:"#fafafa"}}>
                    <td style={{...TD,color:"#1a1a1a",fontWeight:700,borderTop:"1.5px solid #e8e8e8",borderBottom:"none"}}>Total</td>
                    <td style={{...TD,borderTop:"1.5px solid #e8e8e8",borderBottom:"none"}}></td>
                    <td style={{...TD,textAlign:"right",color:"#1a1a1a",fontWeight:700,borderTop:"1.5px solid #e8e8e8",borderBottom:"none"}}>{eur2(active.member.mrr)}</td>
                    <td style={{...TD,textAlign:"right",color:attColor(active.member.att),fontWeight:700,borderTop:"1.5px solid #e8e8e8",borderBottom:"none"}}>{pct(active.member.att)}</td>
                  </tr>
                </>
          ) : (
            <>
              {active.aeMembers.map((m,i) => (
                <tr key={i} onMouseEnter={e=>e.currentTarget.style.background="#fafafa"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{...TD,color:"#1a1a1a",fontWeight:500}}>{m.name}</td>
                  <td style={{...TD,color:"#6a6a6a"}}>{m.deals.length} deal{m.deals.length>1?"s":""}</td>
                  <td style={{...TD,textAlign:"right",color:"#16a34a",fontWeight:600}}>{eur2(m.mrr)}</td>
                  <td style={{...TD,textAlign:"right",color:attColor(m.att)}}>{pct(m.att)}</td>
                </tr>
              ))}
              <tr style={{background:"#fafafa"}}>
                <td style={{...TD,color:"#1a1a1a",fontWeight:700,borderTop:"1.5px solid #e8e8e8",borderBottom:"none"}}>Total équipe</td>
                <td style={{...TD,borderTop:"1.5px solid #e8e8e8",borderBottom:"none"}}></td>
                <td style={{...TD,textAlign:"right",color:"#1a1a1a",fontWeight:700,borderTop:"1.5px solid #e8e8e8",borderBottom:"none"}}>{eur2(active.member.mrr)}</td>
                <td style={{...TD,textAlign:"right",color:attColor(active.member.att),fontWeight:700,borderTop:"1.5px solid #e8e8e8",borderBottom:"none"}}>{pct(active.member.att)}</td>
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
    <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#9a9a9a", textTransform: "uppercase", fontWeight: 500 }}>À saisir dans Payfit</div>
        <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }} style={{ padding: "5px 12px", background: copied?"#f0fdf4":"transparent", border: `1px solid ${copied?"#16a34a":"#e2e2e2"}`, borderRadius: 6, color: copied?"#16a34a":"#6a6a6a", fontSize: 11, cursor: "pointer", fontFamily: "inherit", letterSpacing: 1, textTransform: "uppercase", fontWeight: 500 }}>
          {copied ? "✓ Copié" : "Copier"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {members.map(m => (
          <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 8, padding: "12px 16px" }}>
            <span style={{ fontSize: 13, color: "#6a6a6a" }}>{m.name}</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a" }}>{eurR(m.commission)}</span>
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
  const [error, setError]     = useState(null);
  const [target, setTarget]   = useState("me");
  const aeMembers = members.filter(m => !m.isTeamQuota);

  const previews = members.map(m => ({
    ...m,
    msg: slackMsg(m, salaryYear, salaryMonth, aeMembers)
  }));

  const handleSend = async () => {
    setSending(true);
    setError(null);
    try {
      await onSend(target, previews);
      setDone(true);
    } catch(e) {
      setError(e.message || "Erreur lors de l'envoi");
    }
    setSending(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
      <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 16, width: 640, maxHeight: "88vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1.5px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 3, color: "#9a9a9a", textTransform: "uppercase" }}>Envoi Slack</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a1a", marginTop: 2 }}>
              Récap commissions · {MONTHS_FR[salaryMonth-1]} {salaryYear}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#9a9a9a", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "16px 24px", borderBottom: "1.5px solid #f0f0f0", display: "flex", gap: 10 }}>
          {[["me", "🧪 Tester → m'envoyer à moi"], ["all", "📤 Envoyer à l'équipe"]].map(([val, label]) => (
            <button key={val} onClick={() => setTarget(val)} style={{
              flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
              background: target === val ? (val === "all" ? "#1a1a1a" : "#f0fdf4") : "#fafafa",
              border: `1.5px solid ${target === val ? (val === "all" ? "#1a1a1a" : "#16a34a") : "#e8e8e8"}`,
              color: target === val ? (val === "all" ? "#fff" : "#16a34a") : "#6a6a6a",
            }}>{label}</button>
          ))}
        </div>




        <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
          {previews.map(m => (
            <div key={m.id} style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: 8, padding: "14px 18px", borderLeft: "3px solid #4f46e5" }}>
              <div style={{ fontSize: 11, color: "#9a9a9a", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, color: "#4f46e5" }}>DM → {m.name}</span>
                <span style={{ color: attColor(m.att), fontWeight: 600 }}>{eurR(m.commission)}</span>
              </div>
              <div style={{ fontSize: 12, color: "#6a6a6a", lineHeight: 1.6, fontFamily: "system-ui, sans-serif", whiteSpace: "pre-wrap", maxHeight: 120, overflow: "auto" }}>
                {m.msg}
              </div>
            </div>
          ))}
        </div>

        {error && <div style={{ margin: "0 24px 12px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, color: "#dc2626" }}>❌ {error}</div>}

        <div style={{ padding: "0 24px 24px", display: "flex", gap: 10 }}>
          {!done ? (
            <button onClick={handleSend} disabled={sending} style={{
              flex: 1, padding: "13px",
              background: target === "all" ? "#1a1a1a" : "#16a34a",
              border: "none", borderRadius: 8, color: "#fff", fontSize: 14, cursor: sending ? "not-allowed" : "pointer",
              fontWeight: 700, fontFamily: "inherit", opacity: sending ? 0.7 : 1,
            }}>
              {sending ? "Envoi en cours..." : target === "me" ? "Envoyer à moi pour tester" : "Envoyer à l'équipe"}
            </button>
          ) : (
            <div style={{ flex: 1, padding: "13px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, color: "#16a34a", fontSize: 14, fontWeight: 700, textAlign: "center" }}>
              ✓ Messages envoyés !
            </div>
          )}
          <button onClick={onClose} style={{ padding: "13px 20px", background: "#fafafa", border: "1.5px solid #e8e8e8", borderRadius: 8, color: "#6a6a6a", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Fermer</button>
        </div>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────
const now = new Date();

export default function App() {
  const [loggedIn,    setLoggedIn]   = useState(false);
  const [liveData,    setLiveData]   = useState({});
  const [salaryMonth, setSalaryMonth]= useState(now.getMonth() + 1);
  const [salaryYear,  setSalaryYear] = useState(now.getFullYear());
  const [showSlack,   setShowSlack]  = useState(false);
  const [slackLog,    setSlackLog]   = useState([]);
  const [refreshing,  setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh]= useState(null);
  const [flashMsg,    setFlashMsg]   = useState(null);

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;

  const mergedData = { ...HUBSPOT_DATA, ...liveData };
  const members   = compute(salaryYear, salaryMonth, mergedData);
  const hasData   = !!(mergedData)[paymentKey(salaryYear, salaryMonth)];
  const aeMembers = members.filter(m => !m.isTeamQuota);
  const payLbl    = paymentLabel(salaryYear, salaryMonth);
  const salLbl    = `${MONTHS_FR[salaryMonth-1]} ${salaryYear}`;

  const handleRefresh = async () => {
    setRefreshing(true);
    setFlashMsg(null);
    try {
      const key = paymentKey(salaryYear, salaryMonth);
      const [payYear, payMonth] = key.split("-").map(Number);
      const res = await fetch(`/api/hubspot-deals?year=${payYear}&month=${payMonth}`);
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Erreur HubSpot");
      setLiveData(prev => ({ ...prev, [key]: { members: Object.entries(json.members).map(([id, deals]) => ({ id, deals })) } }));
      setLastRefresh(new Date());
      setFlashMsg(`✓ Données à jour · ${payLbl}`);
    } catch(e) {
      setFlashMsg(`⚠ ${e.message}`);
    }
    setRefreshing(false);
    setTimeout(() => setFlashMsg(null), 5000);
  };

  const handleSend = async (target, previews) => {
    const msgs = target === "me"
      ? previews.map(m => ({ slackId: SLACK_TEST_USER, text: m.msg }))
      : previews.map(m => ({ slackId: m.slackId, text: m.msg }));

    const res = await fetch("/api/slack-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs }),
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "Erreur envoi Slack");
    setSlackLog(prev => [...prev, { target, salLbl, sentAt: new Date().toLocaleTimeString("fr-FR") }]);
  };

  const years = [2025, 2026, 2027];

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7f4", color: "#1a1a1a", fontFamily: "'DM Mono','Courier New',monospace" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1.5px solid #e8e8e8", padding: "18px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 4, color: "#9a9a9a", textTransform: "uppercase", marginBottom: 3 }}>Loyoly · Sales</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>Commission Calculator</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {flashMsg && (
            <div style={{ fontSize: 12, color: flashMsg.startsWith("✓") ? "#16a34a" : "#d97706", background: flashMsg.startsWith("✓") ? "#f0fdf4" : "#fffbeb", border: `1px solid ${flashMsg.startsWith("✓") ? "#bbf7d0" : "#fde68a"}`, padding: "7px 14px", borderRadius: 8 }}>
              {flashMsg}
            </div>
          )}
          {slackLog.length > 0 && (
            <div style={{ fontSize: 11, color: "#16a34a", textAlign: "right" }}>
              {slackLog.map((l,i) => <div key={i}>✓ Slack {l.target === "me" ? "test" : "équipe"} · {l.salLbl} · {l.sentAt}</div>)}
            </div>
          )}
          <button onClick={handleRefresh} disabled={refreshing} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px", background: "#fafafa",
            border: "1.5px solid #e8e8e8", borderRadius: 8,
            color: refreshing ? "#c0c0c0" : "#6a6a6a", fontSize: 13,
            cursor: refreshing ? "not-allowed" : "pointer",
            fontFamily: "inherit", fontWeight: 500,
          }}>
            <span style={{ display: "inline-block", animation: refreshing ? "spin 1s linear infinite" : "none" }}>⟳</span>
            {refreshing ? "Actualisation…" : lastRefresh ? `Actualisé ${lastRefresh.toLocaleTimeString("fr-FR", {hour:"2-digit",minute:"2-digit"})}` : "Actualiser"}
          </button>
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 980, margin: "0 auto" }}>

        {/* Period selector */}
        <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, padding: "16px 22px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#9a9a9a", textTransform: "uppercase", marginRight: 4 }}>Salaire de</div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {MONTHS_FR.map((m, i) => {
              const month = i + 1;
              const isActive = month === salaryMonth;
              const key = paymentKey(salaryYear, month);
              const hasD = !!HUBSPOT_DATA[key];
              return (
                <button key={month} onClick={() => setSalaryMonth(month)} style={{
                  padding: "5px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                  background: isActive ? "#1a1a1a" : hasD ? "#f0fdf4" : "transparent",
                  border: `1.5px solid ${isActive ? "#1a1a1a" : hasD ? "#bbf7d0" : "#e8e8e8"}`,
                  color: isActive ? "#fff" : hasD ? "#16a34a" : "#9a9a9a",
                  fontWeight: isActive ? 700 : 400, position: "relative",
                }}>
                  {m.slice(0,3)}
                  {hasD && !isActive && <span style={{ position: "absolute", top: 2, right: 2, width: 4, height: 4, background: "#16a34a", borderRadius: "50%", display: "block" }} />}
                </button>
              );
            })}
          </div>
          <select value={salaryYear} onChange={e => setSalaryYear(+e.target.value)} style={{ background: "#fafafa", border: "1.5px solid #e8e8e8", borderRadius: 6, color: "#1a1a1a", padding: "6px 12px", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "#9a9a9a" }}>→ Paiements {payLbl}</span>
            {!hasData && (
              <span style={{ fontSize: 11, background: "#fffbeb", border: "1px solid #fde68a", color: "#d97706", padding: "4px 10px", borderRadius: 20 }}>
                Données non chargées
              </span>
            )}
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {members.map(m => <MemberCard key={m.id} member={m} />)}
        </div>

        {/* Deals Table */}
        <DealsTable members={members} />

        {/* Payfit + Slack */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, marginTop: 20, alignItems: "start" }}>
          <PayfitBlock members={members} />
          <div style={{ background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 12, padding: "20px 24px", minWidth: 220, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "#9a9a9a", textTransform: "uppercase", marginBottom: 14 }}>Slack</div>
            <button onClick={() => setShowSlack(true)} disabled={!hasData} style={{
              width: "100%", padding: "12px 0",
              background: hasData ? "#1a1a1a" : "#fafafa",
              border: `1.5px solid ${hasData ? "#1a1a1a" : "#e8e8e8"}`,
              borderRadius: 10, color: hasData ? "#fff" : "#c0c0c0",
              fontSize: 14, cursor: hasData ? "pointer" : "not-allowed",
              fontWeight: 700, fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              <span>💬</span> Envoyer récaps
            </button>
            <div style={{ marginTop: 10, fontSize: 11, color: "#9a9a9a", textAlign: "center" }}>
              {hasData ? `4 messages · ${salLbl}` : "Charge d'abord les données"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, padding: "12px 16px", background: "#fff", border: "1.5px solid #e8e8e8", borderRadius: 8, fontSize: 12, color: "#9a9a9a" }}>
          💡 Pour charger un nouveau mois, demande à Claude : <span style={{ color: "#1a1a1a", fontWeight: 500 }}>"Calcule les commissions de [mois]"</span>
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
