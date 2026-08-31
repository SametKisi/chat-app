importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyAesrA04QCRzofbUg0XEn_Pk3lAwzdPmn0",
    authDomain: "osso-1.firebaseapp.com",
    projectId: "osso-1",
    storageBucket: "osso-1.firebasestorage.app",
    messagingSenderId: "475199320400",
    appId: "1:475199320400:web:ca0de9910bbbd0a2e5bc55",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || "Yeni Mesaj";
    const body = payload.notification?.body || "";

    self.registration.showNotification(title, {
        body,
        icon: "/icon.png",
        data: { url: payload.data?.url || "/" },
    });
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/";
    event.waitUntil(
        clients.matchAll({ type: "window" }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === url && "focus" in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow(url);
        })
    );
});