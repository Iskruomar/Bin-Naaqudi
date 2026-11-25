import { auth, A, db, F } from "./firebase.js";
import { $, ic } from "./common.js";

export const screen = (root, html, icon = "book") => { root.innerHTML = `<div class="center"><div class="card auth"><div class="logo">${ic(icon)}</div>${html}</div></div>`; };

export function authForm(root, up, title = "ISKAASHATADA BIN NAAKHUDI") {
  screen(root, `<h1>${title}</h1><form id="af" class="form">${up ? `<label>Magacaaga<input name="name" autocomplete="name" required></label>` : ""}<label>Email<input name="email" type="email" autocomplete="email" required></label><label>Erayga sirta<input name="pw" type="password" minlength="6" autocomplete="${up ? "new-password" : "current-password"}" required></label><p class="err" id="ae" role="alert"></p><button class="btn">${up ? "Samee akoon" : "Gal"}</button></form><button class="link" data-act="sw">${up ? "Akoon ayaan leeyahay — gal" : "Akoon cusub samee"}</button>`);
}

export async function submitAuth(f, up) {
  const d = Object.fromEntries(new FormData(f)), e = $("#ae");
  e.textContent = "";
  try {
    if (up) {
      const c = await A.createUserWithEmailAndPassword(auth, d.email, d.pw);
      await F.setDoc(F.doc(db, "users", c.user.uid), { name: d.name.trim(), email: d.email, role: "pending", created: F.serverTimestamp() });
    } else await A.signInWithEmailAndPassword(auth, d.email, d.pw);
  } catch (x) {
    e.textContent = ({ "auth/invalid-credential": "Email ama erayga sirta waa khalad.", "auth/email-already-in-use": "Email-kan horay ayaa loo isticmaalay.", "auth/weak-password": "Erayga sirta waa ugu yaraan 6 xaraf." })[x.code] || "Wax khalad ah ayaa dhacay. Isku day mar kale.";
  }
}
