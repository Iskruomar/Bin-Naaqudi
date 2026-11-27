import { db, F } from "./firebase.js";
import { defaultCfg } from "./common.js";

export const D = { cfg: { ...defaultCfg }, members: [], tx: [], users: [], log: [], payments: [], smslog: [], contacts: {} };
const subs = [];

// Phone numbers are stored in `contacts/{memberId}` (readable by treasurer/admin only) and merged into D.members.tel here.
export function watch(cols, onChange, onError) {
  cols.forEach((c) => subs.push(F.onSnapshot(F.collection(db, c), (s) => {
    if (c === "contacts") D.contacts = Object.fromEntries(s.docs.map((d) => [d.id, d.data().tel || ""]));
    else D[c] = s.docs.map((d) => ({ id: d.id, ...d.data() }));
    D.members.forEach((m) => { m.tel = D.contacts[m.id] || ""; });
    onChange();
  }, onError)));
  subs.push(F.onSnapshot(F.doc(db, "settings", "main"), (s) => { D.cfg = { ...defaultCfg, ...(s.data() || {}) }; onChange(); }, onError));
}
export const stop = () => { subs.splice(0).forEach((u) => u()); Object.assign(D, { cfg: { ...defaultCfg }, members: [], tx: [], users: [], log: [], payments: [], smslog: [], contacts: {} }); };
export const add = (c, o) => F.addDoc(F.collection(db, c), o);
export const set = (c, id, o, merge = false) => F.setDoc(F.doc(db, c, id), o, { merge });
export const del = (c, id) => F.deleteDoc(F.doc(db, c, id));
export const logit = (P, uid, a, d) => add("log", { a, d, u: P.name, uid, t: F.serverTimestamp() }).catch(() => {});
