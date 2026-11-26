import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import * as A from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import * as F from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
export const auth = A.getAuth(app);
// Prefer persistent offline storage, but keep Firestore usable in browsers or
// contexts where IndexedDB persistence is unavailable (for example, private
// browsing or restricted storage environments).
let firestore;
try {
  firestore = F.initializeFirestore(app, { localCache: F.persistentLocalCache() });
} catch (error) {
  console.warn("Persistent Firestore cache unavailable; using the default cache.", error);
  firestore = F.getFirestore(app);
}
export const db = firestore;
export { A, F };
