import { auth, A, db, F } from "./firebase.js";
import { $, esc, money, sum, bal, memIn, memName, initials, byDate, txRow, ic } from "./common.js";
import { D, watch, stop } from "./data.js";
import { reportView, shareText } from "./reports.js";
import { screen as S, authForm, submitAuth } from "./auth-ui.js";

// Read-only member portal: nothing in this file writes to the database (except sign-up of the user's own profile).
const root = $("#app"), screen = (h) => S(root, h);
let U = null, P = null, tab = "home", flt = "all", q = "", lim = 30, ev = null, authMode = "in", unsub = null, started = false;
let rs = { k: "g", a: "", b: "", m: "" };

A.onAuthStateChanged(auth, (u) => {
  unsub?.(); stop(); started = false; U = u; P = null;
  if (!u) return authForm(root, authMode === "up", "Bogga Xubnaha · ISKAASHATADA BIN NAAKHUDI");
  unsub = F.onSnapshot(F.doc(db, "users", u.uid), (s) => { P = s.exists() ? s.data() : null; gate(); }, () => { P = null; gate(); });
});

function gate() {
  if (!U) return;
  if (!P) return screen(`<p class="mute">Akoonkaaga waa la diyaarinayaa…</p><button class="btn ghost" data-act="out">Ka bax</button>`);
  if (P.role === "pending") return screen(`<h1>Waa la sugayaa</h1><p>Maamulaha sare ayaa akoonkaaga ogolaanaya. Marka la ogolaado, halkan ayaad ka daawan doontaa dhaqdhaqaaqa oo dhan.</p><button class="btn ghost" data-act="out">Ka bax</button>`);
  if (!started) { started = true; watch(["members", "tx"], () => render(), () => { render(true); }); }
  render(true);
}

const tabs = [["home", "Guud", "home"], ["feed", "Dhaqdhaqaaq", "act"], ["ev", "Qaaraan", "heart"], ["mem", "Xubnaha", "users"], ["rep", "Warbixin", "doc"]];

function render(force) {
  if (!P || P.role === "pending") return;
  if (!force && document.activeElement?.closest("form,#q")) return;
  const view = { home, feed, ev: evView, mem: memView, rep: () => reportView(D, rs) }[tab]();
  root.innerHTML = `<header class="top"><div class="in"><div><small>${esc(D.cfg.org)} · daawasho</small><b>${money(D, bal(D))}</b></div><button class="ico" data-act="out" aria-label="Ka bax">${ic("out")}</button></div></header><main>${view}</main><nav class="bar" style="--n:5">${tabs.map(([k, l, i]) => `<button data-tab="${k}" aria-current="${tab === k}">${ic(i)}<span>${l}</span></button>`).join("")}</nav>`;
}

function mine() {
  const m = D.members.find((x) => x.id === P.memberId);
  if (!m) return `<div class="card"><small>Xisaabtayda</small><p>Akoonkaaga weli lama xiriirin xubin. Weydii maamulaha sare inuu ku xiriiriyo.</p></div>`;
  const c = D.cfg, all = sum("in", D.tx.filter((x) => x.party === m.id)), paid = memIn(D, m.id);
  const st = c.dueAmt > 0 ? (paid >= c.dueAmt ? `<span class="chip ok">✓ Waa bixiyay</span>` : `<span class="chip bad">Dhiman ${money(D, c.dueAmt - paid)}${c.dueDate ? " · ilaa " + esc(c.dueDate) : ""}</span>`) : "";
  const fam = m.family ? sum("in", D.tx.filter((x) => D.members.find((z) => z.id === x.party)?.family === m.family)) : 0;
  return `<div class="card"><small>Xisaabtayda</small><b class="big">${esc(m.name)}</b><div class="two"><div><small>Wadarta aan bixiyay</small><b class="inc">${money(D, all)}</b></div>${m.family ? `<div><small>Qoyska ${esc(m.family)}</small><b>${money(D, fam)}</b></div>` : ""}</div>${st ? `<div class="acts">${st}</div>` : ""}</div>`;
}

function home() {
  const i = sum("in", D.tx), e = sum("out", D.tx), r = [...D.tx].sort(byDate).slice(0, 6);
  return `<section class="hero"><small>Hadhaagga hadda</small><strong>${money(D, i - e)}</strong><div class="two"><div><small>Soo gashay</small><b>${money(D, i)}</b></div><div><small>Baxay</small><b>${money(D, e)}</b></div></div></section><div style="height:12px"></div>${mine()}<h2>Dhawaan</h2><div class="card list">${r.map((x) => txRow(D, x)).join("") || '<p class="empty">Weli wax lama diiwaangelin.</p>'}</div>`;
}

function feedRows() {
  const t = q.trim().toLowerCase();
  const all = [...D.tx].sort(byDate).filter((x) => (flt === "all" || x.type === flt) && (!t || [x.type === "in" ? memName(D, x.party) : x.party, x.cat, x.ev, x.note].join(" ").toLowerCase().includes(t)));
  return `<div class="card list">${all.slice(0, lim).map((x) => txRow(D, x)).join("") || '<p class="empty">Wax lama helin.</p>'}</div>${all.length > lim ? `<button class="btn ghost" data-more>Intaa kale (${all.length - lim})</button>` : ""}`;
}
function feed() {
  const b = (k, l) => `<button data-flt="${k}" aria-pressed="${flt === k}">${l}</button>`;
  return `<h2>Dhaqdhaqaaqa oo dhan</h2><div class="seg three">${b("all", "Dhammaan")}${b("in", "Soo gasha")}${b("out", "Kharash")}</div><input type="search" id="q" placeholder="Raadi magac, nooc, dhacdo…" value="${esc(q)}" aria-label="Raadi"><div id="fl">${feedRows()}</div>`;
}

function evView() {
  if (ev !== null) {
    const l = D.tx.filter((x) => (x.ev || "") === ev).sort(byDate), i = sum("in", l), e = sum("out", l);
    return `<button class="btn ghost" data-back>← Dib</button><h2>${esc(ev || "Aan dhacdo lahayn")}</h2><div class="card two"><div><small>Soo gashay</small><b class="inc">${money(D, i)}</b></div><div><small>Baxay</small><b class="exp">${money(D, e)}</b></div></div><div class="card" style="margin-top:10px"><small>Hadhaagga dhacdadan</small><b class="big">${money(D, i - e)}</b></div><h3>Dhaqdhaqaaqa</h3><div class="card list">${l.map((x) => txRow(D, x)).join("")}</div>`;
  }
  const o = {}; D.tx.forEach((x) => { const k = x.ev || ""; (o[k] = o[k] || [0, 0])[x.type === "in" ? 0 : 1] += x.amt; });
  const rows = Object.entries(o).sort((a, b) => b[1][0] - a[1][0]).map(([k, [p, q2]]) => `<button class="card evc" data-ev="${esc(k)}"><b>${esc(k || "Aan dhacdo lahayn")}</b><small>Soo gashay ${money(D, p)} · Baxay ${money(D, q2)}</small><div class="bar2" aria-hidden="true"><i style="width:${p ? Math.min(100, (q2 / p) * 100) : 0}%"></i></div><small>Hadhaag: <b class="${p - q2 >= 0 ? "inc" : "exp"}">${money(D, p - q2)}</b></small></button>`).join("");
  return `<h2>Qaaraan & dhacdooyin</h2><p class="hint">Taabo dhacdo si aad u aragto cidda bixisay iyo meesha lacagta loo isticmaalay.</p>${rows || '<p class="empty">Weli dhacdo lama diiwaangelin.</p>'}`;
}

function memView() {
  const fam = {}; D.members.forEach((m) => { const k = m.family || "Aan qoys lahayn"; (fam[k] = fam[k] || []).push(m); });
  const c = D.cfg, tot = (id) => sum("in", D.tx.filter((x) => x.party === id));
  return `<h2>Xubnaha iyo qoysaska</h2>${Object.entries(fam).map(([k, a]) => `<h3>${esc(k)} <span>${a.length} · ${money(D, a.reduce((s, m) => s + tot(m.id), 0))}</span></h3><div class="card list">${a.map((m) => `<div class="it"><div class="av">${esc(initials(m.name))}</div><div class="tx"><b>${esc(m.name)}</b>${c.dueAmt > 0 ? (memIn(D, m.id) >= c.dueAmt ? '<small class="inc">✓ Waa bixiyay</small>' : '<small class="exp">Wuu dhiman yahay</small>') : ""}</div><div class="am inc">${money(D, tot(m.id))}</div></div>`).join("")}</div>`).join("") || '<p class="empty">Weli xubin ma jirto.</p>'}`;
}

root.addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab],[data-act],[data-flt],[data-more],[data-ev],[data-back]");
  if (!b) return;
  const s = b.dataset;
  if (s.tab) { tab = s.tab; ev = null; render(true); scrollTo(0, 0); }
  else if (s.flt) { flt = s.flt; lim = 30; render(true); }
  else if ("more" in s) { lim += 30; $("#fl").innerHTML = feedRows(); }
  else if (s.ev !== undefined) { ev = s.ev; render(true); scrollTo(0, 0); }
  else if ("back" in s) { ev = null; render(true); }
  else if (s.act === "out") A.signOut(auth);
  else if (s.act === "sw") { authMode = authMode === "in" ? "up" : "in"; authForm(root, authMode === "up", "Bogga Xubnaha · ISKAASHATADA BIN NAAKHUDI"); }
  else if (s.act === "pr") print();
  else if (s.act === "sh") navigator.share ? navigator.share({ title: D.cfg.org, text: shareText(D) }).catch(() => {}) : window.open("https://wa.me/?text=" + encodeURIComponent(shareText(D)), "_blank", "noopener");
});

root.addEventListener("input", (e) => { if (e.target.id === "q") { q = e.target.value; lim = 30; $("#fl").innerHTML = feedRows(); } });

root.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target, d = Object.fromEntries(new FormData(f));
  if (f.id === "af") submitAuth(f, authMode === "up");
  else if (f.id === "rf") { rs = { k: d.k, a: d.a, b: d.b, m: d.m || rs.m }; render(true); }
});
