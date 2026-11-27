import { auth, A, db, F, call } from "./firebase.js";
import { $, esc, money, sum, bal, byDate, txForm, readTx, txRow, ic, ROLES, late, unpaid, initials, uid, normPhone, phoneEmail } from "./common.js";
import { D, watch, stop, set, del, logit } from "./data.js";
import { buildSummary } from "./publish.js";

const root = $("#app");
let flashT = 0;
let U = null, P = null, tab = "act", eid = null, mid = null, pend = null, secState = null, flash = "", unsub = null, started = false;

let bootT = null;
A.onAuthStateChanged(auth, (u) => {
  unsub?.(); stop(); started = false; U = u; P = null; clearTimeout(bootT);
  if (!u) return login();
  screen(`<p class="mute" style="text-align:center">Waa la furayaa…</p>`);
  bootT = setTimeout(() => { if (!P) screen(`<h1>Lama xiriiri karo</h1><p>Hubi internetka ama ogolaanshahaaga, kadibna dib u day.</p><button class="btn" onclick="location.reload()">Dib u day</button><button class="btn ghost" data-act="out">Ka bax</button>`); }, 12000);
  unsub = F.onSnapshot(F.doc(db, "users", u.uid), (s) => { P = s.exists() ? s.data() : null; gate(); }, () => { P = null; gate(); });
});

function screen(html) { root.innerHTML = `<div class="center"><div class="card auth"><div class="logo">${ic("safe")}</div>${html}</div></div>`; }
function login() {
  screen(`<h1>Maamulka sare</h1><form id="af" class="form"><label>Email ama taleefan<input name="email" autocomplete="username" required></label><label>Erayga sirta<input name="pw" type="password" autocomplete="current-password" required></label><p class="err" id="ae" role="alert"></p><button class="btn">Gal</button></form>`);
}
function gate() {
  if (!U) return;
  clearTimeout(bootT);
  if (!P || P.role !== "admin") return screen(`<h1>Ogolaansho ma jirto</h1><p>Bogga maamulka waxaa gali kara maamulaha sare oo keliya.</p><button class="btn ghost" data-act="out">Ka bax</button>`);
  if (!started) { started = true; watch(["members", "tx", "users", "log", "contacts", "payments", "smslog"], () => render(), () => { flash = "Xogta lama heli karo."; render(true); }); }
  render(true);
}

function render(force) {
  if (!P || P.role !== "admin") return;
  if (!force && document.activeElement?.closest("form,select")) return;
  const tabs = [["act", "Hawlaha", "act"], ["mem", "Xubnaha", "users"], ["usr", "Dadka", "users"], ["cfg", "Dejin", "cfg"], ["pub", "Dadweyne", "heart"], ["pay", "Lacag", "wallet"], ["bk", "Kaydin", "safe"]];
  const pending = D.users.filter((u) => u.role === "pending").length;
  const view = { act, mem: memv, usr, cfg, pub: pubv, pay: payv, bk }[tab]();
  root.innerHTML = `<header class="top"><div class="in"><div><small>Maamul · ${esc(D.cfg.org)}</small><b>${money(D, bal(D))}</b></div><button class="ico" data-act="out" aria-label="Ka bax">${ic("out")}</button></div></header><main>${flash ? `<div class="note" role="status">${esc(flash)}</div>` : ""}${view}</main><nav class="bar" style="--n:7">${tabs.map(([k, l, i]) => `<button data-tab="${k}" aria-current="${tab === k}">${ic(i)}<span>${l}</span>${k === "usr" && pending ? '<i class="dot"></i>' : ""}</button>`).join("")}</nav>`;
  // Keep the confirmation visible for a few seconds (a snapshot re-render right after saving used to erase it instantly).
  if (flash) { clearTimeout(flashT); flashT = setTimeout(() => { flash = ""; document.querySelector("main > .note")?.remove(); }, 4000); }
}

function act() {
  const e = eid && D.tx.find((x) => x.id === eid);
  const form = e ? `<h2>Sixid</h2>${txForm(D, e.type, e)}<button class="btn ghost" data-act="cancel">Jooji</button>` : "";
  const rows = [...D.tx].sort(byDate).map((x) => txRow(D, x, `<div class="acts"><button class="chip" data-ed="${esc(x.id)}">Sixid</button><button class="chip ${pend === x.id ? "danger" : ""}" data-del="${esc(x.id)}">${pend === x.id ? "Hubi: tirtir" : "Tirtir"}</button></div>`)).join("");
  return `${e ? "" : overview()}${form}<h2>Dhaqdhaqaaqa oo dhan (${D.tx.length})</h2><div class="card list">${rows || '<p class="empty">Weli wax ma jiraan.</p>'}</div>`;
}

function usr() {
  const us = [...D.users].sort((a, b) => (a.role === "pending" ? -1 : 0) - (b.role === "pending" ? -1 : 0) || (a.name || "").localeCompare(b.name || ""));
  return `<h2>Dadka iyo doorarka</h2><div class="card list">${us.map((u) => `<div class="it"><div class="tx"><b>${esc(u.name)}</b><small>${esc(u.phone ? "+" + u.phone : u.email || "")}</small></div><div class="sel"><select data-role="${esc(u.id)}" aria-label="Door" ${u.id === U.uid ? "disabled" : ""}>${Object.entries(ROLES).map(([k, l]) => `<option value="${k}"${u.role === k ? " selected" : ""}>${l}</option>`).join("")}</select><select data-link="${esc(u.id)}" aria-label="Xubinta la xiriirta"><option value="">— xubin la xiriirin —</option>${D.members.map((m) => `<option value="${esc(m.id)}"${u.memberId === m.id ? " selected" : ""}>${esc(m.name)}</option>`).join("")}</select>${permBox(u)}</div></div>`).join("") || '<p class="empty">Weli qof ma diiwaangelin.</p>'}</div><p class="hint">Qof walba ku xiri xubintiisa, si uu bogga xubnaha ugu arko xisaabtiisa. Lacag-qabte: soo gasha, kharash iyo xubno. Ku-darra: soo gasha keliya. Daawade: arag keliya. Sixid iyo tirtir waa maamulaha sare keliya.</p>${resetForm()}`;
}

function cfg() {
  const c = D.cfg;
  return `<h2>Dejinta</h2><form id="sf" class="card form"><label>Magaca iskaashatada<input name="org" value="${esc(c.org)}" required></label><label>Lacagta (calaamad)<input name="cur" value="${esc(c.cur)}" maxlength="5"></label><label>Lacagta la rabo xubin kasta<input name="dueAmt" type="number" min="0" step="0.01" inputmode="decimal" value="${c.dueAmt}"></label><label>Xilliga bilaabmay<input name="pStart" type="date" value="${esc(c.pStart)}"></label><label>Ugu dambeyn bixinta<input name="dueDate" type="date" value="${esc(c.dueDate)}"></label><button class="btn">Kaydi dejinta</button></form>`;
}

function pubv() {
  const p = D.cfg.pub || {}, cm = p.campaigns || {}, evs = [...new Set(D.tx.map((x) => x.ev).filter(Boolean))];
  const ck = (n, l, v) => `<label class="ck"><input type="checkbox" name="${n}"${v ? " checked" : ""}> ${l}</label>`;
  return `<h2>Bogga dadweynaha</h2><p class="hint">Bog furan oo aan login u baahnayn (<b>/dadweyne/</b>). Wuxuu muujiyaa kaliya waxa aad halkan doorato; taleefannada iyo lacagta qof kasta lama daabaco.</p><form id="pf" class="card form">${ck("on", "Daabac bogga dadweynaha", p.on ?? true)}${ck("showBalance", "Muuji hadhaagga iyo wadarta", p.showBalance)}${ck("showFeed", "Muuji dhaqdhaqaaqii u dambeeyay", p.showFeed)}${ck("showNames", "Muuji magacyada (haddii la damiyo: “Xubin” keliya)", p.showNames)}<label>Fariin guud<textarea name="note" rows="3">${esc(p.note || "")}</textarea></label><label>Sida loo gacan geysto<textarea name="how" rows="3" placeholder="tus. EVC Plus 061xxxxxxx — magaca">${esc(p.how || "")}</textarea></label><label>Xiriirka (taleefan)<input name="contact" type="tel" value="${esc(p.contact || "")}"></label><h3>Qaaraan la muujinayo</h3>${evs.map((n, i) => `<div class="card">${ck("o" + i, esc(n), cm[n]?.on)}<label>Hadaf (ikhtiyaari)<input name="g${i}" type="number" min="0" step="0.01" inputmode="decimal" value="${cm[n]?.target || ""}"></label></div>`).join("") || '<p class="hint">Marka aad lacag ku darto “Dhacdo/ujeeddo”, halkan ayay ka soo muuqataa.</p>'}<button class="btn">Kaydi & cusboonaysii bogga</button></form><p class="hint">Bogga dadweynaha wuxuu muujiyaa xogta marka ugu dambeysay ee aad riixday badhanka kor ku xusan.</p>`;
}

function overview() {
  const np = D.users.filter((u) => u.role === "pending").length, lt = late(D) ? unpaid(D).length : 0;
  return `<div class="two"><div class="card"><small>Xubnaha</small><b class="big">${D.members.length}</b></div><div class="card"><small>Dhaqdhaqaaqa</small><b class="big">${D.tx.length}</b></div></div>${np ? `<button class="alert" data-tab="usr">⚠ ${np} akoon ayaa sugaya ogolaansho</button>` : ""}${!D.cfg.pub?.on ? '<button class="alert" data-tab="pub">ℹ Bogga dadweynaha weli lama daabicin — riix si aad u daabacdo</button>' : ""}${lt ? `<button class="alert" data-tab="mem">⚠ ${lt} xubnood ma bixin lacagtii waqtigeedu dhammaaday</button>` : ""}`;
}

function memv() {
  const e = (mid && D.members.find((m) => m.id === mid)) || {}, fams = [...new Set(D.members.map((m) => m.family).filter(Boolean))];
  const tot = (id) => sum("in", D.tx.filter((x) => x.party === id));
  const list = [...D.members].sort((x, y) => (x.name || "").localeCompare(y.name || "")).map((m) => `<div class="it"><div class="av">${esc(initials(m.name))}</div><div class="tx"><b>${esc(m.name)}</b><small>${esc(m.family || "Aan qoys lahayn")} · ${esc(m.tel || "")}</small><div class="acts"><button class="chip" data-edm="${esc(m.id)}">Sixid</button><button class="chip ${pend === m.id ? "danger" : ""}" data-delm="${esc(m.id)}">${pend === m.id ? "Hubi: tirtir" : "Tirtir"}</button></div></div><div class="am inc">${money(D, tot(m.id))}</div></div>`).join("");
  return `<h2>${e.id ? "Sixid xubin" : "Ku dar xubin"}</h2><form id="mf" class="card form"><label>Magaca<input name="name" value="${esc(e.name || "")}" required></label><label>Taleefan (+252…)<input name="tel" type="tel" inputmode="tel" value="${esc(e.tel || "")}"></label><label>Qoyska (isku-darsan)<input name="family" list="fl" value="${esc(e.family || "")}"><datalist id="fl">${fams.map((x) => `<option value="${esc(x)}">`).join("")}</datalist></label><button class="btn">${e.id ? "Kaydi isbeddelka" : "Ku dar"}</button>${e.id ? '<button type="button" class="btn ghost" data-act="cancel">Jooji</button>' : ""}</form><h2>Xubnaha (${D.members.length})</h2><div class="card list">${list || '<p class="empty">Weli xubin ma jirto.</p>'}</div>`;
}

function csv() {
  const q = (v) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  const nm = (x) => (x.type === "in" ? D.members.find((m) => m.id === x.party)?.name || (x.party === "public" ? x.donor || "Deeq dadweyne" : "") : x.party);
  const rows = [["Taariikh", "Nooc", "Cidda", "Qaybta", "Dhacdo", "Xiriir", "Lacag", "Faahfaahin"], ...[...D.tx].sort(byDate).map((x) => [x.date, x.type === "in" ? "Soo gasha" : "Kharash", nm(x), x.cat, x.ev, x.rel, x.amt, x.note])];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.map((r) => r.map(q).join(",")).join("\n")], { type: "text/csv" }));
  a.download = `dhaqdhaqaaq-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
}

const permBox = (u) => (u.role === "viewer" || u.role === "adder"
  ? `<label class="ck sm"><input type="checkbox" data-perm="collect" data-u="${esc(u.id)}"${u.perms?.collect ? " checked" : ""}> Qaado lacag</label><label class="ck sm"><input type="checkbox" data-perm="pay" data-u="${esc(u.id)}"${u.perms?.pay ? " checked" : ""}> Bixi lacag</label>`
  : u.role === "pending" ? '<small class="mute">Weli lama ogolaan</small>' : '<small class="mute">Ogolaansho buuxa</small>');

const resetForm = () => `<h3>Dib u deji erayga sirta</h3><form id="rp" class="card form"><label>Qofka<select name="uid">${D.users.map((u) => `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join("")}</select></label><label>Eray sir ah oo cusub (ugu yaraan 8 xaraf)<input name="pw" type="password" minlength="8" autocomplete="new-password" required></label><button class="btn">Deji erayga sirta</button></form><p class="hint">Waxay u baahan tahay Cloud Functions la shido. Marka aad dejiso, u sheeg qofka inuu beddelo erayga sirta gudaha app-ka (Akoonkayga).</p>`;

function loadSec() { call("secretsStatus").then((r) => { secState = r; render(true); }).catch(() => { secState = {}; render(true); }); }
async function remind() {
  flash = "Waa la dirayaa…"; render(true);
  try { const r = await call("sendReminders"); flash = `SMS: ${r.sent} la diray, ${r.failed} fashilmay, ${r.skipped} la dhaafay.`; } catch (e) { flash = e.message || "SMS lama diri karo."; }
  render(true);
}

const PST = { paid: "la bixiyay ✓", failed: "fashilmay", pending: "sugaya", unknown: "lama hubo ⚠", paid_unrecorded: "la helay, lama diiwaangelin ⚠" };
function payv() {
  const c = D.cfg, pay = c.pay || {}, sm = c.sms || {}, st = secState || {};
  const ck = (n, l, v) => `<label class="ck"><input type="checkbox" name="${n}"${v ? " checked" : ""}> ${l}</label>`;
  const badge = (ok, l) => `<span class="chip ${ok ? "ok" : "bad"}">${ok ? "✓" : "✗"} ${l}</span>`;
  const ms = (x) => x.at?.toMillis?.() || 0;
  const pays = [...D.payments].sort((x, y) => ms(y) - ms(x)).slice(0, 15), sms = [...D.smslog].sort((x, y) => ms(y) - ms(x)).slice(0, 15);
  return `<h2>Lacag-bixinta</h2><div class="acts">${badge(st.waafi?.set, "WaafiPay")}${badge(st.sms?.set, "SMS")}${badge(pay.on, "La shiday")}</div>
<p class="hint">Furayaasha waa la kaydiyaa server-ka oo keliya; marnaba lama soo celiyo browser-ka. Fur WaafiPay (EVC Plus, eDahab, ZAAD, Sahal, Salaam Bank). Premier Wallet iyo akoonno kale: ku qor “Akoonno gacanta”.</p>
<h3>1. Xiriirka WaafiPay</h3><form id="wfm" class="card form"><label>Merchant UID<input name="merchantUid" autocomplete="off"></label><label>API User ID<input name="apiUserId" autocomplete="off"></label><label>API Key<input name="apiKey" type="password" autocomplete="off" placeholder="${st.waafi?.set ? "•••• la kaydiyay (ka tag haddii aadan beddelayn)" : ""}"></label><label>Deegaan<select name="env"><option value="sandbox">Tijaabo (sandbox)</option><option value="production"${st.waafi?.env === "production" ? " selected" : ""}>Dhabta (production)</option></select></label><label>Endpoint (ikhtiyaari, https)<input name="endpoint" placeholder="https://…/asm"></label><button class="btn">Kaydi xiriirka</button></form>
<h3>2. Dejinta lacag-bixinta</h3><form id="pset" class="card form">${ck("on", "Shid lacag-bixinta (xubnaha)", pay.on)}${ck("public", "Ogolow dadweynaha inay gacan geystaan", pay.public)}${ck("bank", "Ogolow Salaam Bank (bank account)", pay.bank)}<div class="two"><label>Ugu yaraan<input name="min" type="number" step="0.01" min="0.5" value="${pay.min || 1}"></label><label>Ugu badnaan (dadweyne)<input name="maxPublic" type="number" step="0.01" value="${pay.maxPublic || 500}"></label></div><label>Lacagta (code)<input name="currency" value="${esc(pay.currency || "USD")}" maxlength="3"></label><label>Akoonno gacanta (Premier Wallet, bank…)<textarea name="manual" rows="3">${esc(pay.manual || "")}</textarea></label><button class="btn">Kaydi dejinta</button></form>
<h3>3. SMS xusuusin (otomaatig)</h3><form id="smsf" class="card form">${ck("on", "Shid SMS-ka otomaatiga ah", sm.on)}<label>Adeeg bixiye<select name="provider"><option value="twilio">Twilio</option><option value="http"${st.sms?.provider === "http" ? " selected" : ""}>HTTP gateway (Hormuud, SMS.to…)</option></select></label><label>Twilio SID<input name="sid" autocomplete="off"></label><label>Twilio Token<input name="token" type="password" autocomplete="off"></label><label>Sender (magac ≤11 xaraf ama lambar)<input name="from" value="${esc(sm.sender || "")}" maxlength="15"></label><label>HTTP URL (https)<input name="url" placeholder="https://api.sms.to/sms/send"></label><label>HTTP headers (JSON)<input name="headers" placeholder='{"Authorization":"Bearer KEY","Content-Type":"application/json"}'></label><label>HTTP body (JSON, {{to}} {{message}} {{sender}})<input name="body" placeholder='{"to":"{{to}}","message":"{{message}}","sender_id":"{{sender}}"}'></label><label>Maalmaha xusuusinta (tus. 3,0,-3,-7)<input name="days" value="${esc((sm.remindDays || [3, 0, -3, -7]).join(","))}"></label><label>Qoraalka ({name} {amount} {due} {org})<textarea name="template" rows="3">${esc(sm.template || "")}</textarea></label><button class="btn">Kaydi SMS</button></form>
<button class="btn ghost" data-act="remind" style="margin-top:12px">✉ Dir xusuusin hadda</button>
<h3>Lacag-bixinnadii u dambeeyay</h3><div class="card list">${pays.map((p) => `<div class="it"><div class="tx"><b>${money(D, p.amount)} · ${esc(PST[p.status] || p.status)}</b><small>${esc(p.phone || "")} ${esc(p.ev || "")} ${esc(p.msg || "")}</small>${p.status === "unknown" || p.status === "paid_unrecorded" ? `<small class="exp">Hubi WaafiPay: haddii lacagta la helay, diiwaangeli.</small><div class="acts"><button class="chip ok" data-pact="record" data-pref="${esc(p.id)}">Diiwaangeli (la helay)</button><button class="chip danger" data-pact="dismiss" data-pref="${esc(p.id)}">Ma helin</button></div>` : ""}</div></div>`).join("") || '<p class="empty">Madhan.</p>'}</div>
<h3>SMS-kii u dambeeyay</h3><div class="card list">${sms.map((s) => `<div class="it"><div class="tx"><b>${esc(s.name)} · ${esc(s.status)}</b><small>${esc(s.phone || "")} · ${esc(s.day || "")} · ${esc(s.kind || "")}</small></div></div>`).join("") || '<p class="empty">Madhan.</p>'}</div>`;
}

function bk() {
  const lg = [...D.log].map((x) => ({ ...x, ts: x.t?.toDate?.().toISOString().slice(0, 16).replace("T", " ") || "" })).sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 40);
  return `<h2>Backup</h2><div class="card form"><button class="btn" data-act="bk">⬇ Soo deji backup (JSON)</button><button class="btn ghost" data-act="csv">⬇ Soo deji Excel (CSV)</button><label class="btn ghost">⬆ Soo celi backup<input type="file" id="rs" accept=".json" hidden></label></div><p class="hint">Soo celintu waxay dib u qortaa xubnaha iyo dhaqdhaqaaqa leh isla aqoonsiga. Hubi backup-ka hore ka hor intaadan soo celin.</p><h2>Diiwaanka isbeddellada</h2><div class="card list">${lg.map((x) => `<div class="it"><div class="tx"><b>${esc(x.a)}</b><small>${esc(x.u)} · ${esc(x.ts)} · ${esc(x.d)}</small></div></div>`).join("") || '<p class="empty">Madhan.</p>'}</div>`;
}

function backup() {
  const o = { v: 1, at: new Date().toISOString(), cfg: D.cfg, members: D.members.map(({ tel, ...r }) => r), contacts: Object.fromEntries(D.members.filter((m) => m.tel).map((m) => [m.id, { tel: m.tel }])), tx: D.tx.map(({ at, ...r }) => r) };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(o, null, 1)], { type: "application/json" }));
  a.download = `backup-${o.at.slice(0, 10)}.json`; a.click();
}

async function restore(file) {
  const o = JSON.parse(await file.text());
  if (!Array.isArray(o.tx) || !Array.isArray(o.members)) throw new Error("bad");
  if (![...o.tx, ...o.members].every((x) => x && typeof x.id === "string" && x.id)) throw new Error("bad");
  const items = [...o.members.map(({ tel, ...m }) => ["members", m]), ...Object.entries(o.contacts || {}).map(([id, v]) => ["contacts", { id, ...v }]), ...o.tx.map((x) => ["tx", x])];
  for (let i = 0; i < items.length; i += 400) {
    const b = F.writeBatch(db);
    items.slice(i, i + 400).forEach(([c, { id, ...r }]) => b.set(F.doc(db, c, id), r));
    await b.commit();
  }
  if (o.cfg) await set("settings", "main", o.cfg);
}

const deny = () => { flash = "Waa la diiday."; render(true); };
// Expenses store the recipient as a name, so renaming a member must rename it on their past entries too (otherwise reports lose the link).
async function renameParty(from, to) {
  const l = D.tx.filter((x) => x.type === "out" && x.party === from);
  for (let i = 0; i < l.length; i += 400) { const b = F.writeBatch(db); l.slice(i, i + 400).forEach((x) => b.update(F.doc(db, "tx", x.id), { party: to })); await b.commit(); }
}

root.addEventListener("click", (e) => {
  const b = e.target.closest("[data-tab],[data-act],[data-ed],[data-del],[data-edm],[data-delm],[data-pact]");
  if (!b) return;
  const s = b.dataset;
  if (s.tab) { tab = s.tab; eid = null; mid = null; pend = null; render(true); scrollTo(0, 0); if (tab === "pay" && !secState) loadSec(); }
  else if (s.ed) { eid = s.ed; render(true); scrollTo(0, 0); }
  else if (s.del) {
    if (pend === s.del) { const x = D.tx.find((t) => t.id === pend); logit(P, U.uid, "Tirtir", `${x?.type} ${x?.amt} · ${x?.cat} · ${x?.date} · ${x?.type === "in" ? D.members.find((m) => m.id === x?.party)?.name : x?.party}`); del("tx", pend).catch(deny); pend = null; flash = "Waa la tirtiray."; }
    else pend = s.del;
    render(true);
  } else if (s.act === "out") A.signOut(auth);
  else if (s.act === "cancel") { eid = null; mid = null; render(true); }
  else if (s.edm) { mid = s.edm; render(true); scrollTo(0, 0); }
  else if (s.delm) {
    if (pend === s.delm) {
      if (D.tx.some((x) => x.type === "in" && x.party === pend)) flash = "Xubintan lacag bay leedahay, lama tirtiri karo.";
      else { logit(P, U.uid, "Tirtir xubin", D.members.find((m) => m.id === pend)?.name || pend); del("members", pend).catch(deny); del("contacts", pend).catch(() => {}); flash = "Xubinta waa la tirtiray."; }
      pend = null;
    } else pend = s.delm;
    render(true);
  }
  else if (s.pact) { call("resolvePayment", { ref: s.pref, action: s.pact }).then(() => { flash = "Lacag-bixinta waa la xalliyay ✓"; }).catch((x) => { flash = x.message || "Waa la diiday."; }).finally(() => render(true)); }
  else if (s.act === "bk") backup();
  else if (s.act === "csv") csv();
  else if (s.act === "remind") remind();
});

root.addEventListener("change", async (e) => {
  const t = e.target;
  if (t.dataset.role) { set("users", t.dataset.role, { role: t.value }, true).catch(deny); logit(P, U.uid, "Door", `${t.dataset.role}: ${t.value}`); flash = "Doorka waa la beddelay ✓"; render(true); }
  else if (t.dataset.perm) { set("users", t.dataset.u, { perms: { [t.dataset.perm]: t.checked } }, true).catch(deny); logit(P, U.uid, "Ogolaansho", `${t.dataset.u}: ${t.dataset.perm}=${t.checked}`); flash = "Ogolaanshaha waa la beddelay ✓"; render(true); }
  else if (t.dataset.link) { set("users", t.dataset.link, { memberId: t.value }, true).catch(deny); logit(P, U.uid, "Xiriir xubin", t.dataset.link); flash = "Xubinta waa la xiriiriyay ✓"; render(true); }
  else if (t.id === "rs" && t.files[0]) {
    if (!confirm("Soo celintu waxay dib u qortaa xubnaha, dhaqdhaqaaqa iyo dejinta oo leh isla aqoonsiga. Ma hubtaa inaad rabto inaad sii wadato?")) { t.value = ""; return; }
    try { await restore(t.files[0]); logit(P, U.uid, "Soo celin", "backup"); flash = "Backup waa la soo celiyay ✓"; } catch { flash = "Soo celintu way fashilantay: faylka ma saxna ama ogolaansho kuma filna."; }
    t.value = "";
    render(true);
  }
});

root.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, d = Object.fromEntries(new FormData(f));
  if (f.id === "af") {
    $("#ae").textContent = "";
    const id = d.email.includes("@") ? d.email.trim() : phoneEmail(normPhone(d.email) || "x");
    try { await A.signInWithEmailAndPassword(auth, id, d.pw); } catch { $("#ae").textContent = "Email/taleefanka ama erayga sirta waa khalad."; }
  } else if (f.id === "tf") {
    const x = readTx(f, f.dataset.t);
    const old = D.tx.find((t) => t.id === eid); set("tx", eid, x, true).catch(deny); logit(P, U.uid, "Sixid", `${x.type} ${old?.amt}→${x.amt} · ${x.cat} · ${x.date}`);
    eid = null; flash = "Waa la sixay ✓"; render(true);
  } else if (f.id === "rp") {
    call("resetPassword", { uid: d.uid, password: d.pw }).then(() => { flash = "Erayga sirta waa la dejiyay ✓"; }).catch((x) => { flash = x.message || "Waa la diiday (Functions ma shidmin?)."; }).finally(() => render(true));
  } else if (f.id === "wfm") {
    call("saveSecrets", { name: "waafi", data: { merchantUid: d.merchantUid, apiUserId: d.apiUserId, apiKey: d.apiKey, env: d.env, endpoint: d.endpoint } })
      .then(() => { flash = "Furayaasha WaafiPay waa la kaydiyay ✓"; loadSec(); }).catch((x) => { flash = x.message || "Waa la diiday."; render(true); });
  } else if (f.id === "pset") {
    const pay = { on: d.on === "on", public: d.public === "on", bank: d.bank === "on", min: parseFloat(d.min) || 1, maxPublic: parseFloat(d.maxPublic) || 500, currency: (d.currency || "USD").toUpperCase(), manual: d.manual.trim() };
    D.cfg = { ...D.cfg, pay }; set("settings", "main", { pay }, true).catch(deny);
    if (D.cfg.pub?.on) set("pub", "summary", buildSummary(D)).catch(deny); // keep the public page in step
    logit(P, U.uid, "Lacag-bixin", pay.on ? "la shiday" : "la damiyay"); flash = "Dejinta waa la kaydiyay ✓"; render(true);
  } else if (f.id === "smsf") {
    const sms = { on: d.on === "on", remindDays: (() => { const r = d.days.split(",").map((x) => parseInt(x, 10)).filter(Number.isFinite); return r.length ? r : [3, 0, -3, -7]; })(), template: d.template.trim(), sender: d.from.trim() };
    D.cfg = { ...D.cfg, sms }; set("settings", "main", { sms }, true).catch(deny);
    call("saveSecrets", { name: "sms", data: { provider: d.provider, sid: d.sid, token: d.token, from: d.from, url: d.url, headers: d.headers, body: d.body } })
      .then(() => { flash = "SMS waa la kaydiyay ✓"; loadSec(); }).catch((x) => { flash = x.message || "Waa la diiday."; render(true); });
  } else if (f.id === "mf") {
    const m = { name: d.name.trim(), family: d.family.trim() }, tel = d.tel.trim();
    if (mid) { const old = D.members.find((x) => x.id === mid); set("members", mid, m, true).catch(deny); set("contacts", mid, { tel }).catch(deny); if (old && old.name !== m.name) renameParty(old.name, m.name).catch(deny); logit(P, U.uid, "Sixid xubin", m.name); mid = null; flash = "Xubinta waa la sixay ✓"; }
    else { const id = uid(); set("members", id, m).catch(deny); set("contacts", id, { tel }).catch(deny); logit(P, U.uid, "Xubin cusub", m.name); flash = "Xubinta waa la daray ✓"; }
    render(true);
  } else if (f.id === "pf") {
    const evs = [...new Set(D.tx.map((x) => x.ev).filter(Boolean))], campaigns = {};
    evs.forEach((n, i) => { campaigns[n] = { on: d["o" + i] === "on", target: parseFloat(d["g" + i]) || 0 }; });
    const pub = { on: d.on === "on", showBalance: d.showBalance === "on", showFeed: d.showFeed === "on", showNames: d.showNames === "on", note: d.note.trim(), how: d.how.trim(), contact: d.contact.trim(), campaigns };
    D.cfg = { ...D.cfg, pub };
    set("settings", "main", { pub }, true).catch(deny);
    set("pub", "summary", buildSummary(D)).catch(deny);
    logit(P, U.uid, "Bogga dadweynaha", pub.on ? "la daabacay" : "la qariyay"); flash = pub.on ? "Bogga dadweynaha waa la cusboonaysiiyay ✓" : "Bogga dadweynaha waa la qariyay."; render(true);
  } else if (f.id === "sf") {
    set("settings", "main", { org: d.org.trim() || "ISKAASHATADA BIN NAAKHUDI", cur: d.cur.trim() || "$", dueAmt: parseFloat(d.dueAmt) || 0, pStart: d.pStart, dueDate: d.dueDate }, true).catch(deny);
    logit(P, U.uid, "Dejin", "la beddelay"); flash = "Waa la kaydiyay ✓" + (parseFloat(d.dueAmt) > 0 && !d.dueDate ? " · ⚠ Deji taariikhda ugu dambeysa si SMS-ka otomaatigu u shaqeeyo." : ""); render(true);
  }
});
