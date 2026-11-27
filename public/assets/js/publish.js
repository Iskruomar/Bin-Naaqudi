import { sum, byDate, memName } from "./common.js";

// Recipients of aid (expense parties) are never published: expenses show their category only.
// Builds the ONLY data that is ever exposed publicly. Raw entries, phone numbers and per-member totals never leave the private collections.
export function buildSummary(D) {
  const p = D.cfg.pub || {};
  if (!p.on) return { on: false, at: new Date().toISOString() };
  const inc = sum("in", D.tx), exp = sum("out", D.tx), cm = p.campaigns || {};
  const campaigns = Object.entries(cm).filter(([n, v]) => v.on && D.tx.some((x) => x.ev === n)).map(([name, v]) => {
    const l = D.tx.filter((x) => x.ev === name);
    return { name, collected: sum("in", l), spent: sum("out", l), target: v.target || 0, donors: new Set(l.filter((x) => x.type === "in").map((x) => (x.party === "public" ? "p:" + x.id : x.party))).size };
  });
  const feed = p.showFeed ? [...D.tx].sort(byDate).slice(0, 20).map((x) => ({ date: x.date, type: x.type, cat: x.cat, amt: x.amt, label: x.type === "in" ? (p.showNames ? memName(D, x.party) : "Xubin") : x.cat })) : [];
  const pc = D.cfg.pay || {}, pay = pc.on && pc.public ? { min: pc.min || 1, max: pc.maxPublic || 500, manual: pc.manual || "" } : null;
  return { on: true, org: D.cfg.org, cur: D.cfg.cur, at: new Date().toISOString(), note: p.note || "", how: p.how || "", contact: p.contact || "", showBalance: !!p.showBalance, balance: p.showBalance ? inc - exp : null, income: p.showBalance ? inc : null, expense: p.showBalance ? exp : null, members: D.members.length, families: new Set(D.members.map((m) => m.family).filter(Boolean)).size, campaigns, feed, pay };
}
