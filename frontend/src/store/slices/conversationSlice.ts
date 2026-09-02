import { supabase } from "../../../supabaseClient";
import type { ChatStore, ChatUser } from "../types";

type Set = (fn: (state: ChatStore) => Partial<ChatStore>) => void;
type Get = () => ChatStore;

export function createConversationSlice(set: Set, get: Get) {
    return {
        addConversation: (user: ChatUser, markUnread = false) => {
            set((state) => {
                const existing = state.conversations.find((c) => c.id === user.id);
                if (existing) {
                    return {
                        conversations: state.conversations.map((c) =>
                            c.id === user.id
                                ? {
                                    ...c,
                                    unreadCount: markUnread ? (c.unreadCount || 0) + 1 : c.unreadCount,
                                    isGroup: user.isGroup ?? c.isGroup,
                                    created_by: user.created_by ?? c.created_by,
                                }
                                : c
                        ),
                    };
                }
                return {
                    conversations: [{ ...user, unreadCount: markUnread ? 1 : 0 }, ...state.conversations],
                };
            });
        },

        clearUnread: (userId: string) => {
            set((state) => ({
                conversations: state.conversations.map((c) =>
                    c.id === userId ? { ...c, unreadCount: 0 } : c
                ),
            }));
        },

        fetchConversations: async () => {
            const { currentUser } = get();
            if (!currentUser) return;

            try {
                const { data: memberRows } = await supabase
                    .from("group_members")
                    .select("group_id")
                    .eq("user_id", currentUser.id);

                let groupList: ChatUser[] = [];
                if (memberRows && memberRows.length > 0) {
                    const gIds = Array.from(new Set(memberRows.map((m) => m.group_id)));
                    const { data: groupsData } = await supabase
                        .from("groups")
                        .select("id, name, created_by")
                        .in("id", gIds);

                    if (groupsData) {
                        groupList = groupsData.map((g) => ({
                            id: g.id,
                            name: g.name,
                            username: "@grup",
                            isGroup: true,
                            created_by: g.created_by,
                        }));
                    }
                }

                const { data: userMsgs } = await supabase
                    .from("messages")
                    .select("sender_id, receiver_id")
                    .is("group_id", null)
                    .not("receiver_id", "is", null)
                    .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

                const otherUserIds = new Set<string>();
                (userMsgs || []).forEach((m) => {
                    if (m.sender_id && m.sender_id !== currentUser.id) otherUserIds.add(m.sender_id);
                    if (m.receiver_id && m.receiver_id !== currentUser.id) otherUserIds.add(m.receiver_id);
                });

                let userList: ChatUser[] = [];
                if (otherUserIds.size > 0) {
                    const { data: users } = await supabase
                        .from("user")
                        .select("id, name, username, image")
                        .in("id", Array.from(otherUserIds));

                    if (users) {
                        userList = users.map((u: any) => ({ ...u, isGroup: false }));
                    }
                }

                set((state) => {
                    const map = new Map<string, ChatUser>();
                    state.conversations.forEach((u) => map.set(u.id, u));
                    [...groupList, ...userList].forEach((u) => {
                        const old = map.get(u.id);
                        map.set(u.id, {
                            ...u,
                            isGroup: u.isGroup ?? old?.isGroup,
                            unreadCount: old?.unreadCount || 0,
                            created_by: u.created_by ?? old?.created_by,
                        });
                    });
                    return { conversations: Array.from(map.values()) };
                });
            } catch (err) {
                console.error("fetchConversations hatası:", err);
            }
        },
    };
}   