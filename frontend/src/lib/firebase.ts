import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

async function getMessagingIfSupported() {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

export async function registerPushNotifications(userId: string, backendUrl: string) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) {
    console.warn("Bu tarayıcı push bildirimlerini desteklemiyor.");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("Bildirim izni verilmedi.");
    return null;
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const token = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    console.warn("FCM token alınamadı.");
    return null;
  }

  console.log("FCM TOKEN:", token); // test için, sonra silebilirsin

  await fetch(`${backendUrl}/api/push-subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, token, platform: "web" }),
  });

  return token;
}

export async function listenForegroundMessages(onMessageReceived: (title: string, body: string) => void) {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || "Yeni Mesaj";
    const body = payload.notification?.body || "";
    onMessageReceived(title, body);
  });
}