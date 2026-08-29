import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../../supabaseClient";

export interface ChatUser {
    id: string;
    name: string;
    username: string;
    unreadCount?: number;
    isGroup?: boolean;
}

export interface Message {
    id: string;
    text: string;
    sender_id: string;
    receiver_id: string | null;
    group_id?: string | null;
    sender_name?: string | null;
    created_at: string;
    is_deleted?: boolean;
    isOptimistic?: boolean;
    sender?: {
        name: string;
        username: string;
    };
}

interface ChatStore {
    currentUser: ChatUser | null;
    activeChat: ChatUser | null;
    conversations: ChatUser[];
    messageCache: Record<string, Message[]>;
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
    resetStore: () => void;
}

export const useChatStore = create<ChatStore>()(
    persist(
        (set, get) => ({
            currentUser: null,
            activeChat: null,
            conversations: [],
            messageCache: {},

            setCurrentUser: (user) => {
                const prev = get().currentUser;
                if (prev?.id !== user?.id) {
                    set({
                        currentUser: user,
                        activeChat: null,
                        conversations: [],
                        messageCache: {},
                    });
                } else {
                    set({ currentUser: user });
                }
            },

            resetStore: () => {
                set({
                    currentUser: null,
                    activeChat: null,
                    conversations: [],
                    messageCache: {},
                });
            },

            setActiveChat: (user) => {
                set({ activeChat: user });
                if (user) {
                    get().clearUnread(user.id);
                    if (!get().messageCache[user.id]) {
                        get().fetchMessages(user.id);
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
                                        isGroup: user.isGroup ?? c.isGroup 
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

            createGroup: async (name: string, memberIds: string[]) => {
                const { currentUser, addConversation, setActiveChat } = get();
                if (!currentUser) return;

                // 1. Gruplar tablosuna ekle
                const { data: group, error: groupErr } = await supabase
                    .from("groups")
                    .insert([{ name, created_by: currentUser.id }])
                    .select()
                    .single();

                if (groupErr || !group) {
                    console.error("Grup oluşturulamadı:", groupErr);
                    return;
                }

                // 2. Üyeleri group_members tablosuna ekle (kendisi dahil)
                const allMembers = Array.from(new Set([currentUser.id, ...memberIds])).map((uid) => ({
                    group_id: group.id,
                    user_id: uid,
                }));

                await supabase.from("group_members").insert(allMembers);

                const groupUser: ChatUser = {
                    id: group.id,
                    name: group.name,
                    username: "@grup",
                    isGroup: true,
                };

                addConversation(groupUser, false);
                setActiveChat(groupUser);
            },

            fetchConversations: async () => {
                const { currentUser } = get();
                if (!currentUser) return;

                // --- 1. Kullanıcının Dahil Olduğu Grupları Çek ---
                const { data: groupMemberships } = await supabase
                    .from("group_members")
                    .select("group_id, groups(id, name)")
                    .eq("user_id", currentUser.id);

                const groupList: ChatUser[] = (groupMemberships || [])
                    .map((item: any) => {
                        if (!item.groups) return null;
                        return {
                            id: item.groups.id,
                            name: item.groups.name,
                            username: "@grup",
                            isGroup: true,
                        };
                    })
                    .filter(Boolean) as ChatUser[];

                // --- 2. Birebir Konuşulan Kullanıcıları Çek ---
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

                // --- 3. Tüm Listeyi Birleştir ---
                set((state) => {
                    const map = new Map<string, ChatUser>();
                    state.conversations.forEach((u) => map.set(u.id, u));
                    [...groupList, ...userList].forEach((u) => {
                        const old = map.get(u.id);
                        map.set(u.id, { ...u, unreadCount: old?.unreadCount || 0 });
                    });
                    return { conversations: Array.from(map.values()) };
                });
            },

            fetchMessages: async (targetChatId) => {
                const { currentUser, activeChat } = get();
                if (!targetChatId || !currentUser) return;

                const isGroup = activeChat?.id === targetChatId ? activeChat.isGroup : false;

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
                        messageCache: {
                            ...state.messageCache,
                            [targetChatId]: data as Message[],
                        },
                    }));
                }
            },

            addMessage: async (text: string) => {
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
                }
            },

            receiveIncomingMessage: (msg: Message) => {
                const { currentUser, activeChat, addConversation, conversations } = get();
                if (!currentUser) return;

                // 1. Grup Mesajı Geldiyse
                if (msg.group_id) {
                    const groupId = msg.group_id;
                    const isChatOpen = activeChat?.id === groupId;

                    const existingGroup = conversations.find((c) => c.id === groupId);
                    if (!existingGroup) {
                        supabase
                            .from("groups")
                            .select("id, name")
                            .eq("id", groupId)
                            .single()
                            .then(({ data }) => {
                                if (data) {
                                    addConversation({
                                        id: data.id,
                                        name: data.name,
                                        username: "@grup",
                                        isGroup: true,
                                    }, !isChatOpen);
                                }
                            });
                    } else if (!isChatOpen) {
                        addConversation(existingGroup, true);
                    }

                    set((state) => {
                        const chatMsgs = state.messageCache[groupId] || [];
                        if (chatMsgs.some((m) => m.id === msg.id)) return state;

                        return {
                            messageCache: {
                                ...state.messageCache,
                                [groupId]: [...chatMsgs, msg],
                            },
                        };
                    });
                    return;
                }

                // 2. Birebir Özel Mesaj Geldiyse
                if (msg.receiver_id === currentUser.id) {
                    const senderId = msg.sender_id;
                    const isChatOpen = activeChat?.id === senderId;

                    const existingUser = conversations.find((c) => c.id === senderId);
                    if (!existingUser) {
                        supabase
                            .from("user")
                            .select("id, name, username")
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

                        return {
                            messageCache: {
                                ...state.messageCache,
                                [senderId]: [...chatMsgs, msg],
                            },
                        };
                    });
                }
            },

            deletedMessage: async (id: string) => {
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

            handleRemoteDelete: (id: string) => {
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

            removeMessageLocally: (id: string) => {
                const { activeChat } = get();
                if (!activeChat) return;

                set((state) => ({
                    messageCache: {
                        ...state.messageCache,
                        [activeChat.id]: (state.messageCache[activeChat.id] || []).filter((m) => m.id !== id),
                    },
                }));
            },
        }),
        {
            name: "chat-storage",
            partialize: (state) => ({ 
                currentUser: state.currentUser,
                conversations: state.conversations 
            }),
        }
    )
);