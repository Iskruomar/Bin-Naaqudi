import { auth, A, db, F, call } from "./firebase.js";
import { $, esc, uid, money, sum, bal, memIn, memName, unpaid, late, digits, initials, byDate, txForm, readTx, txRow, ic, ROLES, DUES } from "./common.js";
import { D, watch, stop, add, set, logit } from "./data.js";
import { reportView, shareText } from "./reports.js";
import { screen as S, authForm, submitAuth, signup, saveProfile } from "./auth-ui.js";

// Members page. What a person can do depends on their role (enforced again by firestore.rules):
//   viewer    : read everything except phone numbers
//   adder     : + add income
//   treasurer : + add expenses, add members, see phone numbers and dues reminders
//   admin     : same as treasurer here; corrections and role management live on /admin/
const root = $("#app"), screen = (h) => S(root, h);
let flashT = 0;
let U = null, P = null, tab = "home", mode = "in", busy = false, flt = "all", q = "", lim = 30, ev = null, sec = "list", flash = "", authMode = "in", unsub = null, started = false, missing = false;
let rs = { k: "g", a: "", b: "", m: "" };
const can = (...r) => r.includes(P?.role);
const canIn = () => can("admin", "treasurer", "adder"), canOut = () => can("admin", "treasurer");
// Wallet payments need the admin to enable them, and a per-person permission for adders/viewers (treasurer/admin always have it).
const perm = (k) => can("admin", "treasurer") || (can("adder", "viewer") && P?.perms?.[k] === true);
const canPay = () => perm("pay") && !!D.cfg.pay?.on, canCollect = () => perm("collect") && !!D.cfg.pay?.on;

if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("../sw.js").catch(() => {}));

let bootT = null;
A.onAuthStateChanged(auth, (u) => {
  unsub?.(); stop(); started = false; U = u; P = null; clearTimeout(bootT);
  if (!u) return authForm(root, authMode === "up", "Bogga Xubnaha");
  screen(`<p class="mute" style="text-align:center">Waa la furayaa…</p>`);
  bootT = setTimeout(() => { if (!P) screen(`<h1>Lama xiriiri karo</h1><p>Hubi internetka ama ogolaanshahaaga, kadibna dib u day.</p><button class="btn" onclick="location.reload()">Dib u day</button><button class="btn ghost" data-act="out">Ka bax</button>`); }, 12000);
  unsub = F.onSnapshot(F.doc(db, "users", u.uid), (s) => { P = s.exists() ? s.data() : null; missing = !s.exists(); gate(); }, () => { P = null; missing = false; gate(); });
});

// An Auth account exists but its profile was never saved (e.g. the connection dropped during sign-up): let the person finish it.
function recover() {
  const phone = /@phone\.iskaashato\.app$/.test(U.email || "") ? U.email.split("@")[0] : "";
  if (!phone) return screen(`<h1>Akoonka lama dhammaystirin</h1><p>Weydii maamulaha sare inuu kuu diyaariyo akoonkaaga.</p><button class="btn ghost" data-act="out">Ka bax</button>`);
  screen(`<h1>Dhammaystir akoonkaaga</h1><form id="rcf" class="form"><label>Magacaaga<input name="name" autocomplete="name" required></label><button class="btn">Dhammaystir</button></form><button class="btn ghost" data-act="out">Ka bax</button>`);
}

function gate() {
  if (!U) return;
  clearTimeout(bootT);
  if (!P && missing && !signup.busy) return recover();
  if (!P) return screen(`<p class="mute">Akoonkaaga waa la diyaarinayaa…</p><button class="btn ghost" data-act="out">Ka bax</button>`);
  if (P.role === "pending") return screen(`<h1>Waa la sugayaa</h1><p>Maamulaha sare ayaa akoonkaaga ogolaanaya. Marka la ogolaado, halkan ayaad ka arki doontaa xisaabta.</p><button class="btn ghost" data-act="out">Ka bax</button>`);
  if (!started) { started = true; watch(canOut() ? ["members", "tx", "contacts", "smslog"] : ["members", "tx"], () => render(), () => { flash = "Xogta lama heli karo. Hubi ogolaanshahaaga."; render(true); }); }
  render(true);
}

const getTabs = () => [["home", "Guud", "home"], ...(canIn() ? [["add", "Ku dar", "plus"]] : []), ["feed", "Dhaqdhaqaaq", "act"], ["ev", "Qaaraan", "heart"], ["mem", "Xubnaha", "users"], ["rep", "Warbixin", "doc"]];

function render(force) {
  if (!P || P.role === "pending") return;
  if (!force && document.activeElement?.closest("form,#q")) return;
  const tabs = getTabs();
  if (tab !== "pay" && !tabs.some((t) => t[0] === tab)) tab = "home";
  const view = { home, pay: payView, add: addView, feed, ev: evView, mem: memView, rep: () => reportView(D, rs) }[tab]();
  root.innerHTML = `<header class="top"><div class="in"><div><small>${esc(D.cfg.org)}</small><b>${money(D, bal(D))}</b></div><button class="ico" data-act="out" aria-label="Ka bax">${ic("out")}</button></div></header><main>${flash ? `<div class="note" role="status">${esc(flash)}</div>` : ""}${view}</main><nav class="bar" style="--n:${tabs.length}">${tabs.map(([k, l, i]) => `<button data-tab="${k}" aria-current="${tab === k}">${ic(i)}<span>${l}</span>${k === "mem" && canOut() && late(D) ? '<i class="dot"></i>' : ""}</button>`).join("")}</nav>`;
  // Keep the confirmation visible for a few seconds (a snapshot re-render right after saving used to erase it instantly).
  if (flash) { clearTimeout(flashT); flashT = setTimeout(() => { flash = ""; document.querySelector("main > .note")?.remove(); }, 4000); }
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
  return `<section class="hero"><small>Hadhaagga hadda</small><strong>${money(D, i - e)}</strong><div class="two"><div><small>Soo gashay</small><b>${money(D, i)}</b></div><div><small>Baxay</small><b>${money(D, e)}</b></div></div></section><div class="acts"><span class="chip ok">Doorkaaga: ${esc(ROLES[P.role])}</span></div>${canPay() ? '<button class="btn" data-go="pay" style="margin-top:12px">💳 Bixi lacag (EVC Plus, eDahab…)</button>' : ""}${canOut() && late(D) ? `<button class="alert" data-go="due">⚠ ${unpaid(D).length} xubnood ma bixin lacagtii waqtigeedu dhammaaday</button>` : ""}<div style="height:12px"></div>${mine()}<h2>Dhawaan</h2><div class="card list">${r.map((x) => txRow(D, x)).join("") || '<p class="empty">Weli wax lama diiwaangelin.</p>'}</div>${accountBox()}`;
}

function accountBox() {
  return `<details class="card" style="margin-top:16px"><summary>Akoonkayga</summary><p><b>${esc(P.name || "")}</b><br><small>${P.phone ? "+" + esc(P.phone) : esc(P.email || "")}</small></p><form id="pwf" class="form"><label>Erayga sirta hadda<input name="cur" type="password" autocomplete="current-password" required></label><label>Eray sir ah oo cusub (ugu yaraan 8 xaraf)<input name="nw" type="password" minlength="8" autocomplete="new-password" required></label><button class="btn ghost">Beddel erayga sirta</button></form></details>`;
}

function addView() {
  if (!canOut() && mode === "out") mode = "in";
  if (mode === "wallet" && !canCollect()) mode = "in";
  const list = D.tx.filter((x) => x.type === (mode === "out" ? "out" : "in")).sort(byDate).slice(0, 15);
  const opts = [["in", "Gacan"], ...(canOut() ? [["out", "Kharash"]] : []), ...(canCollect() ? [["wallet", "Wallet"]] : [])];
  const seg = opts.length > 1 ? `<div class="seg" style="grid-template-columns:repeat(${opts.length},1fr)">${opts.map(([k, l]) => `<button data-mode="${k}" aria-pressed="${mode === k}">${l}</button>`).join("")}</div>` : "";
  const body = mode === "wallet" ? payForm("collect") : mode === "in" && !D.members.length ? '<div class="card"><p>Weli xubin lama darin. Weydii lacag-qabaha.</p></div>' : txForm(D, mode);
  return `${seg}${body}<h2>Dhawaan</h2><div class="card list">${list.map((x) => txRow(D, x)).join("") || '<p class="empty">Wax ma jiraan.</p>'}</div>`;
}

function payForm(kind) {
  const evs = [...new Set(D.tx.map((x) => x.ev).filter(Boolean))], me = D.members.find((x) => x.id === P.memberId);
  const due = me && D.cfg.dueAmt > 0 ? Math.max(0, D.cfg.dueAmt - memIn(D, me.id)) : "";
  const who = kind === "collect" ? `<label>Xubinta (lacagta loo qoraayo)<select name="memberId" required>${D.members.map((x) => `<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("")}</select></label>` : "";
  return `<form id="wf" class="card form" data-m="${kind}">${who}<label>Lacagta (${esc(D.cfg.cur)})<input class="amt" name="amount" type="number" step="0.01" min="0.5" inputmode="decimal" value="${kind === "pay" ? due : ""}" required></label><label>${kind === "collect" ? "Taleefanka lacagta laga qaadayo" : "Taleefankaaga wallet-ka"}<input name="phone" type="tel" inputmode="tel" placeholder="61xxxxxxx" autocomplete="tel" required></label><label>Waxa loo bixinayo<select name="purpose"><option value="dues">${DUES}</option><option value="event">Qaaraan / dhacdo</option></select></label><label>Qaaraanka (haddii la dooratay)<input name="ev" list="evl2" placeholder="tus. Qaaraanka Axmed"><datalist id="evl2">${evs.map((p) => `<option value="${esc(p)}">`).join("")}</datalist></label>${D.cfg.pay?.bank ? `<label>Nooca<select name="method"><option value="wallet">Wallet (EVC Plus, eDahab, ZAAD…)</option><option value="bank">Salaam Bank</option></select></label>` : ""}<button class="btn inc"${busy ? " disabled" : ""}>${busy ? "Sug… taleefanka geli PIN-ka" : kind === "pay" ? "Bixi hadda" : "Dir codsiga"}</button><p class="hint">Taleefanka ayaa weydiin doona PIN-ka. Marka la ansixiyo, lacagta si toos ah ayay xisaabta u gashaa.</p></form>`;
}
function payView() {
  if (!canPay()) return '<div class="card"><p>Ogolaansho uma haysatid. Weydii maamulaha.</p></div>';
  return `<button class="btn ghost" data-go="home">← Dib</button><h2>Bixi lacag</h2>${payForm("pay")}`;
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
  const t = canOut();
  const seg = t ? `<div class="seg"><button data-sec="list" aria-pressed="${sec === "list"}">Liiska</button><button data-sec="due" aria-pressed="${sec === "due"}">Xusuusin${late(D) ? " ⚠" : ""}</button></div>` : "";
  return `<h2>Xubnaha iyo qoysaska</h2>${seg}${t && sec === "due" ? dueView() : listView()}`;
}

function listView() {
  const fam = {}, c = D.cfg, tot = (id) => sum("in", D.tx.filter((x) => x.party === id)), fams = [...new Set(D.members.map((m) => m.family).filter(Boolean))];
  D.members.forEach((m) => { const k = m.family || "Aan qoys lahayn"; (fam[k] = fam[k] || []).push(m); });
  const form = canOut() ? `<details class="card" style="margin-bottom:12px"><summary>＋ Ku dar xubin</summary><form id="mf" class="form"><label>Magaca<input name="name" required></label><label>Taleefan (+252…)<input name="tel" type="tel" inputmode="tel"></label><label>Qoyska (isku-darsan)<input name="family" list="fl"><datalist id="fl">${fams.map((x) => `<option value="${esc(x)}">`).join("")}</datalist></label><button class="btn">Ku dar</button></form></details>` : "";
  return `${form}${Object.entries(fam).map(([k, a]) => `<h3>${esc(k)} <span>${a.length} · ${money(D, a.reduce((s, m) => s + tot(m.id), 0))}</span></h3><div class="card list">${a.map((m) => `<div class="it"><div class="av">${esc(initials(m.name))}</div><div class="tx"><b>${esc(m.name)}</b>${c.dueAmt > 0 ? (memIn(D, m.id) >= c.dueAmt ? '<small class="inc">✓ Waa bixiyay</small>' : '<small class="exp">Wuu dhiman yahay</small>') : ""}</div><div class="am inc">${money(D, tot(m.id))}</div></div>`).join("")}</div>`).join("") || '<p class="empty">Weli xubin ma jirto.</p>'}`;
}

function dueView() {
  const c = D.cfg, u = unpaid(D), n = D.members.length, ids = new Set(u.map((x) => x.id)), paid = D.members.filter((x) => !ids.has(x.id));
  const wa = (x) => encodeURIComponent(`Salaan ${x.name}, xusuusin: lacagta ${c.org} (${c.cur}${Math.round((c.dueAmt - memIn(D, x.id)) * 100) / 100}) waxaa kugu waajib ah ${c.dueDate ? "ilaa " + c.dueDate : "hadda"}. Mahadsanid.`);
  const smsN = (id) => (D.smslog || []).filter((s) => s.memberId === id && s.status === "sent").length;
  if (!(c.dueAmt > 0)) return '<div class="card"><p>Maamuluhu wuxuu dejiyaa lacagta iyo taariikhda bogga maamulka.</p></div>';
  return `<div class="card"><b>${money(D, c.dueAmt)}</b> xubin kasta${c.dueDate ? ` · ugu dambeyn ${esc(c.dueDate)}` : ""}<br><small>${n - u.length} bixiyay · ${u.length} ma bixin</small></div><button class="btn ghost" data-act="remind" style="margin-top:12px"${busy ? " disabled" : ""}>✉ Dir SMS xusuusin hadda (kuwa aan bixin)</button>${late(D) ? '<div class="note warn" style="margin-top:12px">⚠ Waqtigii wuu dhammaaday. Wac ama WhatsApp u dir:</div>' : ""}
<h3>Aan bixin <span>${u.length}</span></h3><div class="card list">${u.map((x) => `<div class="it"><div class="av exp">${esc(initials(x.name))}</div><div class="tx"><b>${esc(x.name)}</b><small>${esc(x.family || "")} · la bixiyay ${money(D, memIn(D, x.id))} · SMS ${smsN(x.id)}×</small>${x.tel ? `<div class="acts"><a class="chip" href="tel:${digits(x.tel)}">📞 Wac</a><a class="chip" href="https://wa.me/${digits(x.tel)}?text=${wa(x)}" target="_blank" rel="noopener">WhatsApp</a></div>` : "<small>Taleefan ma jiro</small>"}</div></div>`).join("") || '<p class="empty">Qof walba waa bixiyay ✓</p>'}</div>
<h3>Bixiyay <span>${paid.length}</span></h3><div class="card list">${paid.map((x) => `<div class="it"><div class="av inc">${esc(initials(x.name))}</div><div class="tx"><b>${esc(x.name)}</b><small>${esc(x.family || "")}</small></div><div class="am inc">${money(D, memIn(D, x.id))}</div></div>`).join("") || '<p class="empty">Weli qof ma bixin.</p>'}</div>`;
}

async function remind() {
  busy = true; render(true);
  try { const r = await call("sendReminders"); flash = `SMS: ${r.sent} la diray, ${r.failed} fashilmay, ${r.skipped} la dhaafay.`; }
  catch (e) { flash = e.message || "SMS lama diri karo."; }
  busy = false; render(true);
}

const deny = () => { flash = "Waa la diiday: ogolaansho uma haysatid."; render(true); };
async function share() { try { if (navigator.share) await navigator.share({ title: D.cfg.org, text: shareText(D) }); else window.open("https://wa.me/?text=" + encodeURIComponent(shareText(D)), "_blank", "noopener"); } catch { /* user cancelled */ } }

root.addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab],[data-act],[data-mode],[data-flt],[data-more],[data-ev],[data-back],[data-sec],[data-go]");
  if (!b) return;
  const s = b.dataset;
  if (s.tab) { tab = s.tab; ev = null; render(true); scrollTo(0, 0); }
  else if (s.go) { tab = s.go === "due" ? "mem" : s.go; if (s.go === "due") sec = "due"; render(true); scrollTo(0, 0); }
  else if (s.sec) { sec = s.sec; render(true); }
  else if (s.mode) { mode = s.mode; render(true); }
  else if (s.flt) { flt = s.flt; lim = 30; render(true); }
  else if ("more" in s) { lim += 30; $("#fl").innerHTML = feedRows(); }
  else if (s.ev !== undefined) { ev = s.ev; render(true); scrollTo(0, 0); }
  else if ("back" in s) { ev = null; render(true); }
  else if (s.act === "out") A.signOut(auth);
  else if (s.act === "sw") { authMode = authMode === "in" ? "up" : "in"; authForm(root, authMode === "up", "Bogga Xubnaha"); }
  else if (s.act === "remind") remind();
  else if (s.act === "pr") print();
  else if (s.act === "sh") share();
});

root.addEventListener("input", (e) => { if (e.target.id === "q") { q = e.target.value; lim = 30; $("#fl").innerHTML = feedRows(); } });

root.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target, d = Object.fromEntries(new FormData(f));
  if (f.id === "af") submitAuth(f, authMode === "up");
  else if (f.id === "rcf") {
    saveProfile(U, d.name.trim(), U.email.split("@")[0], U.email).catch(() => alert("Lama kaydin karo. Isku day mar kale."));
  }
  else if (f.id === "tf") {
    const t = f.dataset.t, x = readTx(f, t);
    if ((t === "in" && !canIn()) || (t === "out" && !canOut())) return deny();
    add("tx", { ...x, by: U.uid, byName: P.name, at: F.serverTimestamp() }).catch(deny);
    logit(P, U.uid, "Ku dar", `${t === "in" ? "soo gasha" : "kharash"} ${x.amt}`);
    flash = "Waa la kaydiyay ✓"; render(true); scrollTo(0, 0);
  } else if (f.id === "mf") {
    if (!canOut()) return deny();
    const id = uid();
    set("members", id, { name: d.name.trim(), family: d.family.trim() }).catch(deny);
    if (d.tel.trim()) set("contacts", id, { tel: d.tel.trim() }).catch(deny);
    logit(P, U.uid, "Xubin cusub", d.name.trim());
    flash = "Xubinta waa la daray ✓"; render(true);
  } else if (f.id === "pwf") {
    const cu = auth.currentUser;
    A.reauthenticateWithCredential(cu, A.EmailAuthProvider.credential(cu.email, d.cur)).then(() => A.updatePassword(cu, d.nw))
      .then(() => { flash = "Erayga sirta waa la beddelay ✓"; }).catch(() => { flash = "Erayga sirta hadda jira waa khalad."; }).finally(() => render(true));
  } else if (f.id === "wf") {
    busy = true; render(true);
    call("payRequest", { mode: f.dataset.m, amount: parseFloat(d.amount), phone: d.phone, memberId: d.memberId, purpose: d.purpose, ev: d.ev, method: d.method })
      .then(() => { flash = "Lacagta waa la helay ✓"; }).catch((x) => { flash = x.message || "Lacagta lama dhammaystirin."; })
      .finally(() => { busy = false; render(true); scrollTo(0, 0); });
  } else if (f.id === "rf") { rs = { k: d.k, a: d.a, b: d.b, m: d.m || rs.m }; render(true); }
});
