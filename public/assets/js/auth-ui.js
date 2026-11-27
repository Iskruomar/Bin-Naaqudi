import { auth, A, db, F } from "./firebase.js";
import { $, ic, normPhone, phoneEmail } from "./common.js";

export const screen = (root, html, icon = "book") => { root.innerHTML = `<div class="center"><div class="card auth"><div class="logo">${ic(icon)}</div>${html}</div></div>`; };

// Members: phone number + password (no SMS code, so it is free and works on any plan).
export function authForm(root, up, title = "ISKAASHATADA BIN NAAKHUDI") {
  screen(root, `<h1>${title}</h1><form id="af" class="form">${up ? `<label>Magacaaga<input name="name" autocomplete="name" required></label>` : ""}<label>Taleefanka<input name="phone" type="tel" inputmode="tel" placeholder="61xxxxxxx" autocomplete="tel" required></label><label>Erayga sirta${up ? " (ugu yaraan 8 xaraf)" : ""}<input name="pw" type="password" minlength="${up ? 8 : 1}" autocomplete="${up ? "new-password" : "current-password"}" required></label><p class="err" id="ae" role="alert"></p><button class="btn">${up ? "Samee akoon" : "Gal"}</button></form><button class="link" data-act="sw">${up ? "Akoon ayaan leeyahay — gal" : "Akoon cusub samee"}</button>`);
}

export const signup = { busy: false };
// Creates the pending profile (retries once). Also used to repair an account whose profile was never written.
export async function saveProfile(user, name, phone, email) {
  const data = { name, phone, email, role: "pending", created: F.serverTimestamp() };
  try { await F.setDoc(F.doc(db, "users", user.uid), data); } catch { await F.setDoc(F.doc(db, "users", user.uid), data); }
}

export async function submitAuth(f, up) {
  const d = Object.fromEntries(new FormData(f)), e = $("#ae");
  e.textContent = "";
  const phone = normPhone(d.phone);
  if (!phone) { e.textContent = "Lambarka taleefanka waa khalad (tus. 61xxxxxxx)."; return; }
  const email = phoneEmail(phone);
  try {
    if (up) {
      signup.busy = true;
      const c = await A.createUserWithEmailAndPassword(auth, email, d.pw);
      await saveProfile(c.user, d.name.trim(), phone, email);
    } else await A.signInWithEmailAndPassword(auth, email, d.pw);
  } catch (x) {
    // The sign-up message is deliberately generic so it cannot be used to find out which numbers are registered.
    e.textContent = ({ "auth/invalid-credential": "Taleefanka ama erayga sirta waa khalad.", "auth/email-already-in-use": "Akoonka lama samayn karo. Haddii aad horay u diiwaangashay, gal; haddii kale la xiriir maamulaha.", "auth/weak-password": "Erayga sirta waa ugu yaraan 8 xaraf.", "auth/too-many-requests": "Isku day badan. Sug wax yar kadibna isku day mar kale.", "auth/network-request-failed": "Internetka ma shaqeynayo. Hubi xiriirka." })[x.code] || "Wax khalad ah ayaa dhacay. Isku day mar kale.";
  } finally { signup.busy = false; }
}
