import { esc, today, money, sum, bal, memName, memIn, REL } from "./common.js";

export const shareText = (D) => `${D.cfg.org}: hadhaagga ${money(D, bal(D))} (soo gashay ${money(D, sum("in", D.tx))}, baxay ${money(D, sum("out", D.tx))}) · ${today()}`;

export function reportView(D, rs) {
  const f = (n) => money(D, n), all = D.tx;
  const a = all.filter((x) => (!rs.a || x.date >= rs.a) && (!rs.b || x.date <= rs.b));
  const i = sum("in", a), e = sum("out", a), ms = D.members;
  const pre = rs.a ? all.filter((x) => x.date < rs.a) : [], open = sum("in", pre) - sum("out", pre);
  const mid = ms.some((m) => m.id === rs.m) ? rs.m : ms[0]?.id;
  const g = (t, k) => { const o = {}; a.filter((x) => x.type === t).forEach((x) => { const n = k(x); o[n] = (o[n] || 0) + x.amt; }); return Object.entries(o).sort((p, q) => q[1] - p[1]); };
  const pr = (l) => l.map(([n, v]) => [esc(n), f(v)]), tot = (l) => l.reduce((s, x) => s + x.amt, 0);
  const fam = (x) => ms.find((m) => m.id === x.party)?.family || "Aan qoys lahayn";
  const T = (ti, hd, rows, ft) => `<table><tr class="h"><td colspan="${hd.length}">${ti}</td></tr><tr class="sb">${hd.map((h) => `<td>${h}</td>`).join("")}</tr>${rows.length ? rows.map((c) => `<tr>${c.map((x) => `<td>${x}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${hd.length}">—</td></tr>`}${ft ? `<tr class="tot">${ft.map((x) => `<td>${x}</td>`).join("")}</tr>` : ""}</table>`;
  let b, ti;
  if (rs.k === "b") {
    const o = {}; a.forEach((x) => { const k = x.date.slice(0, 7); (o[k] = o[k] || [0, 0])[x.type === "in" ? 0 : 1] += x.amt; });
    let run = open; ti = "Socodka Lacagta bil-bil";
    b = T("Soo gashay, baxay iyo hadhaag", ["Bil", "Soo gashay", "Baxay", "Hadhaag"], Object.entries(o).sort().map(([k, [p, q]]) => { run += p - q; return [k, f(p), f(q), f(run)]; }), ["Wadarta", f(i), f(e), f(open + i - e)]);
  } else if (rs.k === "x") {
    const m = ms.find((z) => z.id === mid); ti = "Warbixinta Xubinta";
    if (!m) b = "<p>Xubin ma jiro.</p>";
    else {
      const ins = a.filter((x) => x.type === "in" && x.party === mid).sort((p, q) => p.date.localeCompare(q.date)), os = a.filter((x) => x.type === "out" && x.party === m.name);
      const dt = (r) => r.map((x) => [esc(x.date), esc(x.cat + (x.ev ? " · " + x.ev : "")), f(x.amt)]);
      b = `<p><b>${esc(m.name)}</b>${m.family ? " · qoys: " + esc(m.family) : ""}${m.tel ? " · " + esc(m.tel) : ""}</p>` + T("Lacagta uu bixiyay", ["Taariikh", "Nooca", "Lacag"], dt(ins), ["Wadarta", "", f(tot(ins))]) + T("Gargaarka uu helay", ["Taariikh", "Nooca", "Lacag"], dt(os), ["Wadarta", "", f(tot(os))]) + (D.cfg.dueAmt ? `<p>Lacagta xubinnimada xilligan: ${f(memIn(D, mid))} / ${f(D.cfg.dueAmt)} · ${memIn(D, mid) >= D.cfg.dueAmt ? "waa bixiyay" : "wuu dhiman yahay " + f(D.cfg.dueAmt - memIn(D, mid))}</p>` : "");
    }
  } else if (rs.k === "d") {
    const o = {}; a.forEach((x) => { const k = x.ev || "Aan dhacdo lahayn"; (o[k] = o[k] || [0, 0])[x.type === "in" ? 0 : 1] += x.amt; }); ti = "Qaaraan & Dhacdooyin";
    b = T("Dhacdo kasta", ["Dhacdo", "Soo gashay", "Baxay", "Hadhaag"], Object.entries(o).sort((p, q) => q[1][0] - p[1][0]).map(([k, [p, q]]) => [esc(k), f(p), f(q), f(p - q)]), ["Wadarta", f(i), f(e), f(i - e)]);
  } else if (rs.k === "h") {
    const o = {}; a.filter((x) => x.type === "out").forEach((x) => { const z = (o[x.party] = o[x.party] || { n: 0, v: 0, r: "" }); z.n++; z.v += x.amt; z.r = x.rel || z.r; }); ti = "Gargaarka La Siiyay";
    b = T("Cidda lacagta loo bixiyay", ["Cidda", "Xiriirka", "Tirada", "Wadarta"], Object.entries(o).sort((p, q) => q[1].v - p[1].v).map(([k, z]) => [esc(k), esc(z.r || "—"), z.n, f(z.v)]), ["Wadarta", "", "", f(e)]) + T("Nooc ahaan", ["Nooca", "Lacag"], pr(g("out", (x) => x.cat)));
  } else if (rs.k === "q") {
    const o = {}; ms.forEach((m) => { const k = m.family || "Aan qoys lahayn", z = (o[k] = o[k] || { n: 0, p: 0, h: 0 }); z.n++; z.p += tot(a.filter((x) => x.type === "in" && x.party === m.id)); z.h += tot(a.filter((x) => x.type === "out" && x.party === m.name)); }); ti = "Warbixinta Qoysaska";
    b = T("Qoys kasta", ["Qoys", "Xubno", "Bixiyay", "Helay"], Object.entries(o).sort((p, q) => q[1].p - p[1].p).map(([k, z]) => [esc(k), z.n, f(z.p), f(z.h)]));
  } else {
    ti = "Dakhliga & Kharashka";
    b = T("A. Dakhliga", ["Nooca", "Lacag"], pr(g("in", (x) => x.cat)), ["Wadarta A", f(i)]) + T("B. Kharashyada", ["Nooca", "Lacag"], pr(g("out", (x) => x.cat)), ["Wadarta B", f(e)])
      + T("C. Natiijada", ["Qodobka", "Lacag"], [["Dakhliga (A)", f(i)], ["Kharashka (B)", f(e)]], [i - e >= 0 ? "Dheeraad (A − B)" : "Hoos u dhac (A − B)", f(i - e)])
      + T("D. Lacagta qoys kasta", ["Qoys", "Lacag"], pr(g("in", fam))) + T("E. Lacagta xubin kasta", ["Xubin", "Lacag"], pr(g("in", (x) => memName(D, x.party)))) + T("F. Cidda kharashka loo bixiyay", ["Cidda", "Lacag"], pr(g("out", (x) => x.party)))
      + T("G. Hadhaagga", ["Qodobka", "Lacag"], [["Hadhaagga bilowga", f(open)], ["Natiijada xilliga", f(i - e)]], ["Hadhaagga dhamaadka", f(open + i - e)]);
  }
  const kinds = [["g", "Dakhliga & Kharashka"], ["b", "Socodka lacagta bil-bil"], ["x", "Warbixinta xubin"], ["d", "Qaaraan & dhacdooyin"], ["h", "Gargaarka la siiyay"], ["q", "Qoysaska"]];
  return `<div class="noprint"><h2>Warbixinaha</h2><form id="rf" class="card form"><label>Nooca warbixinta<select name="k">${kinds.map(([v, l]) => `<option value="${v}"${rs.k === v ? " selected" : ""}>${l}</option>`).join("")}</select></label>${rs.k === "x" ? `<label>Xubinta<select name="m">${ms.map((m) => `<option value="${esc(m.id)}"${m.id === mid ? " selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label>` : ""}<div class="two"><label>Laga bilaabo<input type="date" name="a" value="${esc(rs.a)}"></label><label>Ilaa<input type="date" name="b" value="${esc(rs.b)}"></label></div><button class="btn">Muuji</button><div class="two"><button type="button" class="btn ghost" data-act="pr">Daabac / PDF</button><button type="button" class="btn ghost" data-act="sh">La wadaag</button></div></form></div>
<div class="stmt"><h1>${esc(D.cfg.org)}</h1><div class="sub">${ti} · ${rs.a || rs.b ? (esc(rs.a) || "…") + " ilaa " + (esc(rs.b) || "maanta") : "Wakhti kasta"}<br>La diyaariyay: ${today()}</div>${b}<div class="sig"><div>Xisaabiyaha</div><div>Guddoomiyaha</div></div></div>`;
}
