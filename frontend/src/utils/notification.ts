// Bildirim izni iste
export const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
    }
};

// Bildirim gönder
export const sendNativeNotification = (title: string, body: string, icon?: string | null) => {
    if ("Notification" in window && Notification.permission === "granted") {
        // Sekme arka plandaysa veya odaklı değilse bildirim at
        if (document.hidden) {
            new Notification(title, {
                body,
                icon: icon || "/favicon.ico",
                badge: "/favicon.ico",
                silent: false,
            });
        }
    }
};