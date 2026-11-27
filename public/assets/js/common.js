export const $ = (s, r = document) => r.querySelector(s);
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
// Somali mobile numbers: 252 + 9 digits starting with 6, 7 or 9. Returns "2526XXXXXXXX" or null.
export function normPhone(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (!d.startsWith("252")) d = d.startsWith("0") ? "252" + d.slice(1) : d.length === 9 ? "252" + d : d;
  return /^252[679]\d{8}$/.test(d) ? d : null;
}
// Members sign in with phone + password. Firebase Auth stores it as a private pseudo-email (nothing is ever sent to it).
export const phoneEmail = (p) => `${p}@phone.iskaashato.app`;
// Somalia is UTC+3: use its calendar day, not the UTC one (UTC would give "yesterday" between 00:00 and 03:00).
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Mogadishu" });
export const digits = (t) => String(t || "").replace(/\D/g, "");
export const initials = (n) => String(n || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
export const byDate = (a, b) => b.date.localeCompare(a.date);

export const DUES = "Lacagta xubinnimada";
export const IG = {
  Xubinnimo: [DUES, "Gunno bille ah"],
  "Qaaraan & qaraabo": ["Qaaraan", "Qaaraan toleed", "Toleed (tol)", "Gargaar qaraabo", "Tacsi (dhimasho)", "Arooska/Munaasabad", "Cilaaj/Xanuun", "Diya/Mag"],
  "Deeq & maalgelin": ["Deeq", "Maalgelin", "Sadaqo", "Zakaat", "Lacag dhigasho"],
  Kale: ["Dakhli kale"],
};
export const EG = {
  "Qaraabo & gargaar": ["Qof la kaalmeeyay", "Cilaaj/Xanuun", "Dhimasho (xabaal, tacsi)", "Arooska/Munaasabad", "Dhalmo", "Diya/Mag", "Waxbarasho/Kafaala", "Safar qof", "Gargaar degdeg ah", "Qaaraan la gaarsiiyay", "Sadaqo/Zakaat la bixiyay", "Ciid"],
  Hawlgal: ["Kiro", "Mushahar", "Gaadiid", "Adeegyo (koronto, biyo)", "Isgaarsiin", "Alaab", "Kharash bangi", "Kharash kale"],
};
export const REL = ["Xubin", "Qaraabo", "Deris/Saaxiib", "Shirkad/Adeeg", "Kale"];
export const ROLES = { admin: "Maamule sare", treasurer: "Lacag-qabte", adder: "Ku-darra lacagta", viewer: "Daawade", pending: "Sugaya ogolaansho" };
export const defaultCfg = { org: "ISKAASHATADA BIN NAAKHUDI", cur: "$", dueAmt: 0, dueDate: "", pStart: "" };

const P = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10", plus: "M12 5v14M5 12h14",
  users: "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M17 4.5a3.5 3.5 0 010 6.5M18.5 14.5c2 .7 3 2.6 3 5.5",
  bell: "M6 17V11a6 6 0 1112 0v6l1.5 2h-15zM10 21h4", doc: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  out: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10", book: "M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11",
  act: "M4 6h16M4 12h16M4 18h10", cfg: "M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3",
  heart: "M12 21s-7-4.4-9.3-9A5.3 5.3 0 0112 6.6 5.3 5.3 0 0121.3 12C19 16.6 12 21 12 21z",
  wallet: "M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 7l2-3h12M16 14h3",
  safe: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
};
export const ic = (n) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n]}"/></svg>`;

export const money = (D, n) => D.cfg.cur + " " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const sum = (t, a) => a.filter((x) => x.type === t).reduce((s, x) => s + x.amt, 0);
export const bal = (D) => sum("in", D.tx) - sum("out", D.tx);
export const memName = (D, id) => (id === "public" ? "Deeq dadweyne" : D.members.find((m) => m.id === id)?.name || "(la tirtiray)");
export const memIn = (D, id) => D.tx.filter((x) => x.type === "in" && x.party === id && x.cat === DUES && (!D.cfg.pStart || x.date >= D.cfg.pStart)).reduce((s, x) => s + x.amt, 0);
export const unpaid = (D) => (D.cfg.dueAmt > 0 ? D.members.filter((m) => memIn(D, m.id) < D.cfg.dueAmt) : []);
export const late = (D) => !!D.cfg.dueDate && today() > D.cfg.dueDate && unpaid(D).length > 0;

export function txRow(D, x, extra = "") {
  const i = x.type === "in", n = i ? (x.party === "public" && x.donor ? x.donor : memName(D, x.party)) : x.party;
  return `<div class="it"><div class="av ${i ? "inc" : "exp"}">${esc(initials(n))}</div><div class="tx"><b>${esc(n)}</b><small>${esc(x.cat)} · ${esc(x.date)}${x.ev ? " · " + esc(x.ev) : ""}${x.rel ? " · " + esc(x.rel) : ""}</small>${x.note ? `<small>${esc(x.note)}</small>` : ""}${extra}</div><div class="am ${i ? "inc" : "exp"}">${i ? "+" : "−"}${money(D, x.amt)}</div></div>`;
}

export function txForm(D, t, e = {}) {
  const i = t === "in", G = i ? IG : EG, v = (k) => esc(e[k] ?? "");
  const pay = [...new Set([...D.tx.filter((x) => x.type === "out").map((x) => x.party), ...D.members.map((m) => m.name)])];
  const evs = [...new Set(D.tx.map((x) => x.ev).filter(Boolean))];
  const who = i
    ? `<select name="party" required>${e.party === "public" ? '<option value="public" selected>Deeq dadweyne</option>' : ""}${D.members.map((m) => `<option value="${esc(m.id)}"${m.id === e.party ? " selected" : ""}>${esc(m.name)}${m.family ? " (" + esc(m.family) + ")" : ""}</option>`).join("")}</select>`
    : `<input name="party" list="pl" value="${v("party")}" autocomplete="off" required><datalist id="pl">${pay.map((p) => `<option value="${esc(p)}">`).join("")}</datalist>`;
  return `<form id="tf" class="card form" data-t="${t}">
<label>Lacagta (${esc(D.cfg.cur)})<input class="amt" type="number" name="amt" step="0.01" min="0.01" inputmode="decimal" value="${v("amt")}" required></label>
<label>${i ? "Cidda bixisay" : "Cidda la siiyay"}${who}</label>
<label>Nooca<select name="cat">${Object.entries(G).map(([g, l]) => `<optgroup label="${esc(g)}">${l.map((c) => `<option${c === e.cat ? " selected" : ""}>${esc(c)}</option>`).join("")}</optgroup>`).join("")}</select></label>
<label>Taariikh<input type="date" name="date" value="${esc(e.date || today())}" required></label>
<label>Dhacdo / ujeeddo (ikhtiyaari)<input name="ev" list="evl" value="${v("ev")}" placeholder="tus. Qaaraanka Axmed"><datalist id="evl">${evs.map((p) => `<option value="${esc(p)}">`).join("")}</datalist></label>
${i ? "" : `<label>Xiriirka<select name="rel"><option value="">—</option>${REL.map((r) => `<option${r === e.rel ? " selected" : ""}>${r}</option>`).join("")}</select></label>`}
<label>Faahfaahin<input name="note" value="${v("note")}"></label>
<button class="btn ${i ? "inc" : "exp"}">Kaydi</button></form>`;
}

export function readTx(form, t) {
  const d = Object.fromEntries(new FormData(form));
  return { type: t, date: d.date, party: String(d.party || "").trim(), cat: d.cat, amt: parseFloat(d.amt), note: (d.note || "").trim(), ev: (d.ev || "").trim(), rel: d.rel || "" };
}
