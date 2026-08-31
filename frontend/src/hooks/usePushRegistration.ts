import { useEffect, useRef } from "react";
import { useSession } from "../lib/authClient";
import { registerPushNotifications } from "../lib/firebase";

const BACKEND_URL = "https://messenger-backend-lido.onrender.com";

export function usePushRegistration() {
    const sessionResult = useSession() as any;
    const session = sessionResult?.data;
    const registeredFor = useRef<string | null>(null);

    useEffect(() => {
        const userId = session?.user?.id;
        if (!userId) return;

        if (registeredFor.current === userId) return;
        registeredFor.current = userId;

        registerPushNotifications(userId, BACKEND_URL).catch((err: any) => {
            console.error("Push kayıt hatası:", err);
        });
    }, [session?.user?.id]);
}