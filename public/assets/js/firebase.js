import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import * as A from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import * as F from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import * as FN from "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js";
import { firebaseConfig, functionsRegion, appCheckSiteKey } from "./config.js";

const app = initializeApp(firebaseConfig);
// Setup check: show a clear message instead of a page that never opens when config.js still has placeholders.
if (/^YOUR_/.test(firebaseConfig.apiKey || "")) {
  const banner = () => { const b = document.createElement("div"); b.setAttribute("role", "alert"); b.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99;padding:12px 16px;background:#7a1f1f;color:#fff;font:600 14px/1.4 system-ui,sans-serif;text-align:center"; b.textContent = "Dejinta Firebase lama dhammaystirin: ku qor furayaasha dhabta ah faylka assets/js/config.js."; document.body.append(b); };
  document.body ? banner() : addEventListener("DOMContentLoaded", banner);
}
if (appCheckSiteKey) {
  const AC = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-check.js");
  AC.initializeAppCheck(app, { provider: new AC.ReCaptchaV3Provider(appCheckSiteKey), isTokenAutoRefreshEnabled: true });
}
export const auth = A.getAuth(app);
// Offline-first (works across several open tabs): reads and writes keep working without a connection and sync later.
export const db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
// Server-side actions (payments, SMS, secrets). Payment secrets never reach the browser.
export const call = (name, data) => FN.httpsCallable(FN.getFunctions(app, functionsRegion), name, { timeout: 120000 })(data).then((r) => r.data);
export { A, F };
