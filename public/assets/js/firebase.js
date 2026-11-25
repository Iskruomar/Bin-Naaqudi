import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import * as A from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import * as F from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
export const auth = A.getAuth(app);
// Offline-first: reads and writes keep working without a connection and sync later.
export const db = F.initializeFirestore(app, { localCache: F.persistentLocalCache() });
export { A, F };
