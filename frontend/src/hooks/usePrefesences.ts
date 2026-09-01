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

        return () => {
            channel.unsubscribe();
        };
    }, [userId]);
}