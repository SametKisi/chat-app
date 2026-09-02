import { supabase } from "../../supabaseClient";
import type { ChatStore, Message } from "./types";

let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

export function subscribeRealtime(
    get: () => ChatStore,
    set: (fn: (state: ChatStore) => Partial<ChatStore>) => void
) {
    if (realtimeChannel) return;

    realtimeChannel = supabase
        .channel("realtime-messages-hub")
        .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "messages" },
            (payload) => {
                const msg = payload.new as Message;
                const { currentUser, receiveIncomingMessage } = get();
                if (msg.sender_id !== currentUser?.id) {
                    receiveIncomingMessage(msg);
                }
            }
        )
        .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "messages" },
            (payload) => {
                const updated = payload.new as Message;
                set((state) => {
                    const nextCache = { ...state.messageCache };
                    Object.keys(nextCache).forEach((key) => {
                        nextCache[key] = nextCache[key].map((m) =>
                            m.id === updated.id ? { ...m, ...updated } : m
                        );
                    });
                    return { messageCache: nextCache };
                });
            }
        )
        .on(
            "postgres_changes",
            { event: "DELETE", schema: "public", table: "messages" },
            (payload) => {
                get().handleRemoteDelete((payload.old as any).id);
            }
        )
        .on(
            "postgres_changes",
            { event: "DELETE", schema: "public", table: "groups" },
            (payload) => {
                get().handleGroupRemoved((payload.old as any).id);
            }
        )
        .on(
            "postgres_changes",
            { event: "DELETE", schema: "public", table: "group_members" },
            (payload) => {
                const { group_id, user_id } = payload.old as any;
                get().handleMemberRemoved(group_id, user_id);
            }
        )
        .subscribe();
}

export function unsubscribeRealtime() {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}