import { initializeApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const serviceAccount = require("./firebase-admin.json");

initializeApp({
  credential: cert(serviceAccount),
});

export const messaging = getMessaging();
