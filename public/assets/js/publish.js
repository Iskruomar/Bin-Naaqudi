import { sum, byDate, memName } from "./common.js";

// Builds the ONLY data that is ever exposed publicly. Raw entries, phone numbers and per-member totals never leave the private collections.
export function buildSummary(D) {
  const p = D.cfg.pub || {};
  if (!p.on) return { on: false, at: new Date().toISOString() };
  const inc = sum("in", D.tx), exp = sum("out", D.tx), cm = p.campaigns || {};
  const campaigns = Object.entries(cm).filter(([, v]) => v.on).map(([name, v]) => {
    const l = D.tx.filter((x) => x.ev === name);
    return { name, collected: sum("in", l), spent: sum("out", l), target: v.target || 0, donors: new Set(l.filter((x) => x.type === "in").map((x) => x.party)).size };
  });
  const feed = p.showFeed ? [...D.tx].sort(byDate).slice(0, 20).map((x) => ({ date: x.date, type: x.type, cat: x.cat, amt: x.amt, label: p.showNames ? (x.type === "in" ? memName(D, x.party) : x.party) : x.type === "in" ? "Xubin" : x.cat })) : [];
  return { on: true, org: D.cfg.org, cur: D.cfg.cur, at: new Date().toISOString(), note: p.note || "", how: p.how || "", contact: p.contact || "", showBalance: !!p.showBalance, balance: p.showBalance ? inc - exp : null, income: p.showBalance ? inc : null, expense: p.showBalance ? exp : null, members: D.members.length, families: new Set(D.members.map((m) => m.family).filter(Boolean)).size, campaigns, feed };
}
