import { db, F } from "./firebase.js";
import { $, esc, digits } from "./common.js";

// Public page: no sign-in. Reads one document (pub/summary) that the admin publishes on purpose.
const root = $("#app");
const fmt = (c, n) => c + " " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function view(S) {
  if (!S || !S.on) return `<main><div class="card"><h2 style="margin-top:0">Bog weli lama daabicin</h2><p class="mute">Maamulka iskaashatada ayaa halkan ku soo bandhigi doona warbixinta guud marka uu diyaar noqdo.</p></div></main>`;
  const f = (n) => fmt(S.cur, n);
  const camps = (S.campaigns || []).map((c) => {
    const base = c.target > 0 ? c.target : c.collected, pct = base > 0 ? Math.min(100, (c.collected / base) * 100) : 0;
    return `<div class="card" style="margin-bottom:10px"><b>${esc(c.name)}</b><div class="bar2 g" role="img" aria-label="${Math.round(pct)}%"><i style="width:${pct}%"></i></div><div class="two"><div><small>La ururiyay${c.target > 0 ? " / hadafka" : ""}</small><b class="inc">${f(c.collected)}${c.target > 0 ? " / " + f(c.target) : ""}</b></div><div><small>La isticmaalay</small><b class="exp">${f(c.spent)}</b></div></div><small>${c.donors} xubnood ayaa gacan ka geystay · hadhaag ${f(c.collected - c.spent)}</small></div>`;
  }).join("");
  const feed = (S.feed || []).map((x) => `<div class="it"><div class="av ${x.type === "in" ? "inc" : "exp"}">${x.type === "in" ? "＋" : "−"}</div><div class="tx"><b>${esc(x.label)}</b><small>${esc(x.cat)} · ${esc(x.date)}</small></div><div class="am ${x.type === "in" ? "inc" : "exp"}">${f(x.amt)}</div></div>`).join("");
  return `<header class="top"><div class="in"><div><small>Bogga dadweynaha</small><b>${esc(S.org)}</b></div></div></header><main>
${S.note ? `<div class="card" style="white-space:pre-wrap">${esc(S.note)}</div>` : ""}
${S.showBalance ? `<section class="hero" style="margin-top:12px"><small>Hadhaagga iskaashatada</small><strong>${f(S.balance)}</strong><div class="two"><div><small>Soo gashay</small><b>${f(S.income)}</b></div><div><small>Baxay</small><b>${f(S.expense)}</b></div></div></section>` : ""}
<div class="two" style="margin-top:12px"><div class="card"><small>Xubnaha</small><b class="big">${S.members}</b></div><div class="card"><small>Qoysaska</small><b class="big">${S.families}</b></div></div>
${camps ? `<h2>Qaaraan & dhacdooyin</h2>${camps}` : ""}
${S.how || S.contact ? `<h2>Sida loo gacan geysto</h2><div class="card">${S.how ? `<p style="white-space:pre-wrap;margin:0">${esc(S.how)}</p>` : ""}${S.contact ? `<div class="acts"><a class="chip" href="tel:${digits(S.contact)}">📞 Wac</a><a class="chip" href="https://wa.me/${digits(S.contact)}" target="_blank" rel="noopener">WhatsApp</a></div>` : ""}</div>` : ""}
${feed ? `<h2>Dhaqdhaqaaqii u dambeeyay</h2><div class="card list">${feed}</div>` : ""}
<button class="btn ghost" id="share" style="margin-top:16px">Ku wadaag WhatsApp</button>
<p class="hint" style="text-align:center">La cusbooneysiiyay ${esc(String(S.at).slice(0, 10))} · Waa warbixin guud; xogta shakhsiga ah lama daabaco.</p></main>`;
}

// ---- boot
root.innerHTML = '<div class="center"><p class="mute">Waa la furayaa…</p></div>';
F.onSnapshot(F.doc(db, "pub", "summary"), (s) => { root.innerHTML = view(s.exists() ? s.data() : null); }, () => { root.innerHTML = '<main><div class="card"><p>Xogta lama heli karo hadda. Isku day mar kale.</p></div></main>'; });
root.addEventListener("click", (e) => {
  if (e.target.id !== "share") return;
  const u = location.href.split("#")[0], t = "Iskaashatada: halkan ka daawo warbixinta guud — " + u;
  navigator.share ? navigator.share({ title: document.title, text: t, url: u }).catch(() => {}) : window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank", "noopener");
});
