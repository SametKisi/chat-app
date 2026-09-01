import { useEffect } from "react";
import { supabase } from "../../supabaseClient";

export function usePresence(userId?: string) {
    useEffect(() => {
        if (!userId) return;

        const channel = supabase.channel("online-users", {
            config: { presence: { key: userId } },
        });

        channel.subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
                await channel.track({ online_at: new Date().toISOString() });
            }
        });
        channel.subscribe(async (status) => {
            console.log('[PRESENCE] Kanal durumu:', status);
            if (status === "SUBSCRIBED") {
                await channel.track({ online_at: new Date().toISOString() });
                console.log('[PRESENCE] Track edildi, userId:', userId);
            }
        });

        return () => {
            channel.unsubscribe();
        };
    }, [userId]);
}