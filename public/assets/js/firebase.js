import { initializeApp } from "https://gstatic.com";
import * as A from "https://gstatic.com";
import * as F from "https://gstatic.com";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
export const auth = A.getAuth(app);
export const db = F.getFirestore(app);
export { A, F };
