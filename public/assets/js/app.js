import { auth, A, db, F } from "./firebase.js";
import { $, esc, money, sum, bal, memIn, unpaid, late, digits, initials, byDate, txForm, readTx, txRow, ic } from "./common.js";
import { D, watch, stop, add, logit } from "./data.js";
import { reportView, shareText } from "./reports.js";
import { screen as S, authForm, submitAuth } from "./auth-ui.js";

const root = $("#app");
let U = null, P = null, tab = "home", mode = "in", flash = "", authMode = "in", unsub = null, started = false;
let rs = { k: "g", a: "", b: "", m: "" };
const can = (...r) => r.includes(P?.role);

if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));

A.onAuthStateChanged(auth, (u) => {
  unsub?.(); stop(); started = false; U = u; P = null;
  if (!u) return authView();
  unsub = F.onSnapshot(F.doc(db, "users", u.uid), (s) => { P = s.exists() ? s.data() : null; gate(); }, () => { P = null; gate(); });
});

const screen = (html) => S(root, html);

function gate() {
  if (!U) return;
  if (!P) return screen(`<p class="mute">Akoonkaaga waa la diyaarinayaa…</p><button class="btn ghost" data-act="out">Ka bax</button>`);
  if (P.role === "pending") return screen(`<h1>Waa la sugayaa</h1><p>Maamulaha sare ayaa akoonkaaga ogolaanaya. Marka la ogolaado, halkan ayaad ka arki doontaa xisaabta.</p><button class="btn ghost" data-act="out">Ka bax</button>`);
  if (P.role === "viewer") { location.replace("xubin/"); return; }
  if (!started) { started = true; watch(["members", "tx"], () => render(), () => { flash = "Xogta lama heli karo. Hubi ogolaanshahaaga."; render(true); }); }
  render(true);
}

const authView = () => authForm(root, authMode === "up");

function render(force) {
  if (!P || P.role === "pending") return;
  if (!force && document.activeElement?.closest("form")) return;
  const canIn = can("admin", "treasurer", "adder"), canOut = can("admin", "treasurer");
  const tabs = [["home", "Guud", "home"], ...(canIn ? [["add", "Ku dar", "plus"]] : []), ["mem", "Xubnaha", "users"], ["due", "Xusuusin", "bell"], ["rep", "Warbixin", "doc"]];
  if (!tabs.some((t) => t[0] === tab)) tab = "home";
  const view = { home, add: () => addView(canOut), mem: memView, due: dueView, rep: () => reportView(D, rs) }[tab]();
  root.innerHTML = `<header class="top"><div class="in"><div><small>${esc(D.cfg.org)}</small><b>${money(D, bal(D))}</b></div><button class="ico" data-act="out" aria-label="Ka bax">${ic("out")}</button></div></header><main>${flash ? `<div class="note" role="status">${esc(flash)}</div>` : ""}${view}</main><nav class="bar" style="--n:${tabs.length}">${tabs.map(([k, l, i]) => `<button data-tab="${k}" aria-current="${tab === k}">${ic(i)}<span>${l}</span>${k === "due" && late(D) ? '<i class="dot"></i>' : ""}</button>`).join("")}</nav>`;
  flash = "";
}

function home() {
  const i = sum("in", D.tx), e = sum("out", D.tx), r = [...D.tx].sort(byDate).slice(0, 8);
  return `<section class="hero"><small>Hadhaagga hadda</small><strong>${money(D, i - e)}</strong><div class="two"><div><small>Soo gashay</small><b>${money(D, i)}</b></div><div><small>Baxay</small><b>${money(D, e)}</b></div></div></section>${late(D) ? `<button class="alert" data-tab="due">⚠ ${unpaid(D).length} xubnood ma bixin lacagtii waqtigeedu dhammaaday</button>` : ""}<h2>Dhawaan</h2><div class="card list">${r.map((x) => txRow(D, x)).join("") || '<p class="empty">Weli wax lama diiwaangelin.</p>'}</div>`;
}

function addView(canOut) {
  if (!canOut) mode = "in";
  const list = D.tx.filter((x) => x.type === mode).sort(byDate).slice(0, 15);
  const seg = canOut ? `<div class="seg"><button data-mode="in" aria-pressed="${mode === "in"}">Soo gasha</button><button data-mode="out" aria-pressed="${mode === "out"}">Kharash</button></div>` : "";
  const body = mode === "in" && !D.members.length ? '<div class="card"><p>Marka hore ku dar xubin tab-ka “Xubnaha”.</p></div>' : txForm(D, mode);
  return `${seg}${body}<h2>Dhawaan</h2><div class="card list">${list.map((x) => txRow(D, x)).join("") || '<p class="empty">Wax ma jiraan.</p>'}</div>`;
}

function memView() {
  const fam = {}, tot = (id) => sum("in", D.tx.filter((x) => x.party === id)), fams = [...new Set(D.members.map((m) => m.family).filter(Boolean))];
  D.members.forEach((m) => { const k = m.family || "Aan qoys lahayn"; (fam[k] = fam[k] || []).push(m); });
  const form = can("admin", "treasurer") ? `<details class="card"><summary>＋ Ku dar xubin</summary><form id="mf" class="form"><label>Magaca<input name="name" required></label><label>Taleefan (+252…)<input name="tel" type="tel" inputmode="tel"></label><label>Qoyska (isku-darsan)<input name="family" list="fl"><datalist id="fl">${fams.map((x) => `<option value="${esc(x)}">`).join("")}</datalist></label><button class="btn">Ku dar</button></form></details>` : "";
  return `<h2>Xubnaha iyo qoysaska</h2>${form}${Object.entries(fam).map(([k, a]) => `<h3>${esc(k)} <span>${a.length} · ${money(D, a.reduce((s, m) => s + tot(m.id), 0))}</span></h3><div class="card list">${a.map((m) => `<div class="it"><div class="av">${esc(initials(m.name))}</div><div class="tx"><b>${esc(m.name)}</b><small>${esc(m.tel || "")}</small></div><div class="am inc">${money(D, tot(m.id))}</div></div>`).join("")}</div>`).join("") || '<p class="empty">Weli xubin ma jirto.</p>'}`;
}

function dueView() {
  const c = D.cfg, u = unpaid(D), n = D.members.length;
  const wa = (x) => encodeURIComponent(`Salaan ${x.name}, xusuusin: lacagta ${c.org} (${c.cur}${c.dueAmt}) waxaa kugu waajib ah ${c.dueDate ? "ilaa " + c.dueDate : "hadda"}. Mahadsanid.`);
  return `<h2>Xusuusinta lacag-bixinta</h2>${c.dueAmt > 0 ? `<div class="card"><b>${money(D, c.dueAmt)}</b> xubin kasta${c.dueDate ? ` · ugu dambeyn ${esc(c.dueDate)}` : ""}<br><small>${n - u.length} bixiyay · ${u.length} ma bixin</small></div>` : '<div class="card"><p>Maamuluhu wuxuu dejiyaa lacagta iyo taariikhda bogga maamulka.</p></div>'}${late(D) ? '<div class="note warn">⚠ Waqtigii wuu dhammaaday. Wac ama WhatsApp u dir:</div>' : ""}<div class="card list">${u.map((x) => `<div class="it"><div class="av exp">${esc(initials(x.name))}</div><div class="tx"><b>${esc(x.name)}</b><small>${esc(x.family || "")} · la bixiyay ${money(D, memIn(D, x.id))}</small>${x.tel ? `<div class="acts"><a class="chip" href="tel:${digits(x.tel)}">📞 Wac</a><a class="chip" href="https://wa.me/${digits(x.tel)}?text=${wa(x)}" target="_blank" rel="noopener">WhatsApp</a></div>` : "<small>Taleefan ma jiro</small>"}</div></div>`).join("") || '<p class="empty">Qof walba waa bixiyay ✓</p>'}</div>`;
}

async function share() {
  try { if (navigator.share) await navigator.share({ title: D.cfg.org, text: shareText(D) }); else window.open("https://wa.me/?text=" + encodeURIComponent(shareText(D)), "_blank", "noopener"); } catch {}
}
const deny = () => { flash = "Waa la diiday: ogolaansho uma haysatid."; render(true); };

root.addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab],[data-mode],[data-act]");
  if (!b) return;
  const s = b.dataset;
  if (s.tab) { tab = s.tab; render(true); scrollTo(0, 0); }
  else if (s.mode) { mode = s.mode; render(true); }
  else if (s.act === "out") A.signOut(auth);
  else if (s.act === "sw") { authMode = authMode === "in" ? "up" : "in"; authView(); }
  else if (s.act === "pr") print();
  else if (s.act === "sh") share();
});

root.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target, d = Object.fromEntries(new FormData(f));
  if (f.id === "af") submitAuth(f, authMode === "up");
  else if (f.id === "tf") {
    const t = f.dataset.t, x = readTx(f, t);
    add("tx", { ...x, by: U.uid, byName: P.name, at: F.serverTimestamp() }).catch(deny);
    logit(P, U.uid, "Ku dar", `${t === "in" ? "soo gasha" : "kharash"} ${x.amt}`);
    flash = "Waa la kaydiyay ✓"; render(true); scrollTo(0, 0);
  } else if (f.id === "mf") {
    add("members", { name: d.name.trim(), tel: d.tel.trim(), family: d.family.trim() }).catch(deny);
    logit(P, U.uid, "Xubin cusub", d.name.trim());
    flash = "Xubinta waa la daray ✓"; render(true);
  } else if (f.id === "rf") { rs = { k: d.k, a: d.a, b: d.b, m: d.m || rs.m }; render(true); }
});
