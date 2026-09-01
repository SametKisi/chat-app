import { createClient } from "@supabase/supabase-js";

const presenceClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const onlineUsers = new Set();

const channel = presenceClient.channel("online-users", {
    config: { presence: { key: "backend-watcher" } },
});

channel
    .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        onlineUsers.clear();
        Object.keys(state).forEach((userId) => onlineUsers.add(userId));
        console.log(`🟢 [PRESENCE] Aktif kullanıcı sayısı: ${onlineUsers.size}`);
    })
    .subscribe();

export const isUserOnline = (userId) => onlineUsers.has(userId);