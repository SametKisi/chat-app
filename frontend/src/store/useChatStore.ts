// store/useChatStore.ts
import { create } from "zustand";
import { supabase } from "../../supabaseClient";
import { sendNativeNotification } from "../utils/notification";

export interface ChatUser {
    id: string;
    name: string;
    username: string;
    image?: string | null;
    unreadCount?: number;
    isGroup?: boolean;
    created_by?: string | null;
}

export interface GroupMember {
    id: string;
    name: string;
    username: string;
    image?: string | null;
}

export interface Message {
    id: string;
    text: string;
    sender_id: string;
    receiver_id: string | null;
    group_id?: string | null;
    sender_name?: string | null;
    sender_image?: string | null;
    created_at: string;
    is_deleted?: boolean;
    isOptimistic?: boolean;
}

interface ChatStore {
    currentUser: ChatUser | null;
    activeChat: ChatUser | null;
    conversations: ChatUser[];
    messageCache: Record<string, Message[]>;
    groupMembers: Record<string, GroupMember[]>;
    setCurrentUser: (user: ChatUser | null) => void;
    setActiveChat: (user: ChatUser | null) => void;
    addConversation: (user: ChatUser, markUnread?: boolean) => void;
    clearUnread: (userId: string) => void;
    fetchConversations: () => Promise<void>;
    fetchMessages: (targetChatId?: string | null) => Promise<void>;
    addMessage: (text: string) => Promise<void>;
    receiveIncomingMessage: (msg: Message) => void;
    deletedMessage: (id: string) => Promise<void>;
    handleRemoteDelete: (id: string) => void;
    removeMessageLocally: (id: string) => void;
    createGroup: (name: string, memberIds: string[]) => Promise<void>;
    fetchGroupMembers: (groupId: string) => Promise<void>;
    deleteGroup: (groupId: string) => Promise<void>;
    leaveGroup: (groupId: string) => Promise<void>;
    handleGroupRemoved: (groupId: string) => void;
    handleMemberRemoved: (groupId: string, userId: string) => void;
    resetStore: () => void;
}

// Channel'ı modül seviyesinde tutuyoruz ki state değişse de tekrar tekrar açılmasın
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

function subscribeRealtime(get: () => ChatStore) {
    if (realtimeChannel) return; // zaten açık, tekrar açma

    realtimeChannel = supabase
        .channel("realtime-messages")
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
            { event: "DELETE", schema: "public", table: "messages" },
            (payload) => {
                get().handleRemoteDelete((payload.old as any).id);
            }
        )
        .on(
            "postgres_changes",
            { event: "DELETE", schema: "public", table: "groups" },
            (payload) => {
                const groupId = (payload.old as any).id;
                get().handleGroupRemoved(groupId);
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

function unsubscribeRealtime() {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}

export const useChatStore = create<ChatStore>((set, get) => ({
    currentUser: null,
    activeChat: null,
    conversations: [],
    messageCache: {},
    groupMembers: {},

    setCurrentUser: (user) => {
        const prev = get().currentUser;

        // Aynı kullanıcıysa sadece objeyi güncelle (ör. image değişmiş olabilir)
        if (prev?.id === user?.id) {
            set({ currentUser: user });
            return;
        }

        unsubscribeRealtime();
        set({ currentUser: user, activeChat: null, conversations: [], messageCache: {}, groupMembers: {} });

        if (user) {
            get().fetchConversations();
            subscribeRealtime(get);
        }
    },

    resetStore: () => {
        unsubscribeRealtime();
        set({ currentUser: null, activeChat: null, conversations: [], messageCache: {}, groupMembers: {} });
    },

    setActiveChat: (user) => {
        set({ activeChat: user });
        if (user) {
            get().clearUnread(user.id);
            if (!get().messageCache[user.id]) {
                get().fetchMessages(user.id);
            }
            if (user.isGroup) {
                get().fetchGroupMembers(user.id);
            }
        }
    },

    clearUnread: (userId) => {
        set((state) => ({
            conversations: state.conversations.map((c) =>
                c.id === userId ? { ...c, unreadCount: 0 } : c
            ),
        }));
    },

    addConversation: (user, markUnread = false) => {
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

    createGroup: async (name, memberIds) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const groupId = crypto.randomUUID();
        const allMemberIds = Array.from(new Set([currentUser.id, ...memberIds]));

        const { error: groupErr } = await supabase
            .from("groups")
            .insert([{ id: groupId, name, created_by: currentUser.id }]);

        if (groupErr) {
            console.error("Grup oluşturulamadı:", groupErr);
            alert("Grup oluşturulamadı: " + groupErr.message);
            return;
        }

        const memberRows = allMemberIds.map((uid) => ({ group_id: groupId, user_id: uid }));
        const { error: memErr } = await supabase.from("group_members").insert(memberRows);

        if (memErr) {
            console.error("Grup üyeleri eklenemedi:", memErr);
            alert("Grup oluştu ama üyeler eklenemedi: " + memErr.message);
        }

        const newGroupItem: ChatUser = {
            id: groupId,
            name,
            username: "@grup",
            isGroup: true,
            unreadCount: 0,
            created_by: currentUser.id,
        };

        set((state) => ({
            conversations: [newGroupItem, ...state.conversations.filter((c) => c.id !== groupId)],
            activeChat: newGroupItem,
        }));

        get().fetchGroupMembers(groupId);
    },

    fetchGroupMembers: async (groupId) => {
        const { data: memberRows, error: memErr } = await supabase
            .from("group_members")
            .select("user_id")
            .eq("group_id", groupId);

        if (memErr || !memberRows || memberRows.length === 0) {
            set((state) => ({ groupMembers: { ...state.groupMembers, [groupId]: [] } }));
            return;
        }

        const userIds = Array.from(new Set(memberRows.map((m) => m.user_id)));
        const { data: users, error: usersErr } = await supabase
            .from("user")
            .select("id, name, username, image")
            .in("id", userIds);

        if (!usersErr && users) {
            set((state) => ({
                groupMembers: { ...state.groupMembers, [groupId]: users as GroupMember[] },
            }));
        } else if (usersErr) {
            console.error("Grup üyeleri çekilemedi:", usersErr);
        }
    },

    deleteGroup: async (groupId) => {
        const { currentUser, activeChat, conversations } = get();
        if (!currentUser) return;

        const group = conversations.find((c) => c.id === groupId);
        if (!group || group.created_by !== currentUser.id) {
            alert("Bu grubu sadece grubu oluşturan kişi silebilir.");
            return;
        }

        // Önce üyeleri, sonra grubu sil
        const { error: memErr } = await supabase.from("group_members").delete().eq("group_id", groupId);
        if (memErr) {
            console.error("Grup üyeleri silinemedi:", memErr);
        }

        const { error } = await supabase.from("groups").delete().eq("id", groupId);

        if (error) {
            console.error("Grup silinemedi:", error);
            alert("Grup silinemedi: " + error.message);
            return;
        }

        set((state) => {
            const { [groupId]: _removedCache, ...restCache } = state.messageCache;
            const { [groupId]: _removedMembers, ...restMembers } = state.groupMembers;
            return {
                conversations: state.conversations.filter((c) => c.id !== groupId),
                activeChat: state.activeChat?.id === groupId ? null : state.activeChat,
                messageCache: restCache,
                groupMembers: restMembers,
            };
        });
    },

    leaveGroup: async (groupId) => {
        const { currentUser } = get();
        if (!currentUser) return;

        const { error } = await supabase
            .from("group_members")
            .delete()
            .eq("group_id", groupId)
            .eq("user_id", currentUser.id);

        if (error) {
            console.error("Gruptan ayrılamadı:", error);
            alert("Gruptan ayrılamadı: " + error.message);
            return;
        }

        set((state) => {
            const { [groupId]: _removedCache, ...restCache } = state.messageCache;
            const { [groupId]: _removedMembers, ...restMembers } = state.groupMembers;
            return {
                conversations: state.conversations.filter((c) => c.id !== groupId),
                activeChat: state.activeChat?.id === groupId ? null : state.activeChat,
                messageCache: restCache,
                groupMembers: restMembers,
            };
        });
    },

    handleGroupRemoved: (groupId) => {
        set((state) => {
            const { [groupId]: _removedCache, ...restCache } = state.messageCache;
            const { [groupId]: _removedMembers, ...restMembers } = state.groupMembers;
            return {
                conversations: state.conversations.filter((c) => c.id !== groupId),
                activeChat: state.activeChat?.id === groupId ? null : state.activeChat,
                messageCache: restCache,
                groupMembers: restMembers,
            };
        });
    },

    handleMemberRemoved: (groupId, userId) => {
        const { currentUser } = get();

        if (currentUser && userId === currentUser.id) {
            // Kendisi başka bir cihazdan gruptan ayrılmış/çıkarılmış
            set((state) => {
                const { [groupId]: _removedCache, ...restCache } = state.messageCache;
                const { [groupId]: _removedMembers, ...restMembers } = state.groupMembers;
                return {
                    conversations: state.conversations.filter((c) => c.id !== groupId),
                    activeChat: state.activeChat?.id === groupId ? null : state.activeChat,
                    messageCache: restCache,
                    groupMembers: restMembers,
                };
            });
            return;
        }

        // Başka bir üye ayrıldı, sadece üye listesinden çıkar
        set((state) => ({
            groupMembers: {
                ...state.groupMembers,
                [groupId]: (state.groupMembers[groupId] || []).filter((m) => m.id !== userId),
            },
        }));
    },

    fetchConversations: async () => {
        const { currentUser } = get();
        if (!currentUser) return;

        try {
            const { data: memberRows, error: memberErr } = await supabase
                .from("group_members")
                .select("group_id")
                .eq("user_id", currentUser.id);

            let groupList: ChatUser[] = [];
            if (!memberErr && memberRows && memberRows.length > 0) {
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
                    .select("id, name, username")
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

    fetchMessages: async (targetChatId) => {
        const { currentUser, activeChat } = get();
        if (!targetChatId || !currentUser) return;

        const isGroup = activeChat?.id === targetChatId ? Boolean(activeChat.isGroup) : false;
        let query = supabase.from("messages").select("*");

        if (isGroup) {
            query = query.eq("group_id", targetChatId);
        } else {
            query = query
                .is("group_id", null)
                .or(
                    `and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetChatId}),and(sender_id.eq.${targetChatId},receiver_id.eq.${currentUser.id})`
                );
        }

        const { data, error } = await query.order("created_at", { ascending: true });

        if (!error && data) {
            set((state) => ({
                messageCache: { ...state.messageCache, [targetChatId]: data as Message[] },
            }));
        }
    },

    addMessage: async (text) => {
        const { activeChat, currentUser, addConversation } = get();
        if (!currentUser || !activeChat) return;

        addConversation(activeChat, false);

        const isGroup = Boolean(activeChat.isGroup);
        const tempId = `temp-${Date.now()}-${Math.random()}`;

        const optimisticMsg: Message = {
            id: tempId,
            text,
            sender_id: currentUser.id,
            receiver_id: isGroup ? null : activeChat.id,
            group_id: isGroup ? activeChat.id : null,
            sender_name: currentUser.name,
            sender_image: currentUser.image || null,
            created_at: new Date().toISOString(),
            isOptimistic: true,
        };

        set((state) => ({
            messageCache: {
                ...state.messageCache,
                [activeChat.id]: [...(state.messageCache[activeChat.id] || []), optimisticMsg],
            },
        }));

        const { data, error } = await supabase
            .from("messages")
            .insert([{
                text,
                sender_id: currentUser.id,
                receiver_id: isGroup ? null : activeChat.id,
                group_id: isGroup ? activeChat.id : null,
                sender_name: currentUser.name,
                sender_image: currentUser.image || null,
            }])
            .select()
            .single();

        if (!error && data) {
            set((state) => ({
                messageCache: {
                    ...state.messageCache,
                    [activeChat.id]: (state.messageCache[activeChat.id] || []).map((m) =>
                        m.id === tempId ? (data as Message) : m
                    ),
                },
            }));

            const backendUrl = "https://messenger-backend-lido.onrender.com";

            if (!isGroup && activeChat.id) {
                fetch(`${backendUrl}/api/send-message-notification`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        receiverId: activeChat.id,
                        senderName: currentUser.name,
                        messageText: text,
                    }),
                }).catch((err) => console.error("Mail isteği hatası:", err));
            } else if (isGroup && activeChat.id) {
                fetch(`${backendUrl}/api/send-group-notification`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        groupId: activeChat.id,
                        senderId: currentUser.id,
                        senderName: currentUser.name,
                        groupName: activeChat.name,
                        messageText: text,
                    }),
                }).catch((err) => console.error("Grup mail isteği hatası:", err));
            }
        }
    },

    receiveIncomingMessage: (msg) => {
        const { currentUser, activeChat, addConversation, conversations } = get();
        if (!currentUser) return;

        if (msg.group_id) {
            const groupId = msg.group_id;
            const isChatOpen = activeChat?.id === groupId;

            sendNativeNotification(`Grup: ${msg.sender_name || "Yeni Mesaj"}`, msg.text, msg.sender_image);

            const existingGroup = conversations.find((c) => c.id === groupId);
            if (!existingGroup) {
                supabase
                    .from("groups")
                    .select("id, name, created_by")
                    .eq("id", groupId)
                    .single()
                    .then(({ data }) => {
                        if (data) {
                            addConversation(
                                { id: data.id, name: data.name, username: "@grup", isGroup: true, created_by: data.created_by },
                                !isChatOpen
                            );
                        }
                    });
            } else if (!isChatOpen) {
                addConversation(existingGroup, true);
            }

            set((state) => {
                const chatMsgs = state.messageCache[groupId] || [];
                if (chatMsgs.some((m) => m.id === msg.id)) return state;
                return { messageCache: { ...state.messageCache, [groupId]: [...chatMsgs, msg] } };
            });
            return;
        }

        if (msg.receiver_id === currentUser.id) {
            const senderId = msg.sender_id;
            const isChatOpen = activeChat?.id === senderId;

            sendNativeNotification(msg.sender_name || "Yeni Mesaj", msg.text, msg.sender_image);

            const existingUser = conversations.find((c) => c.id === senderId);
            if (!existingUser) {
                supabase
                    .from("user")
                    .select("id, name, username, image")
                    .eq("id", senderId)
                    .single()
                    .then(({ data }) => {
                        if (data) addConversation({ ...data, isGroup: false } as ChatUser, !isChatOpen);
                    });
            } else if (!isChatOpen) {
                addConversation(existingUser, true);
            }

            set((state) => {
                const chatMsgs = state.messageCache[senderId] || [];
                if (chatMsgs.some((m) => m.id === msg.id)) return state;
                return { messageCache: { ...state.messageCache, [senderId]: [...chatMsgs, msg] } };
            });
        }
    },

    deletedMessage: async (id) => {
        const { activeChat } = get();
        if (!activeChat) return;

        set((state) => ({
            messageCache: {
                ...state.messageCache,
                [activeChat.id]: (state.messageCache[activeChat.id] || []).map((m) =>
                    m.id === id ? { ...m, text: "Bu mesaj silindi", is_deleted: true } : m
                ),
            },
        }));

        await supabase.from("messages").delete().eq("id", id);
    },

    handleRemoteDelete: (id) => {
        set((state) => {
            const updatedCache: Record<string, Message[]> = {};
            Object.keys(state.messageCache).forEach((key) => {
                updatedCache[key] = state.messageCache[key].map((m) =>
                    m.id === id ? { ...m, text: "Bu mesaj silindi", is_deleted: true } : m
                );
            });
            return { messageCache: updatedCache };
        });
    },

    removeMessageLocally: (id) => {
        const { activeChat } = get();
        if (!activeChat) return;

        set((state) => ({
            messageCache: {
                ...state.messageCache,
                [activeChat.id]: (state.messageCache[activeChat.id] || []).filter((m) => m.id !== id),
            },
        }));
    },
}));