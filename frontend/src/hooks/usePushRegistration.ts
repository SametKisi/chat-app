import { useEffect, useRef } from "react";
import { useSession } from "../lib/authClient";
import { registerPushNotifications } from "../lib/firebase";

const BACKEND_URL = "https://messenger-backend-lido.onrender.com";

export function usePushRegistration() {
    const sessionResult = useSession() as any;
    const session = sessionResult?.data;
    const registeredFor = useRef<string | null>(null);

    console.log("SESSION:", session); // EKLE

    useEffect(() => {
        const userId = session?.user?.id;
        console.log("USER ID:", userId); // EKLE

        if (!userId) return;
        if (registeredFor.current === userId) return;
        registeredFor.current = userId;

        console.log("PUSH KAYDI BAŞLIYOR"); // EKLE

        registerPushNotifications(userId, BACKEND_URL)
            .then((token) => console.log("PUSH KAYIT SONUCU:", token)) // EKLE
            .catch((err) => {
                console.error("Push kayıt hatası:", err);
            });
    }, [session?.user?.id]);
}