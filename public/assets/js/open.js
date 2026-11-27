import { db, F, call } from "./firebase.js";
import { $, esc, digits } from "./common.js";

// Public page: no sign-in. Reads one document (pub/summary) that the admin publishes on purpose.
const root = $("#app");
const fmt = (c, n) => c + " " + Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function donateForm(S) {
  const opts = (S.campaigns || []).map((c) => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join("");
  return `<h2>Gacan geysi hadda</h2><form id="df" class="card form"><label>Lacagta (${esc(S.cur)})<input class="amt" name="amount" type="number" step="0.01" min="${S.pay.min}" max="${S.pay.max}" inputmode="decimal" required></label><label>Taleefankaaga (EVC Plus, eDahab, ZAAD…)<input name="phone" type="tel" inputmode="tel" placeholder="61xxxxxxx" autocomplete="tel" required></label><label>Magacaaga (ikhtiyaari)<input name="name" maxlength="60" autocomplete="name"></label><label>Qaaraan<select name="ev"><option value="">Guud (deeq)</option>${opts}</select></label><button class="btn inc" id="dbtn">Dir codsiga lacag-bixinta</button><div id="dmsg" role="status"></div><p class="hint">Taleefankaaga ayaa ku weydiin doona PIN-ka. Lacagta waxay tagaysaa qasnada iskaashatada; dadweynuhu lacag ma saari karo.${S.pay.manual ? "<br><b>Habab kale:</b><br>" + esc(S.pay.manual).replace(/\n/g, "<br>") : ""}</p></form>`;
}

function view(S) {
  if (!S || !S.on) return `<header class="top"><div class="in"><div><small>Bogga dadweynaha</small><b>ISKAASHATADA BIN NAAKHUDI</b></div></div></header><main><div class="card"><h2 style="margin-top:0">Soo dhawaaw</h2><p>Bogga warbixinta guud ee iskaashatada dhawaan ayaa la furi doonaa. Fadlan dib u soo eeg.</p><p class="hint">Xubnaha: <a href="../xubin/">gal halkan</a>.</p></div></main>`;
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
${S.pay ? donateForm(S) : ""}
${S.how || S.contact ? `<h2>Sida loo gacan geysto</h2><div class="card">${S.how ? `<p style="white-space:pre-wrap;margin:0">${esc(S.how)}</p>` : ""}${S.contact ? `<div class="acts"><a class="chip" href="tel:${digits(S.contact)}">📞 Wac</a><a class="chip" href="https://wa.me/${digits(S.contact)}" target="_blank" rel="noopener">WhatsApp</a></div>` : ""}</div>` : ""}
${feed ? `<h2>Dhaqdhaqaaqii u dambeeyay</h2><div class="card list">${feed}</div>` : ""}
<button class="btn ghost" id="share" style="margin-top:16px">Ku wadaag WhatsApp</button>
<p class="hint" style="text-align:center">La cusbooneysiiyay ${esc(String(S.at).slice(0, 10))} · Waa warbixin guud; xogta shakhsiga ah lama daabaco.</p></main>`;
}

// ---- boot
root.innerHTML = '<div class="center"><p class="mute" data-boot>Waa la furayaa…</p></div>';
F.onSnapshot(F.doc(db, "pub", "summary"), (s) => { if (document.activeElement?.closest("#df") || $("#dbtn")?.disabled) return; root.innerHTML = view(s.exists() ? s.data() : null); }, () => { root.innerHTML = '<main><div class="card"><p>Xogta lama heli karo hadda. Isku day mar kale.</p></div></main>'; });
root.addEventListener("click", (e) => {
  if (e.target.id !== "share") return;
  const u = location.href.split("#")[0], t = "Iskaashatada: halkan ka daawo warbixinta guud — " + u;
  navigator.share ? navigator.share({ title: document.title, text: t, url: u }).catch(() => {}) : window.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank", "noopener");
});
root.addEventListener("submit", async (e) => {
  if (e.target.id !== "df") return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(e.target)), btn = $("#dbtn"), msg = $("#dmsg");
  btn.disabled = true; msg.className = "note"; msg.textContent = "Fur taleefankaaga oo geli PIN-ka… (waa ilaa 1 daqiiqo)";
  try { await call("donate", { amount: parseFloat(d.amount), phone: d.phone, name: d.name, ev: d.ev }); msg.textContent = "Mahadsanid! Lacagta waa la helay ✓"; e.target.reset(); }
  catch (x) { msg.className = "note warn"; msg.textContent = x.message || "Lacagta lama dhammaystirin."; }
  btn.disabled = false;
});
