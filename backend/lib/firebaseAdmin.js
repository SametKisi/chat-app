import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

export const messaging = getMessaging();